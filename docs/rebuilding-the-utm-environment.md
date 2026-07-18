# Rebuilding the UTM environment

## Purpose

Use this runbook when `sight-words-vm` must be reconstructed from a new Ubuntu
guest rather than updated in place. It records the recovery order and the
failure modes encountered during the July 2026 rebuild.

A rebuild has three separate jobs:

1. reconstruct a manageable Ubuntu and Docker host;
2. restore application code and durable PostgreSQL data;
3. re-establish public and operational services without exposing secrets or
   host ports.

Do not treat a running container as proof of recovery. The database contents,
health endpoints, backup path, remote-management connection, and restart
behavior all need independent verification.

## Recovery inputs on the Mac

The VM is disposable only if these inputs exist outside its virtual disk:

```text
/Users/marco/dev/utm/sight-words-game/
├── compose.production.yaml
├── sight-words-recovery/
│   ├── compose.production.yaml
│   ├── scripts/
│   │   └── setup-replacement-vm.sh
│   └── ops/
│       └── backup/
│           ├── sight-words-backup
│           ├── sight-words-backup.service
│           └── sight-words-backup.timer
├── sight-words-<git-commit>.tar
├── sight-words-<git-commit>.tar.sha256
├── sight-words-postgres-<timestamp>.dump
└── sight-words-backups/
    └── sight-words-postgres-<timestamp>.dump
```

Before changing the replacement guest, identify and record:

- the application image tag and its clean Git commit;
- the SHA-256 checksum of the image archive;
- the newest successful PostgreSQL custom-format archive;
- a successful `pg_restore --list` validation for that archive;
- the production Compose file that expects the selected image tag;
- the expected database tables, migration names, and approximate record counts.

The Cloudflare connector token, PostgreSQL password, and session secret are not
recovery artifacts. Obtain or generate them during the rebuild and keep them
only in the protected VM environment file. The existing Cloudflare tunnel and
DNS route can survive loss of the connector VM.

The UTM `.utm` bundle contains the guest disk and can be protected separately
with a Mac backup product, but it is not a substitute for a validated database
archive. A broken or missing bundle should not be the only copy of user data.

## Version-controlled replacement setup

[`setup-replacement-vm.sh`](../scripts/setup-replacement-vm.sh) automates the
repeatable work after Ubuntu has been installed. It is deliberately staged:

- `host` installs updates, diagnostics, `qemu-guest-agent`, the persistent UTM
  share, Docker Engine, Compose, and unregistered Alpamon packages.
- `deploy` verifies one ARM64 image archive by SHA-256, generates fresh VM-only
  secrets, restores one explicitly selected database archive, starts the
  private app, and installs and tests the backup timer.
- `tunnel` accepts the Cloudflare connector token only from a securely
  forwarded environment variable and starts the optional tunnel profile.
- `verify` performs read-only recovery checks.

The script cannot create a UTM VM, install Ubuntu, generate external
registration tokens, commission Alpamon, or create a Cloudflare DNS route.
Those remain explicit trust-boundary steps. The `host` stage requires
`--confirm-fresh-host`, while the destructive database operation requires
`--confirm-restore` and an archive checksum.

Before a failure, refresh the recovery bundle on the Mac from a clean checkout:

```bash
RECOVERY_DIR=/Users/marco/dev/utm/sight-words-game/sight-words-recovery

mkdir -p "${RECOVERY_DIR}"
rsync -a --delete \
  --relative \
  compose.production.yaml \
  scripts/setup-replacement-vm.sh \
  ops/backup/sight-words-backup \
  ops/backup/sight-words-backup.service \
  ops/backup/sight-words-backup.timer \
  "${RECOVERY_DIR}/"
```

`build-image-archive.sh` creates the `.sha256` sidecar next to every archive.
Keep both files in the shared directory.

After installing Ubuntu and enabling the Mac shared directory in UTM, the only
initial console bootstrap is a temporary mount:

```bash
sudo mkdir -p /mnt/utm
sudo mount -t 9p \
  -o trans=virtio,version=9p2000.L \
  share /mnt/utm

cd /mnt/utm/sight-words-recovery
./scripts/setup-replacement-vm.sh host --dry-run
sudo ./scripts/setup-replacement-vm.sh \
  host \
  --confirm-fresh-host
```

