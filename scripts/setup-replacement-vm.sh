#!/usr/bin/env bash
set -Eeuo pipefail

readonly DEPLOY_DIR=/opt/sight-words
readonly ENV_FILE=${DEPLOY_DIR}/.env.production
readonly DEPLOY_COMPOSE_FILE=${DEPLOY_DIR}/compose.production.yaml
readonly SHARED_MOUNT=/mnt/utm
readonly SHARED_TAG=share

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd -- "${SCRIPT_DIR}/.." && pwd)
BACKUP_ASSET_DIR=${REPO_ROOT}/ops/backup

COMMAND=help
DRY_RUN=false
CONFIRM_FRESH_HOST=false
CONFIRM_RESTORE=false
SKIP_ALPAMON=false
APP_IMAGE=
IMAGE_ARCHIVE=
IMAGE_SHA256=
IMAGE_SHA256_FILE=
DATABASE_BACKUP=
COMPOSE_SOURCE=${REPO_ROOT}/compose.production.yaml
PUBLIC_URL=https://words.marcokwak.com
HOST_NAME=sight-words-vm

usage() {
  cat <<'EOF'
Usage:
  setup-replacement-vm.sh host --confirm-fresh-host [--hostname <name>] \
    [--skip-alpamon] [--dry-run]

  setup-replacement-vm.sh deploy \
    --app-image sight-words:<git-commit> \
    --image-archive /mnt/utm/<archive>.tar \
    (--image-sha256 <sha256> | --image-sha256-file /mnt/utm/<file>) \
    --database-backup /mnt/utm/<backup>.dump \
    --confirm-restore [--compose-file <path>] [--dry-run]

  setup-replacement-vm.sh tunnel [--dry-run]
  setup-replacement-vm.sh verify [--public-url <https-url>]

Stages:
  host     Prepare a fresh Ubuntu ARM64 guest, mount the UTM share, install
           Docker from Docker's official repository, and install Alpamon
           without registering it.
  deploy   Load one verified application archive, create VM-only secrets,
           restore one explicitly selected PostgreSQL backup, start the private
           app, and install/test the backup timer.
  tunnel   Persist a token supplied only through the
           CLOUDFLARE_TUNNEL_TOKEN environment variable and start Cloudflared.
  verify   Read-only checks for the mount, timer, containers, data, and public
           HTTPS endpoints.

The script does not create the UTM VM, install Ubuntu, create registration
tokens, commission Alpamon, or create Cloudflare DNS routes.
EOF
}

log() {
  printf '[replacement-setup] %s\n' "$*"
}

die() {
  printf '[replacement-setup] ERROR: %s\n' "$*" >&2
  exit 1
}

require_option_value() {
  local option=$1
  local value=${2-}
  [[ -n ${value} ]] || die "${option} requires a value"
}

