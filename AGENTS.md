# Deployment guidance

Read these documents before making any deployment or VM change:

- [Image archive deployment workflow](docs/deploying-image-archives.md)
- [Using Alpacon](docs/using-alpacon.md)

Key rules:

- Build application images on the Mac for `linux/arm64`; do not build the
  application on the Ubuntu VM.
- Transfer versioned image archives through the UTM shared folder, then load
  them on the VM. Use a clean Git commit hash as the image tag.
- Keep production secrets and PostgreSQL data on the VM; never put either in an
  image archive or commit them to the repository.
- Use a short, approved Alpacon Work Session for every VM change and close it
  when the task is complete.
