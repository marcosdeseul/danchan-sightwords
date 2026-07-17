#!/usr/bin/env sh
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <image-tag> <archive-path>" >&2
  exit 64
fi

image_tag=$1
archive_path=$2

docker buildx build --platform linux/arm64 --load --tag "$image_tag" .
docker save --output "$archive_path" "$image_tag"

echo "Created $archive_path containing $image_tag"
