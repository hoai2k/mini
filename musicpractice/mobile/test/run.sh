#!/usr/bin/env sh
# Test the native mixers (Android's Java, iOS's Swift) against the web app's
# own sounds. Needs the fixtures first: node musicpractice/mobile/test/fixtures.mjs
# Usage (from the repository root): sh musicpractice/mobile/test/run.sh [java|swift]
set -eu
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
fixtures="$root/local/musicpractice-mixer"
build="$root/local/musicpractice-mixer-build"
mkdir -p "$build"
if [ "${1:-java}" = java ]; then
  javac -d "$build/java" "$here/../android/app/src/main/java/io/github/hoai2k/musicpractice/PracticeMixer.java" "$here/MixerTest.java"
  java -cp "$build/java" io.github.hoai2k.musicpractice.MixerTest "$fixtures"
else
  swiftc="${SWIFTC:-swiftc}"
  cp "$here/MixerTest.swift" "$build/main.swift" # top-level code must be in main.swift
  "$swiftc" -O -o "$build/mixertest" "$here/../ios/App/App/PracticeMixer.swift" "$build/main.swift"
  "$build/mixertest" "$fixtures"
fi
