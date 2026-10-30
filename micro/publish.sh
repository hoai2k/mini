#!/usr/bin/env sh
# Copy the Micro prototypes (static ES modules, no build step) into a GitHub
# Pages output directory, so they are published at <site>/micro/prototypes/.
# The research atlas, design documents and checks stay out of the deploy.
# Usage: micro/publish.sh local/pages/micro
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out/prototypes"
(cd "$here/prototypes" && find . -type f ! -name 'check.mjs' ! -path './test/*' -print) | while read -r f; do
  mkdir -p "$out/prototypes/$(dirname "$f")"
  cp "$here/prototypes/$f" "$out/prototypes/$f"
done
echo "published Micro prototypes to $out/prototypes/"
