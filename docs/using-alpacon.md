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

Direct root commands are disabled for this workspace. Run commands as the VM's
normal administrator account, currently `marco`.

For a privileged operation:

1. Include the `sudo` feature in the approved Work Session.
2. Bind a temporary, session-scoped sudo policy that permits only the required
   command patterns on the intended VM and user.
3. Run ordinary `sudo <command>` through the session. Do not use `sudo -n`:
   it bypasses Alpacon's approved non-interactive sudo flow and will fail.

Do not create a broad, permanent passwordless-sudo policy to work around a
missing session policy. The policy must end with the Work Session.

## Deployment-specific access

The VM does not need GitHub repository access for the initial deployment model.
The Mac builds a Linux ARM64 application image, places its archive in the UTM
shared folder, and the VM loads that archive during an approved Work Session.

For the exact build, transfer, deployment, verification, and rollback commands,
read [Deploying Docker images to the UTM VM](deploying-image-archives.md).

## Completion checklist

- Confirm the Work Session is active before changing the VM.
- Confirm the command result and relevant service health checks.
- Close the Work Session and confirm any session-bound sudo policy has expired.
- Do not leave long-lived server, command, or sudo access broader than needed.
