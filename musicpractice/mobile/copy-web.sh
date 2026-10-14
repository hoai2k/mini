#!/usr/bin/env sh
# Copy the web app (../app, through ../publish.sh) into www/, which Capacitor
# bundles into the iOS and Android apps. www/ is build output, not committed.
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
sh "$here/../publish.sh" "$here/www"
