# AJP v0.1.19 rollout and rollback (draft)

For maintainer approval before any production change. Not a deployment record.

## Preconditions

- No running audit, rank-check, or AI visibility jobs (recheck Cloudflare Workflows at publication time).
- Fresh private D1 export and Worker binding snapshots (reuse v0.1.14 publication discipline).
- Branch `codex/upgrade-openseo-v0.1.19` merged only after review; publication uses the merged commit built on the droplet.

## Schema changes (D1)

Apply **only** migrations present in upstream v0.1.19 after the current production ledger:

| Migration                                | Purpose (summary)                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `0059_thankful_aaron_stack.sql`          | Apply if not already on live ledger (rehearsal baseline was one short). |
| `0060_reflective_wrecker.sql`            | Local rank tracking tables (new; no row loss on existing tables).       |
| `0061_bumpy_fat_cobra.sql`               | `user_signup_campaigns` (new).                                          |
| `0062_bind_api_keys_to_organization.sql` | Backfill MCP API key metadata with organization id.                     |

**Do not apply `0055_chief_centennial.sql`.** Do not run `deploy:selfhost`, `db:migrate:prod`, or Alchemy deploy scripts that apply the full migration chain.

Rehearsal (private): copy of v0.1.14 `migration-rehearsal.sqlite`, then 0059–0062; integrity ok, FK ok, existing table data preserved, 0055 still absent, obsolete `audit_pages` columns retained.

## Worker publication

1. Pause scheduled admissions; record original cron/trigger state for restore.
2. Build with `vite build --mode selfhost` and `AUTH_MODE=cloudflare_access` (validated on droplet at `c5776f55`).
3. Wrangler **dry-run** both Workers against live binding snapshots (43 app / 18 audit bindings); no secret rotation.
4. Upload inactive candidates; compare bindings, compatibility flags, workflows, and DO names to live.
5. Activate app + audit together at 100%.
6. Smoke: Cloudflare Access on private routes; `/about/`, `/privacy`, Google verification file; GSC/GA4 displays; rank keywords; audit history; AI prompt research without OpenRouter key; IndexNow UI present (no automatic submission).

## Rollback

- **Workers:** revert to last known good app/audit version IDs from v0.1.14 publication record; restore schedules.
- **Database:** if 0060–0062 were applied, new tables/columns are additive; code rollback to v0.1.14 is usually safe without DB restore. If 0062 ran, MCP keys gained organization metadata—older code may ignore it. Full restore from pre-migration export if anything unexpected appears.
- **0055:** still excluded; rollback does not require dropping the legacy audit page JSON columns.

## Explicit non-goals for this release

- No auth mode change, secret rotation, Shopify/Filtrex rule edits, or new paid provider jobs during publication.
- No automatic unpause of AI prompt tracking.
