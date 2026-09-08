#!/usr/bin/env sh
# Copy the 3D stand-in viewer, the stand-in library and the Hopper GLBs into a
# GitHub Pages output directory (the compiled game's directory), so the viewer
# is published at <site>/hopper/3d/viewer/ next to the game.
# Usage: hopper/3d/publish.sh local/pages/hopper
set -eu
out="${1:?output directory (the built hopper/ page directory)}"
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$out/3d/viewer" "$out/3d/standins/src" "$out/3d/design" "$out/models"
cp "$here"/viewer/*.html "$here"/viewer/*.js "$out/3d/viewer/"
cp "$here"/standins/src/*.js "$out/3d/standins/src/"
cp "$here"/design/standin-manifest.json "$here"/design/*.md "$here"/design/Hopper_3D_Design.html "$here"/design/Hopper_3D_Design.pdf "$out/3d/design/"
cp "$here"/../models/*.glb "$here"/../models/manifest.json "$here"/../models/attachments.js "$out/models/"
cp -R "$here/textures" "$out/3d/"
echo "published 3D viewer to $out/3d/viewer/"
