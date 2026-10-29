# Local-only files (not committed)

This directory holds **private continuity notes** for AJP OpenSEO work on this machine.

| File | Purpose |
| ---- | ------- |
| `ajp-active-work.md` | **Current state + session log** — update after each agent session. Gitignored. |
| `session-log.md` | Optional append-only archive if `ajp-active-work.md` grows too large. Gitignored. |

Copy structure from `docs/maintainers/ajp-local-handoff.example.md` when creating `ajp-active-work.md` on a new clone.

**New chat prompt:**

```text
Read .local/ajp-active-work.md if present, then AGENTS.md. Goal: …
```

**Automatic update:** with Cursor **Hooks** enabled, `.cursor/hooks.json` runs `handoff-on-stop.sh` when an Agent turn finishes—it requests one follow-up turn to update this file unless it was modified in the last 3 minutes.

Also `@` a recent chat when you need verbatim recall of one thread.
