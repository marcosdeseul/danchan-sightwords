#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <image-tag> <archive-path>" >&2
  exit 64
fi

image_tag=$1
archive_path=$2
checksum_path=${archive_path}.sha256

docker buildx build --platform linux/arm64 --load --tag "$image_tag" .
docker save --output "$archive_path" "$image_tag"

if command -v shasum >/dev/null 2>&1; then
  checksum=$(shasum -a 256 "$archive_path" | awk '{print $1}')
elif command -v sha256sum >/dev/null 2>&1; then
  checksum=$(sha256sum "$archive_path" | awk '{print $1}')
else
  echo "Neither shasum nor sha256sum is available" >&2
  exit 69
fi

printf '%s\n' "$checksum" >"$checksum_path"

echo "Created $archive_path containing $image_tag"
echo "Created $checksum_path"
