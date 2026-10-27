# AJP v0.1.19 rollout and rollback

Maintainer approval required before production changes. This document is the publication plan; it is not a deployment record.

## Merge commit

- **PR:** https://github.com/alljigsawpuzzles/open-seo/pull/22 (draft)
- **Proposed merge commit:** `77a9e5555f5d8add0e9f5f0258e74b467238ca26` (or newer tip of `codex/upgrade-openseo-v0.1.19` if docs-only commits land first)
- **Build validated on droplet at:** `c5776f55` (same tree as merge minus status-doc commit; rebuild from merged SHA before upload)

## Live production state (read 2026-10-27, no writes)

| Item                       | Value                                                                     |
| -------------------------- | ------------------------------------------------------------------------- |
| D1 `d1_migrations` rows    | **59**                                                                    |
| Latest applied             | `0059_thankful_aaron_stack.sql` (ledger id `00060`)                       |
| **0055**                   | **Not** in ledger (gap at id `00056`; 0055 deliberately skipped)          |
| App Worker @ 100%          | `f4575d03-0bcc-4f2b-85e6-839e9be847ec` (annotation: v0.1.14 / `ff093c2f`) |
| Audit Worker @ 100%        | `cbe1faa7-9c3c-4c41-8956-2c7dd8db7056`                                    |
| `AUTH_MODE` (live binding) | `cloudflare_access`                                                       |
| App cron schedules         | `17 3 * * *`, `*/5 * * * *` (record before pause)                         |

## Migration delta (only)

Apply **nothing** via generic `db:migrate:prod`, `deploy:selfhost`, or Alchemy migrate.

| Order | File                                     | Ledger id after apply |
| ----- | ---------------------------------------- | --------------------- |
| 1     | `0060_reflective_wrecker.sql`            | `00061`               |
| 2     | `0061_bumpy_fat_cobra.sql`               | `00062`               |
| 3     | `0062_bind_api_keys_to_organization.sql` | `00063`               |

**Excluded:** `0055_chief_centennial.sql` and every migration already on the live ledger.

Prepared SQL bundle (private): `/home/geoffajp/openseo-release-review/v0.1.19/migration-0060-0062.sql` and `migration-delta-manifest.json`.

Rehearsed against a **fresh remote D1 export** (2026-10-27): 0060–0062 only; integrity OK; FK OK; ledger 59 → 62.

**0062 note:** updates `apikey.metadata` for organization binding. Treat as data change; rollback needs export restore if incompatible.

## Pre-publication preparation (done without disruption)

| Artifact                           | Location                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| D1 SQL export                      | `openseo-release-review/v0.1.19/pre-publication/production-20261027T104412Z.sql` (SHA256 recorded privately) |
| Worker settings + script snapshots | `openseo-deploy/backups/2026-10-27T10-44-25-050Z/`                                                           |
| Candidate build + dry-runs         | `openseo-release-review/v0.1.19/release-build-validation.json`                                               |

**D1 export:** Cloudflare may briefly pause queries during export; no schema changes were made.

## Publication sequence (after merge + approval)

1. **Recheck** active Workflow instances (site audit, rank check, AI visibility). Do not pause schedules or terminate jobs until this pass is complete and Geoff approves.
2. **Pause** app cron triggers (`17 3 * * *`, `*/5 * * * *`); record exact schedule objects for restore.
3. **Wait** for running jobs to finish (or document explicit exceptions).
4. **Fresh export** again immediately before migrate (post-upgrade writes since today’s export must be preserved or consciously discarded).
5. **Apply** `migration-0060-0062.sql` via explicit `wrangler d1 execute` (or equivalent allowlisted steps), one file at a time, verifying ledger after each.
6. **Build** from merged SHA with `AUTH_MODE=cloudflare_access` and production client env (same method as v0.1.14 validation).
7. **Upload** inactive app + audit candidates; compare bindings/runtime to `openseo-deploy/backups/.../summary.json` and live API read.
8. **Activate** both Workers together at 100% (matching pair).
9. **Smoke:** Access on private routes; public `/about/`, `/privacy`, Google verification file; GSC/GA4; rank keywords; audit history; prompt research without OpenRouter (MCP/UI paths you use); paused AI tracking unchanged.
10. **Restore** cron schedules exactly as recorded in step 2.

## Expected interruption

| Phase                | User impact                                                                            |
| -------------------- | -------------------------------------------------------------------------------------- |
| Queue drain          | None if no active long jobs                                                            |
| D1 migrate (0060–62) | Short windows per SQL file; new tables only until features used; 0062 touches API keys |
| Worker cutover       | Seconds–minutes; in-flight HTTP may fail once; workflows rely on durable replay        |
| Cron pause           | Scheduled rank/AI admissions delayed until restore                                     |

No auth mode change, secret rotation, or Shopify rule edits in this plan.

## Rollback

**Workers (code only):** reactivate previous versions **together**: app `f4575d03-0bcc-4f2b-85e6-839e9be847ec`, audit `cbe1faa7-9c3c-4c41-8956-2c7dd8db7056`. Restore cron schedules from backup JSON.

**Database:** if 0060–62 applied, prefer **restore D1 from pre-migrate export** if anything breaks. Additive schema (local rank tables, signup campaigns) can remain under v0.1.14 code if you roll Workers back without DB restore—only if no dependency on new code paths. **0055** remains excluded on any restore path that replays migrations.

**Post-upgrade writes:** if users changed data after the pre-migrate export, a full restore loses those writes; take the final export immediately before migrate and accept that rollback trades availability for that window.

## Validation already completed (droplet)

- `pnpm ci:check`, Vitest **1847**, selfhost build, Wrangler dry-runs (see `ajp-upstream-integration.md`).
- GitHub Actions CI **not run** on PR #22 — see integration doc (Actions disabled on repo).