require_root() {
  [[ ${EUID} -eq 0 ]] || die "run this stage with sudo"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

assert_supported_guest() {
  local architecture

  [[ -r /etc/os-release ]] || die "/etc/os-release is unavailable"
  # shellcheck disable=SC1091
  . /etc/os-release
  [[ ${ID:-} == ubuntu ]] || die "this script supports Ubuntu only"
  [[ ${VERSION_ID:-} == 24.04 || ${VERSION_ID:-} == 26.04 ]] ||
    die "supported Ubuntu releases are 24.04 and 26.04"

  architecture=$(dpkg --print-architecture)
  [[ ${architecture} == arm64 ]] ||
    die "expected Ubuntu arm64, found ${architecture}"
}

print_host_dry_run() {
  cat <<'EOF'
[replacement-setup] DRY RUN: host stage would:
  - verify Ubuntu 24.04/26.04 ARM64 and root access
  - set hostname sight-words-vm and timezone Asia/Seoul
  - update installed Ubuntu packages
  - install qemu-guest-agent and diagnostic tools
  - persist the UTM 9p share at /mnt/utm
  - configure Docker's official apt repository
  - install and enable Docker Engine and the Compose plugin
  - verify Docker with hello-world without granting docker-group access
  - install and enable Alpamon and alpamon-pam without registering the host
EOF
}

configure_shared_mount() {
  local fstab_line

  install -d -m 0755 "${SHARED_MOUNT}"

  if awk -v mountpoint="${SHARED_MOUNT}" '
      $1 !~ /^#/ && $2 == mountpoint { found = 1 }
      END { exit(found ? 0 : 1) }
    ' /etc/fstab; then
    if ! awk -v mountpoint="${SHARED_MOUNT}" -v source="${SHARED_TAG}" '
        $1 !~ /^#/ && $1 == source && $2 == mountpoint && $3 == "9p" {
          found = 1
        }
        END { exit(found ? 0 : 1) }
      ' /etc/fstab; then
      die "${SHARED_MOUNT} already has a different /etc/fstab entry"
    fi
  else
    fstab_line="${SHARED_TAG} ${SHARED_MOUNT} 9p trans=virtio,version=9p2000.L,rw,_netdev,nofail,x-systemd.automount 0 0"
    printf '%s\n' "${fstab_line}" >>/etc/fstab
  fi

  systemctl daemon-reload
  if findmnt -rn -S "${SHARED_TAG}" -T "${SHARED_MOUNT}" >/dev/null 2>&1; then
    log "UTM shared directory is already mounted"
  else
    mount "${SHARED_MOUNT}"
  fi
  findmnt -rn -S "${SHARED_TAG}" -T "${SHARED_MOUNT}" >/dev/null ||
    die "UTM shared directory did not mount"
}

