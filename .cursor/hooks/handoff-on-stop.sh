#!/usr/bin/env bash
# When an Agent session stops, nudge one follow-up turn to update the gitignored handoff log.
# Requires: Cursor Hooks enabled (Settings → Hooks). Project root as cwd.
set -euo pipefail

HANDOFF=".local/ajp-active-work.md"

if [[ ! -f "$HANDOFF" ]]; then
  echo '{}'
  exit 0
fi

# If the handoff was touched in the last 3 minutes, assume this session already updated it.
if find "$HANDOFF" -mmin -3 -print 2>/dev/null | grep -q .; then
  echo '{}'
  exit 0
fi

python3 <<'PY'
import json

print(
    json.dumps(
        {
            "followup_message": (
                "Before this session ends, update `.local/ajp-active-work.md`: "
                "refresh the **Last updated** date and prepend a **Session log** block "
                "(Discussed / Did / Next) for this conversation. No secrets. "
                "Do not commit that file. Then finish."
            )
        }
    )
)
PY
