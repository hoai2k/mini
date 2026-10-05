#!/usr/bin/env sh
# Copy the Widow's Bay prototype (a static page, no build step) into a GitHub
# Pages output directory, so it is published at <site>/widowsbay/ (the cutscene
# workbench comes along at <site>/widowsbay/workbench/).
# Usage: widowsbay/publish.sh local/pages/widowsbay
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/index.html" "$here/styles.css" "$here/manifest.webmanifest" "$out/"
cp -R "$here/src" "$here/assets" "$here/icons" "$here/workbench" "$out/"
echo "published Widow's Bay to $out/"
