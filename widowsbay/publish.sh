#!/usr/bin/env sh
# Copy the Widow's Bay prototype (a static page, no build step) into a GitHub
# Pages output directory, so it is published at <site>/widowsbay/.
# Usage: widowsbay/publish.sh local/pages/widowsbay
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/index.html" "$here/styles.css" "$out/"
cp -R "$here/src" "$here/assets" "$out/"
echo "published Widow's Bay to $out/"
