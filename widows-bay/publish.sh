#!/usr/bin/env sh
# Copy the Widow's Bay prototype (a static page, no build step) into a GitHub
# Pages output directory, so it is published at <site>/widows-bay/.
# Usage: widows-bay/publish.sh local/pages/widows-bay
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/index.html" "$here/styles.css" "$out/"
cp -R "$here/src" "$here/assets" "$out/"
mkdir -p "$out/design"
cp -R "$here/design/references" "$out/design/"
echo "published Widow's Bay to $out/"
