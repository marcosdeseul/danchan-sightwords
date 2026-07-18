# Deployment guidance

Read these documents before making any deployment or VM change:

- [Environment rebuild runbook](docs/rebuilding-the-utm-environment.md)
- [Image archive deployment workflow](docs/deploying-image-archives.md)
- [Using Alpacon](docs/using-alpacon.md)
- [Operating the UTM VM](docs/operating-the-utm-vm.md)

Key rules:

- Build application images on the Mac for `linux/arm64`; do not build the
  application on the Ubuntu VM.
- Transfer versioned image archives through the UTM shared folder, then load
  them on the VM. Use a clean Git commit hash as the image tag.
- Keep production secrets and PostgreSQL data on the VM; never put either in an
  image archive or commit them to the repository.
- Use a short, approved Alpacon Work Session for every VM change and close it
  when the task is complete.
- Do not close the running UTM console with its red window button: UTM warns
  that doing so kills the VM. Minimize or hide it instead, and use Alpacon for
  routine guest administration.
- Keep macOS-specific runtime configuration out of the VM and repository
  secrets. The UTM startup and backup locations are documented in the UTM
  operations guide.
- Treat a rebuild as data recovery, not merely container startup. Before
  restoring, identify the exact image archive, validated PostgreSQL backup,
  production Compose file, and expected database state.
- Use `scripts/setup-replacement-vm.sh` for a replacement guest. Preview
  mutating stages with `--dry-run`, verify the image SHA-256, and never run the
  database stage without the deliberately selected backup and
  `--confirm-restore`.
- MCP-created agent Work Sessions and CLI-created user Work Sessions are not
  interchangeable. Use a short user session plus `alpacon exec --env` when a
  human must provide a secret without exposing it in command history.
