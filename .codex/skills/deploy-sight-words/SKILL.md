---
name: deploy-sight-words
description: Build, transfer, deploy, verify, and roll back committed Sight Words application images on the ARM64 UTM production VM through an approved Alpacon Work Session. Use when asked to deploy, release, publish, update, roll back, or verify the latest application version on the Sight Words VM.
---

# Deploy Sight Words

Deploy one clean Git commit as a versioned `linux/arm64` Docker image. Build on
the Mac, transfer the archive through the UTM share, and operate the VM only
through a short, approved Alpacon Work Session.

## Read the operational sources

Before changing the VM, read these files completely and treat them as
authoritative:

- [Image archive deployment workflow](../../../docs/deploying-image-archives.md)
- [Using Alpacon](../../../docs/using-alpacon.md)
- [Operating the UTM VM](../../../docs/operating-the-utm-vm.md)

Also read the repository `AGENTS.md`. Stop if these sources conflict with this
skill and follow the more specific or newer repository instruction.

## Guardrails

- Build the application on the Mac for `linux/arm64`; never build it on the VM.
- Tag the image and archive with the clean commit's 12-character hash.
- Keep production secrets and PostgreSQL data on the VM. Never print, transfer,
  overwrite, or commit `.env.production` contents other than the `APP_IMAGE`
  line.
- Resolve the currently connected and commissioned Alpacon server at runtime.
  Do not rely on a stored server UUID, VM replacement suffix, or Linux username.
- Request only the Alpacon `command` and `sudo` scopes needed for the release.
  Bind sudo patterns to that Work Session; never create a permanent broad sudo
  policy.
- Do not reboot the VM, restore PostgreSQL, modify Cloudflare configuration, or
  change host packages during a routine release.
- Close the Work Session immediately after verification or rollback.

## 1. Prepare the commit

Run the relevant tests and production build for the change. Then verify that
the release source is committed and clean:

```bash
git status --short
git rev-parse --verify HEAD
```

Require `git status --short` to produce no output. If the requested code is
uncommitted, do not assign it a commit-hash image tag; finish or obtain approval
for the Git work first.

From the repository root, derive the artifact paths and run the existing build
helper:

```bash
commit_sha=$(git rev-parse --short=12 HEAD)
image_tag="sight-words:${commit_sha}"
archive_path="/Users/marco/dev/utm/sight-words-game/sight-words-${commit_sha}.tar"

./scripts/build-image-archive.sh "$image_tag" "$archive_path"
```

Confirm that the image is `linux/arm64`, the archive and `.sha256` sidecar
exist, and the archive contains the expected image. Make the two non-secret
artifact files readable through the shared mount if its ownership mapping
requires it; do not broaden permissions on secret or backup files.

## 2. Request a deployment Work Session

Resolve the intended server in Alpacon and create a short session whose purpose
names the commit and these actions:

1. Verify the archive checksum.
2. Load the image.
3. Read and update only `APP_IMAGE`.
4. Recreate the Compose application without building or pulling.
5. Verify private and public health.

Request `command` and `sudo`. Pre-authorize only the necessary session-bound
patterns, normally `docker *`, `sed -n *`, and `sed -i *`. Wait for human
approval and confirm the session is active before running a VM command. Use the
account assigned by the approved session.

## 3. Verify and load the archive

On the VM, set `commit_sha` to the verified Mac value. Each Alpacon execute call
starts a fresh shell, so set it again in every command block that uses it.
Validate the value, then compare the sidecar checksum with a fresh digest before
loading the archive. Abort on an invalid hash or checksum mismatch.

```bash
commit_sha='<verified 12-character hash from the Mac>'
printf '%s\n' "$commit_sha" | grep -Eq '^[0-9a-f]{12}$'
archive="/mnt/utm/sight-words-${commit_sha}.tar"

expected=$(tr -d '\n' < "${archive}.sha256")
actual=$(sha256sum "$archive" | awk '{print $1}')
test "$expected" = "$actual"
```

Load and inspect the exact tag through the active Work Session:

```bash
commit_sha='<verified 12-character hash from the Mac>'
printf '%s\n' "$commit_sha" | grep -Eq '^[0-9a-f]{12}$'
archive="/mnt/utm/sight-words-${commit_sha}.tar"

sudo docker load --input "$archive"
sudo docker image inspect "sight-words:${commit_sha}"
```

## 4. Switch the application image

Read and retain the previous tag for rollback without reading the rest of the
secret file:

```bash
sudo sed -n '/^APP_IMAGE=/p' /opt/sight-words/.env.production
```

Update only that line. With Alpacon's non-interactive command path, use `-S`
when plain sudo reports that a terminal is required. Keep the sed expression
slash-delimited; a pipe-delimited expression can be tokenized as shell
operators before matching the Work Session policy.

```bash
commit_sha='<verified 12-character hash from the Mac>'
printf '%s\n' "$commit_sha" | grep -Eq '^[0-9a-f]{12}$'

sudo -S sed -i \
  "s/^APP_IMAGE=.*/APP_IMAGE=sight-words:${commit_sha}/" \
  /opt/sight-words/.env.production

sudo sed -n '/^APP_IMAGE=/p' /opt/sight-words/.env.production
```

If the edit reports `SUDO_NO_WORKSESSION_POLICY`, amend the active session with
the exact `sed -i *` pattern through `alpacon work-session update`; do not route
the write through Docker or create a permanent policy.

Start the existing production definition without building or pulling:

```bash
sudo -S docker compose \
  --project-directory /opt/sight-words \
  --env-file /opt/sight-words/.env.production \
  -f /opt/sight-words/compose.production.yaml \
  --profile tunnel \
  up -d --no-build
```

## 5. Verify the release

Require all checks to pass:

```bash
sudo docker inspect \
  --format 'APP_IMAGE={{.Config.Image}} HEALTH={{.State.Health.Status}}' \
  sight-words-app-1

sudo docker compose \
  --project-directory /opt/sight-words \
  --env-file /opt/sight-words/.env.production \
  -f /opt/sight-words/compose.production.yaml \
  --profile tunnel \
  ps

sudo docker exec sight-words-app-1 \
  wget -qO- http://127.0.0.1:4173/api/health
```

Confirm that the app container uses the new commit tag, the application and
PostgreSQL are healthy, Cloudflared is running, and private health returns
`{"ok":true}`. Then verify the same response from
`https://words.marcokwak.com/api/health` outside the VM.

Do not query or expose application users unless the user requests it. For a
requested signup check, run a read-only query and report only the minimum useful
fields; never return password hashes, session secrets, or email addresses.

## 6. Roll back on failure

If the new application fails health checks, inspect only the relevant container
status and logs. If a safe immediate fix is unavailable, restore the captured
previous `APP_IMAGE` tag and run the same Compose command. Verify private and
public health again. Do not replace the PostgreSQL volume during an application
rollback.

## 7. Close and report

Close the Alpacon Work Session only after the new release or rollback is
verified. Confirm that its session-bound sudo policies expired.

Report:

- deployed or restored commit tag;
- archive checksum verification;
- application, PostgreSQL, and tunnel status;
- private and public health results;
- rollback, if performed;
- Work Session closure.

Keep the running archive and the immediately previous known-good archive on the
Mac for rollback.
