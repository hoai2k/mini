#!/usr/bin/env sh
# Copy Stocks (static ES modules, no build step) into a GitHub Pages output
# directory, so it is published at <site>/stocks/. The page, its styles, code,
# icon and built-in history (app/data/) go out; tests, tools and the Worker stay.
# Usage: stocks/publish.sh local/pages/stocks
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/app/index.html" "$here/app/styles.css" "$here/app/icon.svg" "$out/"
cp -R "$here/app/src" "$here/app/data" "$out/"
echo "published Stocks to $out/ ($(du -sh "$out" | cut -f1))"
