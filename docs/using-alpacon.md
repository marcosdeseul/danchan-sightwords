# Using Alpacon for the UTM VM

## Purpose

Alpacon is the approved management path for the Ubuntu VM. Alpamon runs on the
VM as a native system service, while Alpacon grants time-limited, audited access
to operate the host.

Use Alpacon instead of enabling SSH for routine maintenance.

## Local MCP connection

Codex connects through the local Alpacon MCP server, started with `uvx`.
The local MCP server stores an API token outside this repository. Never commit,
print, or paste that token into a command, issue, or document.

The token needs both API scopes and matching ACLs:

- an allowed-server rule for the target VM;
- command API scopes and an allowed-command rule for the commands being run;
- Work Session scopes to create, inspect, and complete sessions when Codex is
  requesting the session;
- only the read or management scopes required for the current task.

Keep the token restricted to this VM and rotate or revoke it when it is no
longer needed.

## Local CLI connection

Install the macOS CLI from Alpacon's Homebrew tap and verify it:

```bash
brew install alpacax/alpacon/alpacon-cli
alpacon version
```

Authenticate to this workspace without opening a browser automatically:

```bash
alpacon login --workspace personal --region ap1 --no-browser
```

The CLI prints a device-authorization URL and code. Complete that authorization
in the browser; the resulting CLI login is stored outside this repository at
`~/.alpacon/config.json`. Do not print, copy into the repository, or share that
file.

An MCP-created agent Work Session is not attachable from the human CLI. When a
human must enter a credential, create a separate short user Work Session from
the CLI, bind it with `alpacon work-session use <session-id>`, and complete it
immediately after the handoff.

For credential forwarding, read the value silently into a shell environment
variable and use `alpacon exec --env="VARIABLE"`. This sends the value without
putting it on the Alpacon command line or in the command audit log. Never use
the literal `--env="VARIABLE=value"` form for a credential. Clear both the
variable and active session afterward:

```bash
unset VARIABLE
alpacon work-session complete <session-id>
alpacon work-session use --unset
```

## Work Session workflow

Before a VM change:

1. Create a Work Session scoped to the target VM, task purpose, and required
   features, such as `command` and, when necessary, `sudo`.
2. Wait for a human to approve it in Alpacon. Do not run the change while the
   session is pending.
3. Attach every command to that active Work Session.
4. Verify the requested result, then close the Work Session immediately.

The session is an access boundary, not merely an audit label. It expires
automatically and records the command history.

## Linux account and sudo rules

Direct root commands are disabled for this workspace. Commands on the rebuilt
VM currently run as the session-assigned `cloudflaretunnel` account in the
`alpacon` group. Confirm the account shown on the Work Session rather than
hard-coding a local Ubuntu login name.

For a privileged operation:

1. Include the `sudo` feature in the approved Work Session.
2. Bind a temporary, session-scoped sudo policy that permits only the required
   command patterns on the intended VM and user.
3. Confirm the active Work Session lists the bound policy before running the
   command. The `sudo` scope declares the requested capability but does not by
   itself grant any sudo command.
4. Run ordinary `sudo <command>` through the session. Do not use `sudo -n`:
   it bypasses Alpacon's approved non-interactive sudo flow and will fail.

Do not create a broad, permanent passwordless-sudo policy to work around a
missing session policy. The policy must end with the Work Session.

If a command returns `sudo: A terminal is required to authenticate`, first
check whether the Work Session has an appropriate bound sudo policy. Do not
work around that error with a password, a TTY, `sudo -n`, or a permanent
policy. Add the narrow session policy through the approval flow and retry.

The production deployment under `/opt/sight-words` is root-owned. The
session-assigned account may be unable to enter that directory even when it
exists. For approved Docker operations, avoid an unprivileged `cd` and use the
absolute Compose paths through sudo instead:

```bash
sudo docker compose \
  --project-directory /opt/sight-words \
  --env-file /opt/sight-words/.env.production \
  -f /opt/sight-words/compose.production.yaml \
  <compose-command>
```

If the dashboard says the agent is not installed even though `alpamon.service`
is running, check both `is_connected` and `commissioned`. A newly registered
host can be connected but not yet commissioned until it belongs to an allowed
server group and Alpamon reconnects. Use UTM guest-agent recovery only to
inspect or restart Alpamon, then return to a Work Session. See
[Operating the UTM VM](operating-the-utm-vm.md#emergency-recovery-through-utm).

## Deployment-specific access

The VM does not need GitHub repository access for the initial deployment model.
The Mac builds a Linux ARM64 application image, places its archive in the UTM
shared folder, and the VM loads that archive during an approved Work Session.

For the exact build, transfer, deployment, verification, and rollback commands,
read [Deploying Docker images to the UTM VM](deploying-image-archives.md).
For the access sequence used while replacing the whole guest, read the
[environment rebuild runbook](rebuilding-the-utm-environment.md).

## Completion checklist

- Confirm the Work Session is active before changing the VM.
- Confirm the command result and relevant service health checks.
- Close the Work Session and confirm any session-bound sudo policy has expired.
- Do not leave long-lived server, command, or sudo access broader than needed.