Create a fresh Alpamon registration token, register the replacement host, and
commission it before continuing. Run the remaining stages only through short,
approved Alpacon Work Sessions. The database restore command is:

```bash
cd /mnt/utm/sight-words-recovery
sudo ./scripts/setup-replacement-vm.sh deploy \
  --app-image sight-words:<git-commit> \
  --image-archive /mnt/utm/sight-words-<git-commit>.tar \
  --image-sha256-file /mnt/utm/sight-words-<git-commit>.tar.sha256 \
  --database-backup /mnt/utm/sight-words-backups/<validated-backup>.dump \
  --confirm-restore
```

Use the secure `alpacon exec --env` handoff in
[Using Alpacon](using-alpacon.md#local-cli-connection) to expose
`CLOUDFLARE_TUNNEL_TOKEN` to the `tunnel` stage without placing its value in
the command or audit log. Then run `verify` and close every Work Session:

```bash
sudo -E \
  /mnt/utm/sight-words-recovery/scripts/setup-replacement-vm.sh tunnel
sudo \
  /mnt/utm/sight-words-recovery/scripts/setup-replacement-vm.sh verify
```

## Target architecture

Recreate the same boundaries unless a deliberate architecture change has been
approved:

```text
Mac mini ARM64
└── UTM: sight-words-vm
    └── Ubuntu Server ARM64
        ├── qemu-guest-agent
        ├── Alpamon as a native systemd service
        ├── Docker Engine and Compose plugin
        │   ├── PostgreSQL on the private network
        │   ├── application on the private network
        │   └── Cloudflared on private + outbound networks
        └── systemd PostgreSQL backup timer
```

The rebuilt environment uses 2 CPUs, 4 GB RAM, and a 64 GiB virtual disk. It
does not require SSH, Redis, workers, a public application port, or a public
PostgreSQL port.

## Recovery order

### 1. Build the guest management foundation

Install Ubuntu Server ARM64, then establish these host capabilities before
attempting the application restore:

- working DHCP and outbound internet access;
- `qemu-guest-agent`, enabled and active;
- the Mac shared directory mounted read-write at `/mnt/utm` through `/etc/fstab`;
- system updates and basic diagnostic tools;
- Docker Engine and the Docker Compose plugin from Docker's official Ubuntu
  repository;
- Docker enabled at boot, with administration remaining behind `sudo`.

Verify the CPU architecture with `uname -m`; it must report `aarch64`. Run
Docker's `hello-world` image before introducing application state.

`qemu-guest-agent` is the emergency bridge that lets `utmctl exec` inspect or
restart Alpamon when the normal management path is unavailable. Return to
Alpacon as soon as the agent is commissioned; UTM guest commands run as root
outside the Alpacon audit boundary.

### 2. Install and commission Alpamon early

Install Alpamon natively and register the replacement VM with a fresh
registration token. Do not store the token in this repository or this runbook.

There are two distinct success states:

- `is_connected`: Alpamon has an active control connection;
- `commissioned`: the server is authorized for managed operations.

The dashboard can misleadingly report that the agent is not installed while
the package and `alpamon.service` are healthy but commissioning is incomplete.
If that happens:

1. confirm `alpamon.service` is enabled and active;
2. inspect its recent journal for a successful control connection;
3. confirm the new server belongs to an allowed server group;
4. restart Alpamon once after the group assignment;
5. verify both connected and commissioned states.

Do not begin the Docker restore until commands can run through a short approved
Work Session.

### 3. Select the correct Alpacon session type

Use an MCP-created agent Work Session for non-interactive commands driven by
Codex. Restrict its server, lifetime, scopes, and sudo command patterns to the
recovery task.

An agent session cannot be attached by the human Alpacon CLI. If a human must
provide a credential, create a separate CLI user Work Session. Pass the secret
from a silent shell variable using `alpacon exec --env="VARIABLE"`; never put
the literal value in a command, a `--env="VARIABLE=value"` flag, chat, or an
approval description. Complete both sessions and clear the CLI binding as soon
as the handoff and verification are finished.

See [Using Alpacon](using-alpacon.md) for installation, OAuth, and sudo-policy
details.

### 4. Prepare the deployment without copying secrets

Create `/opt/sight-words`, copy only `compose.production.yaml` from the shared
directory, and keep it root-owned. Generate these values inside the VM:

```text
POSTGRES_DB=sight_words
POSTGRES_USER=sight_words
POSTGRES_PASSWORD=<new random value>
SESSION_SECRET=<new random value>
APP_IMAGE=sight-words:<git-commit>
CLOUDFLARE_TUNNEL_TOKEN=
```

Write them to `/opt/sight-words/.env.production` as `root:root` with mode
`0600`. Do not weaken its ownership to make an unprivileged edit convenient.
Validate the Compose model without printing the resolved configuration, because
resolved output can contain secrets.

Load the versioned Linux ARM64 image archive from `/mnt/utm` with
`docker load`. Do not rebuild application source on the VM and do not tag dirty
source with a Git commit hash. The routine image workflow is documented in
[Deploying Docker images](deploying-image-archives.md).

### 5. Restore PostgreSQL before starting the application

Start only PostgreSQL and wait for its health check. Copy the selected custom
archive into the PostgreSQL container, then restore it:

```bash
cd /opt/sight-words
sudo docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  up -d postgres

sudo docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  cp /mnt/utm/sight-words-backups/<validated-backup>.dump \
  postgres:/tmp/sight-words.dump

sudo docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  exec -T postgres \
  pg_restore --clean --if-exists --no-owner --no-acl \
  -U sight_words -d sight_words /tmp/sight-words.dump
```

The rebuilt VM has a new session secret. Existing application sessions cannot
remain valid, so truncate the `sessions` table after restoring. Preserve users
and progress records.

Before starting the application, verify:

- PostgreSQL remains healthy;
- the expected user and progress rows exist;
- the expected schema migration rows exist;
- `sessions` contains zero old sessions;
- the temporary restore archive has been removed from the container.

Record counts are recovery evidence, not permanent invariants. The July 2026
archive contained 2 users, 2 progress records, and 2 migrations named
`001_init.sql` and `002_username_auth.sql`.

### 6. Start and verify the private application

Start the application without the tunnel profile:

```bash
sudo docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  up -d --no-build app
```

Confirm the app and PostgreSQL health checks pass and test from inside the
application container:

```text
GET http://127.0.0.1:4173/api/health -> {"ok":true}
```

The absence of a host port is intentional. At this checkpoint, the application
should be reachable only through the Docker networks.

### 7. Recreate backups before public exposure

The backup system currently lives on the VM at:

```text
/usr/local/sbin/sight-words-backup
/etc/systemd/system/sight-words-backup.service
/etc/systemd/system/sight-words-backup.timer
```

It writes custom-format archives to `/mnt/utm/sight-words-backups`, validates
each archive with `pg_restore --list`, publishes only a successful temporary
file, and retains the newest seven completed files. The timer runs daily at
03:15 Asia/Seoul with `Persistent=true`.

Run the service manually once. Confirm its successful systemd result, validate
the new archive independently, and confirm the file is visible on macOS before
relying on the timer.

The backup script and both systemd units are version-controlled under
`ops/backup/`. The `deploy` stage installs them, enables the timer, runs a
manual backup, and refuses to complete unless a validated archive appears on
the Mac share.

### 8. Reconnect the existing Cloudflare tunnel

Reuse the existing `sightwords` tunnel and `words.marcokwak.com` route. Create
a new connector; do not create a duplicate DNS route simply because the old VM
is gone.

The published application route must target:

```text
http://app:4173
```

That name resolves only inside the Compose network. Cloudflared makes outbound
connections to Cloudflare, so the app and database do not need public host
ports and the origin firewall does not need an inbound Cloudflare IP allowlist
for this tunnel-only design.

Install the connector token through a short CLI user Work Session and secure
`--env` handoff. Then start the optional Compose profile:

```bash
sudo docker compose \
  --project-directory /opt/sight-words \
  --env-file /opt/sight-words/.env.production \
  -f /opt/sight-words/compose.production.yaml \
  --profile tunnel up -d --no-build cloudflared
```

Cloudflare error 530 at the existing hostname usually means DNS still reaches
the tunnel but no valid connector is serving it. Confirm Cloudflared logs show
registered tunnel connections and the downloaded ingress configuration before
changing DNS.

### 9. Test recovery, not just startup

Verify all of the following:

| Boundary | Required evidence |
| --- | --- |
| Host management | Alpamon is connected and commissioned. |
| Shared storage | `/mnt/utm` is mounted read-write after a guest reboot. |
| Database | PostgreSQL is healthy and expected data and migrations exist. |
| Application | The private health endpoint returns `{"ok":true}`. |
| Backups | A manual backup succeeds, validates, and appears on macOS. |
| Timer | The backup timer is enabled and active after reboot. |
| Tunnel | Cloudflared registers connections and uses `unless-stopped`. |
| Public route | `/` returns HTTP 200 and `/api/health` returns `{"ok":true}`. |
| Access cleanup | User and agent Work Sessions are completed; temporary sudo policies expire. |

During the July 2026 rebuild, the completed stack passed an end-to-end recovery
drill. Ubuntu was powered off cleanly, UTM reported the VM as stopped, and the
guest was started without a console window using `utmctl start --hide`.
Alpamon reconnected, `/mnt/utm` remounted read-write, the backup timer remained
enabled and active, and PostgreSQL, the app, and Cloudflared all recovered.
The database retained 2 users, 2 progress records, and 2 migrations with 0 old
sessions; the private health endpoint returned `{"ok":true}`; Cloudflared
registered four QUIC connections with `http://app:4173`; and the public root
and health routes returned HTTP 200 and `{"ok":true}` respectively.

## Failure modes learned during the rebuild

| Symptom | Meaning and response |
| --- | --- |
| UTM shows the VM as unavailable | The registered `.utm` bundle path is missing. Recover the bundle or deliberately rebuild; removing the stale library entry does not recover its disk. |
| UTM traps the mouse | Capture Input is on. Release with Control-Option, turn Capture Input off, and use Alpacon for normal administration. |
| `utmctl start --hide` says `Operation not available` | The VM is already running. `--hide` applies at startup; use Command-H to hide the UTM app. |
| `utmctl start --hide` prints `OSStatus error -10004` | Check `utmctl status` before retrying. During the verified drill the event error was non-fatal and the VM had already reached `started`. Investigate macOS automation permissions only if the VM remains stopped. |
| Alpacon says the agent is not installed | Verify the package and service, then check commissioning and allowed-group assignment rather than reinstalling blindly. |
| The CLI cannot attach to a Work Session | MCP agent sessions are not human CLI sessions. Create a short user Work Session for interactive or secret input. |
| Editing `.env.production` gives permission denied | The root-owned mode `0600` boundary is working. Use an exact, session-scoped privileged operation; do not change ownership or expose the file. |
| The public hostname returns Cloudflare 530 | Check for a connected tunnel connector and valid token before changing the existing DNS route. |
| App and database run but Cloudflared is absent | The tunnel is behind the optional `tunnel` Compose profile; include `--profile tunnel`. |
| The image will not start on the guest | Confirm it was built for `linux/arm64` and tagged from the intended clean commit. |
| A secret appears in a command or approval record | Rotate it. Future handoffs must use silent input and `alpacon exec --env="NAME"`, never a literal value. |

## What still must be kept current

After any architecture or operational change, update this runbook together with
the setup script, backup templates, Compose file, and related operating guide.
In particular, revise:

- service names and profile names;
- image architecture and archive naming;
- database tables, migrations, and restore expectations;
- public hostname and internal Cloudflare service URL;
- backup schedule, location, validation, and retention;
- Alpacon account, session, and sudo-policy assumptions;
- macOS LaunchAgent and UTM VM names.

Never add actual passwords, connector tokens, OAuth configuration, registration
tokens, or database contents to the documentation.
