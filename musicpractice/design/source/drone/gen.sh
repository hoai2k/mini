#!/usr/bin/env bash
# Generate one take with ElevenLabs sound effects into ../../sounds/drone/raw/.
# Usage: ELEVENLABS_API_KEY=... gen.sh <name> <seconds> "<prompt>"
# The key is read from the environment only; never write it into the repository.
set -euo pipefail
: "${ELEVENLABS_API_KEY:?set ELEVENLABS_API_KEY}"
here="$(cd "$(dirname "$0")" && pwd)"
out="$here/../../sounds/drone/raw"; mkdir -p "$out"
name=$1; secs=$2; shift 2
body=$(python3 -c 'import json,sys; print(json.dumps({"text": sys.argv[1], "duration_seconds": float(sys.argv[2]), "prompt_influence": 0.7, "model_id": "eleven_text_to_sound_v2"}))' "$*" "$secs")
curl -sS --fail -o "$out/$name.mp3" -X POST "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_192" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" -d "$body"
echo "$out/$name.mp3"
