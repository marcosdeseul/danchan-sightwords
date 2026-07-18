# Operating the UTM VM

## Purpose and boundaries

`sight-words-vm` is an Ubuntu Server 26.04 ARM64 guest running under UTM on
the Mac. The Mac builds Linux ARM64 image archives; the VM runs Docker,
PostgreSQL, Cloudflared, and Alpamon.

Routine guest administration uses Alpacon and an approved, time-limited Work
Session. Do not enable SSH as a convenience path. See
[Using Alpacon](using-alpacon.md) for the session and sudo rules.

For reconstruction of a missing or unusable guest, follow the
[environment rebuild runbook](rebuilding-the-utm-environment.md). This document
covers steady-state operation after that recovery is complete.

The UTM shared directory is the intended non-secret transfer boundary:

```text
Mac: /Users/marco/dev/utm/sight-words-game
VM:  /mnt/utm
```

It is mounted persistently by `/etc/fstab` as the `share` 9p filesystem. Image
archives may cross this boundary; production secrets, the Cloudflare token, and
the PostgreSQL Docker volume must not.

## Running the VM without the console window

The UTM console is only an emergency local interface. Do not click its red
window-close button while the VM is running: UTM explicitly warns that it will
kill the VM. Use the yellow minimize button or Command-H to hide it instead.

Keep UTM's **Capture Input** toolbar toggle off. The VM can run while its
window is visible, minimized, or hidden; it does not need the Mac's mouse or
keyboard. Enabling Capture Input traps those devices in the console, which is
unnecessary once Alpacon is available. If it is ever enabled accidentally,
release the cursor with Control-Option, then turn the toolbar toggle off.

Do not quit UTM or use the console power control for ordinary maintenance.
Request a guest reboot through an approved Alpacon Work Session, then verify
Alpamon reconnects and the public health endpoint returns successfully.

## Start automatically at macOS login

The per-user LaunchAgent is:

```text
/Users/marco/Library/LaunchAgents/com.marco.sightwords-vm.plist
```

At login it runs UTM's headless CLI form:

```bash
/Applications/UTM.app/Contents/MacOS/utmctl start --hide sight-words-vm
```

`--hide` starts the VM without opening UTM's main window. It only applies while
starting a stopped VM; calling `start --hide` again for a running VM returns
`Operation not available`. If UTM is already showing the console, use
Command-H to hide the UTM app. Do not close the console window.

For a deliberate headless recovery drill, first request a clean guest shutdown
through an approved Alpacon Work Session. Wait until `utmctl status` reports
`stopped`, run `utmctl start --hide sight-words-vm`, and confirm the status
changes to `started`. On this Mac, `utmctl start --hide` has sometimes printed
non-fatal `OSStatus error -10004` event messages even though it started the VM.
Always check `utmctl status` before retrying; do not launch a second start when
the status already says `started`.

The full sequence was verified on 2026-07-18. It opened no console window, and
Alpamon, the 9p shared mount, the backup timer, PostgreSQL, the application,
Cloudflared, the restored data, and the public HTTPS route all recovered after
the clean poweroff and hidden start.

The LaunchAgent should be edited only when the VM name or application path
changes. Validate a modified plist before the next login:

```bash
plutil -lint /Users/marco/Library/LaunchAgents/com.marco.sightwords-vm.plist
```

The obsolete macOS Login Item named `open`, which invoked `/usr/bin/open` with
a UTM URL, has been removed. Do not recreate it. The corrected LaunchAgent
loads on the next macOS login. Do not turn on UTM's separate **Prevent system
from sleeping** option: Amphetamine is the single owner of Mac idle-sleep
prevention.

## Emergency recovery through UTM

The Mac can reach the guest through `qemu-guest-agent` even when Alpamon is
disconnected. This is the recovery path for inspecting or restarting Alpamon;
it is not the routine administration path because these commands run as guest
root and are outside an Alpacon Work Session.

Check whether UTM considers the VM started:

