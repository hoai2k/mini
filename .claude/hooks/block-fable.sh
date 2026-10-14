#!/bin/sh
# PreToolUse hook: refuse any subagent or workflow call that asks for Fable.
# Fable is only used when the owner explicitly asks for it (CLAUDE.md, "Models").
input=$(cat)
if printf '%s' "$input" | jq -e '
  (.tool_input.model // "" | ascii_downcase | test("fable")) or
  (.tool_input.script // "" | test("model\\s*:\\s*[\"'\''`][^\"'\''`]*fable"; "i"))
' >/dev/null 2>&1; then
  echo "Blocked: Fable is not used in this repository unless the owner explicitly asks for it (CLAUDE.md, \"Models\"). Leave the model unset or use opus or sonnet." >&2
  exit 2
fi
exit 0