install_docker() {
  local architecture codename sources_file
  local -a conflicting_packages installed_conflicts

  conflicting_packages=(
    docker.io
    docker-compose
    docker-compose-v2
    docker-doc
    podman-docker
    containerd
    runc
  )
  installed_conflicts=()

  for package in "${conflicting_packages[@]}"; do
    if dpkg-query -W -f='${db:Status-Status}\n' "${package}" 2>/dev/null |
      grep -qx installed; then
      installed_conflicts+=("${package}")
    fi
  done

  if ((${#installed_conflicts[@]} > 0)); then
    apt-get remove -y "${installed_conflicts[@]}"
  fi

  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  # shellcheck disable=SC1091
  . /etc/os-release
  codename=${UBUNTU_CODENAME:-${VERSION_CODENAME}}
  architecture=$(dpkg --print-architecture)
  sources_file=$(mktemp)

  {
    printf '%s\n' 'Types: deb'
    printf '%s\n' 'URIs: https://download.docker.com/linux/ubuntu'
    printf 'Suites: %s\n' "${codename}"
    printf '%s\n' 'Components: stable'
    printf 'Architectures: %s\n' "${architecture}"
    printf '%s\n' 'Signed-By: /etc/apt/keyrings/docker.asc'
  } >"${sources_file}"

  install -m 0644 "${sources_file}" /etc/apt/sources.list.d/docker.sources
  rm -f "${sources_file}"

  apt-get update
  apt-get install -y \
    containerd.io \
    docker-buildx-plugin \
    docker-ce \
    docker-ce-cli \
    docker-compose-plugin

  systemctl enable --now docker
  docker compose version
  docker run --rm hello-world
}

install_alpamon() {
  local installer

  if ${SKIP_ALPAMON}; then
    log "skipping Alpamon installation by request"
    return
  fi

  installer=$(mktemp)
  curl -fsSL \
    'https://packagecloud.io/install/repositories/alpacax/alpamon/script.deb.sh?any=true' \
    -o "${installer}"

  if ! bash "${installer}"; then
    rm -f "${installer}"
    die "Alpamon repository installer failed"
  fi
  rm -f "${installer}"

  apt-get install -y alpamon alpamon-pam
  systemctl enable alpamon

  log "Alpamon is installed but intentionally not registered"
  log "create a fresh registration token, register this VM, then commission it"
}

host_stage() {
  if ${DRY_RUN}; then
    print_host_dry_run
    return
  fi

  require_root
  ${CONFIRM_FRESH_HOST} ||
    die "host provisioning requires --confirm-fresh-host"
  [[ ${HOST_NAME} =~ ^[A-Za-z0-9][A-Za-z0-9.-]{0,62}$ ]] ||
    die "hostname contains unsupported characters"
  assert_supported_guest
  hostnamectl set-hostname "${HOST_NAME}"
  timedatectl set-timezone Asia/Seoul

  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get upgrade -y
  apt-get install -y \
    ca-certificates \
    curl \
    dnsutils \
    file \
    git \
    gnupg \
    iproute2 \
    jq \
    lsof \
    openssl \
    qemu-guest-agent

  systemctl enable --now qemu-guest-agent
  configure_shared_mount
  install_docker
  install_alpamon

  log "host foundation is ready"
  log "reboot if /var/run/reboot-required exists"
}

compose() {
  docker compose \
    --project-directory "${DEPLOY_DIR}" \
    --env-file "${ENV_FILE}" \
    -f "${DEPLOY_COMPOSE_FILE}" \
    "$@"
}

wait_for_healthy_service() {
  local service=$1
  local deadline container_id health

  deadline=$((SECONDS + 180))
  while ((SECONDS < deadline)); do
    container_id=$(compose ps -q "${service}")
    if [[ -n ${container_id} ]]; then
      health=$(
        docker inspect \
          --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
          "${container_id}"
      )
      if [[ ${health} == healthy || ${health} == running ]]; then
        return
      fi
      if [[ ${health} == unhealthy || ${health} == exited || ${health} == dead ]]; then
        compose logs --tail 100 "${service}" >&2
        die "${service} entered state ${health}"
      fi
    fi
    sleep 2
  done

  compose logs --tail 100 "${service}" >&2
  die "timed out waiting for ${service}"
}

assert_shared_file() {
  local label=$1
  local path=$2
  local resolved

  [[ -f ${path} ]] || die "${label} not found: ${path}"
  resolved=$(realpath -e "${path}")
  case ${resolved} in
    "${SHARED_MOUNT}"/*) ;;
    *) die "${label} must be below ${SHARED_MOUNT}: ${resolved}" ;;
  esac
}

resolve_image_checksum() {
  local checksum_file

  if [[ -n ${IMAGE_SHA256_FILE} ]]; then
    assert_shared_file "image checksum file" "${IMAGE_SHA256_FILE}"
    checksum_file=$(realpath -e "${IMAGE_SHA256_FILE}")
    read -r IMAGE_SHA256 _ <"${checksum_file}"
  fi

  IMAGE_SHA256=${IMAGE_SHA256,,}
  [[ ${IMAGE_SHA256} =~ ^[0-9a-f]{64}$ ]] ||
    die "image SHA-256 must contain exactly 64 hexadecimal characters"
}

write_initial_environment() {
  local environment_tmp postgres_password session_secret

  if [[ -e ${ENV_FILE} ]]; then
    grep -Fqx "APP_IMAGE=${APP_IMAGE}" "${ENV_FILE}" ||
      die "existing ${ENV_FILE} uses a different APP_IMAGE"
    log "preserving the existing production environment"
    return
  fi

  postgres_password=$(openssl rand -hex 32)
  session_secret=$(openssl rand -hex 64)
  environment_tmp=$(mktemp "${DEPLOY_DIR}/.env.production.XXXXXX")
  chmod 0600 "${environment_tmp}"
  chown root:root "${environment_tmp}"

  {
    printf '%s\n' 'POSTGRES_DB=sight_words'
    printf '%s\n' 'POSTGRES_USER=sight_words'
    printf 'POSTGRES_PASSWORD=%s\n' "${postgres_password}"
    printf 'SESSION_SECRET=%s\n' "${session_secret}"
    printf 'APP_IMAGE=%s\n' "${APP_IMAGE}"
    printf '%s\n' 'CLOUDFLARED_IMAGE=cloudflare/cloudflared:latest'
    printf '%s\n' 'CLOUDFLARE_TUNNEL_TOKEN='
  } >"${environment_tmp}"

  mv "${environment_tmp}" "${ENV_FILE}"
  unset postgres_password session_secret
  log "generated new VM-only PostgreSQL and session secrets"
}

install_backup_units() {
  local required_asset

  for required_asset in \
    sight-words-backup \
    sight-words-backup.service \
    sight-words-backup.timer; do
    [[ -f ${BACKUP_ASSET_DIR}/${required_asset} ]] ||
      die "missing backup asset: ${BACKUP_ASSET_DIR}/${required_asset}"
  done

  install -m 0750 \
    "${BACKUP_ASSET_DIR}/sight-words-backup" \
    /usr/local/sbin/sight-words-backup
  install -m 0644 \
    "${BACKUP_ASSET_DIR}/sight-words-backup.service" \
    /etc/systemd/system/sight-words-backup.service
  install -m 0644 \
    "${BACKUP_ASSET_DIR}/sight-words-backup.timer" \
    /etc/systemd/system/sight-words-backup.timer

  systemctl daemon-reload
  systemctl enable --now sight-words-backup.timer
  systemctl start sight-words-backup.service
  systemctl is-active --quiet sight-words-backup.timer

  find "${SHARED_MOUNT}/sight-words-backups" \
    -maxdepth 1 \
    -type f \
    -name 'sight-words-postgres-*.dump' \
    -print \
    -quit |
    grep -q . || die "manual backup did not publish a completed archive"
}

print_deploy_dry_run() {
  cat <<EOF
[replacement-setup] DRY RUN: deploy stage would:
  - verify ${IMAGE_ARCHIVE} against the supplied SHA-256
  - require the image tag ${APP_IMAGE} to be a clean Git commit tag
  - validate the selected custom-format backup ${DATABASE_BACKUP}
  - install the production Compose file under ${DEPLOY_DIR}
  - generate new VM-only database and session secrets if absent
  - load the Linux ARM64 image without building source on the VM
  - start PostgreSQL, explicitly restore the selected backup, and clear sessions
  - start and health-check the private application
  - install, enable, and manually test the version-controlled backup timer
  - leave Cloudflared stopped until the separate tunnel stage
EOF
}

deploy_stage() {
  local actual_sha architecture restore_path counts

  [[ -n ${APP_IMAGE} ]] || die "deploy requires --app-image"
  [[ -n ${IMAGE_ARCHIVE} ]] || die "deploy requires --image-archive"
  [[ -n ${DATABASE_BACKUP} ]] || die "deploy requires --database-backup"
  [[ -n ${IMAGE_SHA256} || -n ${IMAGE_SHA256_FILE} ]] ||
    die "deploy requires --image-sha256 or --image-sha256-file"
  [[ -z ${IMAGE_SHA256} || -z ${IMAGE_SHA256_FILE} ]] ||
    die "use only one image checksum option"
  [[ ${APP_IMAGE} =~ ^sight-words:[0-9a-f]{7,40}$ ]] ||
    die "APP_IMAGE must be sight-words:<7-to-40-character Git commit>"

  if ${DRY_RUN}; then
    print_deploy_dry_run
    return
  fi

  require_root
  ${CONFIRM_RESTORE} ||
    die "database recovery requires --confirm-restore"
  assert_supported_guest
  findmnt -rn -S "${SHARED_TAG}" -T "${SHARED_MOUNT}" >/dev/null ||
    die "UTM shared directory is not mounted"
  assert_shared_file "image archive" "${IMAGE_ARCHIVE}"
  assert_shared_file "database backup" "${DATABASE_BACKUP}"
  [[ -f ${COMPOSE_SOURCE} ]] ||
    die "Compose source not found: ${COMPOSE_SOURCE}"
  resolve_image_checksum

  actual_sha=$(sha256sum "${IMAGE_ARCHIVE}" | awk '{print $1}')
  [[ ${actual_sha} == "${IMAGE_SHA256}" ]] ||
    die "image archive SHA-256 does not match"

  install -d -m 0755 "${DEPLOY_DIR}"
  install -m 0644 "${COMPOSE_SOURCE}" "${DEPLOY_COMPOSE_FILE}"
  write_initial_environment

  docker load --input "${IMAGE_ARCHIVE}"
  docker image inspect "${APP_IMAGE}" >/dev/null
  architecture=$(
    docker image inspect --format '{{.Architecture}}' "${APP_IMAGE}"
  )
  [[ ${architecture} == arm64 ]] ||
    die "loaded application image is ${architecture}, not arm64"

  compose config --quiet
  compose up -d postgres
  wait_for_healthy_service postgres

  restore_path=/tmp/sight-words.dump
  compose exec -T postgres rm -f "${restore_path}"
  compose cp "${DATABASE_BACKUP}" "postgres:${restore_path}"
  compose exec -T postgres pg_restore --list "${restore_path}" >/dev/null
  compose exec -T postgres \
    pg_restore \
      --clean \
      --if-exists \
      --no-owner \
      --no-acl \
      -U sight_words \
      -d sight_words \
      "${restore_path}"
  compose exec -T postgres \
    psql -U sight_words -d sight_words -v ON_ERROR_STOP=1 \
      -c 'TRUNCATE TABLE sessions;'
  compose exec -T postgres rm -f "${restore_path}"

  counts=$(
    compose exec -T postgres \
      psql -U sight_words -d sight_words -Atc \
        'SELECT (SELECT count(*) FROM users),(SELECT count(*) FROM user_progress),(SELECT count(*) FROM schema_migrations),(SELECT count(*) FROM sessions);'
  )
  log "restored counts (users|progress|migrations|sessions): ${counts}"

  compose up -d --no-build app
  wait_for_healthy_service app
  compose exec -T app wget -qO- http://127.0.0.1:4173/api/health
  printf '\n'

  install_backup_units
  log "private application and backup timer are ready"
  log "install the Cloudflare token through a short user Work Session next"
}

persist_tunnel_token() {
  local line token environment_tmp found

  token=${CLOUDFLARE_TUNNEL_TOKEN}
  [[ -n ${token} ]] || die "CLOUDFLARE_TUNNEL_TOKEN is empty"
  [[ ${token} != *$'\n'* && ${token} != *$'\r'* ]] ||
    die "CLOUDFLARE_TUNNEL_TOKEN contains a newline"
  environment_tmp=$(mktemp "${DEPLOY_DIR}/.env.production.XXXXXX")
  chmod 0600 "${environment_tmp}"
  chown root:root "${environment_tmp}"
  found=false

  while IFS= read -r line || [[ -n ${line} ]]; do
    case ${line} in
      CLOUDFLARE_TUNNEL_TOKEN=*)
        printf 'CLOUDFLARE_TUNNEL_TOKEN=%s\n' "${token}" >>"${environment_tmp}"
        found=true
        ;;
      *)
        printf '%s\n' "${line}" >>"${environment_tmp}"
        ;;
    esac
  done <"${ENV_FILE}"

  if ! ${found}; then
    printf 'CLOUDFLARE_TUNNEL_TOKEN=%s\n' "${token}" >>"${environment_tmp}"
  fi

  mv "${environment_tmp}" "${ENV_FILE}"
  unset token CLOUDFLARE_TUNNEL_TOKEN
}

tunnel_stage() {
  if ${DRY_RUN}; then
    cat <<'EOF'
[replacement-setup] DRY RUN: tunnel stage would:
  - optionally persist CLOUDFLARE_TUNNEL_TOKEN from the process environment
  - refuse to start if no protected token exists
  - start the existing Cloudflare connector with the optional tunnel profile
  - leave the application and PostgreSQL without public host ports
EOF
    return
  fi

  require_root
  [[ -f ${ENV_FILE} && -f ${DEPLOY_COMPOSE_FILE} ]] ||
    die "run the deploy stage first"

  if [[ -n ${CLOUDFLARE_TUNNEL_TOKEN:-} ]]; then
    persist_tunnel_token
  fi

  grep -Eq '^CLOUDFLARE_TUNNEL_TOKEN=.+$' "${ENV_FILE}" ||
    die "provide CLOUDFLARE_TUNNEL_TOKEN through a secure environment handoff"

  compose --profile tunnel up -d --no-build cloudflared
  compose --profile tunnel ps
  docker logs --tail 20 sight-words-cloudflared-1
  log "Cloudflared started; run the verify stage from an approved Work Session"
}

verify_stage() {
  local counts health latest_backup root_status

  require_root
  require_command curl
  [[ ${PUBLIC_URL} =~ ^https:// ]] ||
    die "--public-url must use HTTPS"

  assert_supported_guest
  findmnt -rn -S "${SHARED_TAG}" -T "${SHARED_MOUNT}"
  systemctl is-active alpamon
  systemctl is-enabled sight-words-backup.timer
  systemctl is-active sight-words-backup.timer
  compose --profile tunnel ps

  counts=$(
    compose exec -T postgres \
      psql -U sight_words -d sight_words -Atc \
        'SELECT (SELECT count(*) FROM users),(SELECT count(*) FROM user_progress),(SELECT count(*) FROM schema_migrations),(SELECT count(*) FROM sessions);'
  )
  log "database counts (users|progress|migrations|sessions): ${counts}"

  health=$(
    compose exec -T app wget -qO- http://127.0.0.1:4173/api/health
  )
  [[ ${health} == '{"ok":true}' ]] ||
    die "private health check returned: ${health}"
  printf '%s\n' "${health}"

  latest_backup=$(
    find "${SHARED_MOUNT}/sight-words-backups" \
      -maxdepth 1 \
      -type f \
      -name 'sight-words-postgres-*.dump' \
      -printf '%T@ %p\n' |
      sort -nr |
      head -n 1 |
      cut -d' ' -f2-
  )
  [[ -n ${latest_backup} ]] || die "no completed database backup found"
  compose exec -T postgres pg_restore --list <"${latest_backup}" >/dev/null
  log "validated latest backup: ${latest_backup}"

  docker logs --tail 20 sight-words-cloudflared-1
  curl -fsS --retry 5 --retry-all-errors --retry-delay 2 \
    "${PUBLIC_URL%/}/api/health"
  printf '\n'
  root_status=$(
    curl -fsS --retry 5 --retry-all-errors --retry-delay 2 \
      -o /dev/null -w '%{http_code}' "${PUBLIC_URL%/}/"
  )
  [[ ${root_status} == 200 ]] ||
    die "public root returned HTTP ${root_status}"
  log "public root returned HTTP 200"
}

parse_arguments() {
  COMMAND=${1:-help}
  if (($# > 0)); then
    shift
  fi

  while (($# > 0)); do
    case $1 in
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --confirm-fresh-host)
        CONFIRM_FRESH_HOST=true
        shift
        ;;
      --confirm-restore)
        CONFIRM_RESTORE=true
        shift
        ;;
      --skip-alpamon)
        SKIP_ALPAMON=true
        shift
        ;;
      --hostname)
        require_option_value "$1" "${2-}"
        HOST_NAME=$2
        shift 2
        ;;
      --app-image)
        require_option_value "$1" "${2-}"
        APP_IMAGE=$2
        shift 2
        ;;
      --image-archive)
        require_option_value "$1" "${2-}"
        IMAGE_ARCHIVE=$2
        shift 2
        ;;
      --image-sha256)
        require_option_value "$1" "${2-}"
        IMAGE_SHA256=$2
        shift 2
        ;;
      --image-sha256-file)
        require_option_value "$1" "${2-}"
        IMAGE_SHA256_FILE=$2
        shift 2
        ;;
      --database-backup)
        require_option_value "$1" "${2-}"
        DATABASE_BACKUP=$2
        shift 2
        ;;
      --compose-file)
        require_option_value "$1" "${2-}"
        COMPOSE_SOURCE=$2
        shift 2
        ;;
      --public-url)
        require_option_value "$1" "${2-}"
        PUBLIC_URL=$2
        shift 2
        ;;
      -h | --help)
        COMMAND=help
        shift
        ;;
      *)
        die "unknown option: $1"
        ;;
    esac
  done
}

main() {
  parse_arguments "$@"

  case ${COMMAND} in
    host) host_stage ;;
    deploy) deploy_stage ;;
    tunnel) tunnel_stage ;;
    verify) verify_stage ;;
    help | -h | --help) usage ;;
    *) die "unknown stage: ${COMMAND}" ;;
  esac
}

main "$@"
