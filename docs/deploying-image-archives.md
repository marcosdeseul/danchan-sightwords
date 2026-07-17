# Deploying Docker images to the UTM VM

## Decision

For the first production deployment, the Mac builds the application image and
transfers it to the Ubuntu VM through UTM's shared folder. The VM loads and
runs that image; it does **not** clone or pull the application repository.

This keeps the VM simple and avoids giving it a GitHub deploy key or other
repository credential. It also moves CPU- and memory-intensive image builds
off the 2-CPU, 4 GB VM and onto the Mac mini.

Later, this can be changed to a container registry such as GHCR. The Compose
configuration deliberately uses an image tag, so the switch would only change
how the VM obtains that image.

## What crosses the Mac-to-VM boundary

```text
Mac                                      Ubuntu VM
---                                      ---------
Docker build (linux/arm64)               /mnt/utm/<archive>.tar
        |                                        |
docker save -> UTM shared folder ------> docker load
                                                 |
                                      Compose starts that exact image
```

The application image contains the built frontend, Node.js server, and database
migration files. It does not contain production secrets or PostgreSQL data:

- `.env.production` stays only on the VM and holds the database password and
  session secret.
- PostgreSQL data stays in the VM's named Docker volume.
- Cloudflare's tunnel token is added later, only when publishing the service.

## Version images with Git commit hashes

Build only from a clean, committed checkout. Use the full commit hash (or a
consistent 12-character short hash) in both the image tag and archive name.
That gives every deployment an unambiguous source version and makes rollback a
matter of selecting the previous image tag.

On the Mac, from the repository root:

```bash
git status --short
git rev-parse --verify HEAD

COMMIT_SHA=$(git rev-parse --short=12 HEAD)
IMAGE_TAG="sight-words:${COMMIT_SHA}"
ARCHIVE_PATH="/Users/marco/dev/utm/sight-words-game/sight-words-${COMMIT_SHA}.tar"

./scripts/build-image-archive.sh "$IMAGE_TAG" "$ARCHIVE_PATH"
```

`git status --short` must produce no output before using the commit hash as the
version. Otherwise the image could contain code that does not match its tag.

The script builds a Linux ARM64 image explicitly. This matters because the Mac
mini and Ubuntu VM are both ARM64, while Docker images must still target the
Linux operating system used inside the VM.

## Load and deploy on the VM

Use an approved Alpacon work session that permits the required Docker commands.
The commands below will be used after the initial deployment directory and
secrets have been created in `/opt/sight-words`.

```bash
sudo docker load --input /mnt/utm/sight-words-<commit-sha>.tar

cd /opt/sight-words
sudo docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  up -d --no-build
```

Set `APP_IMAGE=sight-words:<commit-sha>` in `/opt/sight-words/.env.production`
before starting Compose. The production Compose file has `pull_policy: never`,
so it uses the image just loaded from the shared folder and never attempts to
contact a container registry.

The application runs its database migrations during startup, after PostgreSQL
passes its health check. Back up the database before deploying a version that
introduces a new migration.

## Verify and roll back

Verify the loaded image and services:

```bash
sudo docker image inspect sight-words:<commit-sha>
sudo docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  ps
```

For rollback, load the previous archive, set `APP_IMAGE` back to the previous
commit hash, and run the same `docker compose ... up -d --no-build` command.
The PostgreSQL volume is not replaced during either deploy or rollback.

Keep at least the currently running archive and the immediately previous known-
good archive on the Mac until a container registry is introduced.
