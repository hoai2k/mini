#!/usr/bin/env sh
# Copy the web app (../app, through ../publish.sh) into www/, which Capacitor
# bundles into the iOS and Android apps. www/ is build output, not committed.
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
sh "$here/../publish.sh" "$here/www"
# The themes' fonts, bundled (fonts/fetch_fonts.py), so the apps never load them
# from Google: works offline from the first launch.
mkdir -p "$here/www/fonts"
cp -R "$here/fonts/files" "$here/fonts/licenses" "$here/www/fonts/"
cp "$here/fonts/"*.css "$here/www/fonts/"
sed -i.bak -e 's|https://fonts.googleapis.com/css2?family=Fraunces[^"]*|fonts/classic.css|' \
  -e '/<link rel="preconnect" href="https:\/\/fonts/d' "$here/www/index.html"
rm -f "$here/www/index.html.bak"