```bash
/Applications/UTM.app/Contents/MacOS/utmctl status sight-words-vm
```

Inspect and restart Alpamon without opening the console or capturing input:

```bash
/Applications/UTM.app/Contents/MacOS/utmctl exec --hide sight-words-vm \
  --cmd /usr/bin/systemctl status alpamon --no-pager

/Applications/UTM.app/Contents/MacOS/utmctl exec --hide sight-words-vm \
  --cmd /usr/bin/systemctl restart alpamon
```

`utmctl file push` can bootstrap a recovery file by reading it from standard
input and writing it into the guest as root:

```bash
/Applications/UTM.app/Contents/MacOS/utmctl file push --hide \
  sight-words-vm /guest/destination < /mac/source
```

Use that only when Alpacon file transfer is unavailable. Once Alpamon reports
connected and commissioned, return to an approved Alpacon Work Session.

## Database backups

The reviewed source templates are:

```text
ops/backup/sight-words-backup
ops/backup/sight-words-backup.service
ops/backup/sight-words-backup.timer
```

The replacement setup script installs these files and runs a manual validated
backup before enabling public service. Do not make VM-only edits to the
installed copies without applying the same reviewed change to the templates.

Systemd owns the backup schedule, so it runs without an interactive login:

```text
Service: /etc/systemd/system/sight-words-backup.service
Timer:   /etc/systemd/system/sight-words-backup.timer
Script:  /usr/local/sbin/sight-words-backup
Schedule: every day at 03:15 Asia/Seoul
```

The script writes a PostgreSQL custom-format archive to:

```text
/mnt/utm/sight-words-backups/
```

This directory is visible on macOS at:

```text
/Users/marco/dev/utm/sight-words-game/sight-words-backups/
```

Each backup is written to a temporary file, checked with `pg_restore --list`,
then renamed into place. Only completed `sight-words-postgres-*.dump` files
count toward retention; the newest seven are kept. Files have mode `0600` and
are visible to `marco` from the Mac side of the share.

Use an approved Alpacon Work Session to inspect or run the timer manually:

```bash
systemctl list-timers sight-words-backup.timer
sudo systemctl start sight-words-backup.service
```

Validate a specific archive before relying on it for recovery. The PostgreSQL
client inside the running database container can read a custom archive from
standard input:

```bash
cat /mnt/utm/sight-words-backups/sight-words-postgres-<timestamp>.dump \
  | sudo docker compose \
      --project-directory /opt/sight-words \
      --env-file /opt/sight-words/.env.production \
      -f /opt/sight-words/compose.production.yaml \
      exec -T postgres pg_restore --list
```

`pg_restore --list` verifies archive structure without modifying the database.
A successful backup is not a restore drill; restore only in a deliberate,
separately approved recovery operation.

## Restart and recovery checks

Docker's `unless-stopped` restart policies recover the application and
PostgreSQL after the Docker daemon starts. Once configured, Cloudflared uses
the same policy. Systemd recovers Alpamon and the backup timer, while
`/etc/fstab` remounts `/mnt/utm`.

After an intentional VM reboot, use an approved Work Session to confirm:

```bash
findmnt -T /mnt/utm -o TARGET,SOURCE,FSTYPE -n
systemctl is-active alpamon
systemctl is-active sight-words-backup.timer
sudo docker compose \
  --project-directory /opt/sight-words \
  --env-file /opt/sight-words/.env.production \
  -f /opt/sight-words/compose.production.yaml \
  --profile tunnel ps
sudo docker compose \
  --project-directory /opt/sight-words \
  --env-file /opt/sight-words/.env.production \
  -f /opt/sight-words/compose.production.yaml \
  --profile tunnel exec -T app \
  wget -qO- http://127.0.0.1:4173/api/health
```

Finally, verify the public route from outside the VM:

```text
https://words.marcokwak.com/api/health
```

Service recovery brings processes back. Data recovery requires a validated
database archive and an intentional restore procedure.
