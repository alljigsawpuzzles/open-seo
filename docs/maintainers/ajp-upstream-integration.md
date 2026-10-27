# AJP upstream integration status

Secret-free progress record for the self-hosted fork. Private operational detail stays under `/home/geoffajp/openseo-handover/`.

## Verified baseline (2026-10-27)

| Item                                     | Value                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| Last deployed integration                | **v0.1.14** (PR #21), merge `ff093c2f`                                   |
| Fork `origin/main`                       | `ff093c2f` (matches v0.1.14 worktree)                                    |
| Stale checkout (do not use for upgrades) | `/home/geoffajp/dev/open-seo` @ `3564a19f` (`codex/droplet-development`) |
| Integration worktree                     | `/home/geoffajp/dev/open-seo-v0.1.19`                                    |
| Integration branch                       | `codex/upgrade-openseo-v0.1.19` @ `d5639a01` (pushed)                    |
| Draft PR                                 | https://github.com/alljigsawpuzzles/open-seo/pull/22                     |
| Upstream target tag                      | `v0.1.19` → `99d9a49c`                                                   |
| Upstream v0.1.14 tag                     | `8713d753` (merge-base with fork)                                        |
| Commits upstream v0.1.14…v0.1.19         | 60 on linear release ancestry                                            |

## Release scope (verified tags)

| Release | Tag SHA    | Notes for AJP fork                                                                                  |
| ------- | ---------- | --------------------------------------------------------------------------------------------------- |
| v0.1.15 | `0ca244b0` | MCP OAuth/org binding, rank recheck for never-ranked keywords, MCP sign-in refresh                  |
| v0.1.16 | `236761ad` | **Shopify crawl continues past refused URLs**; dashboard scan without renderer; workflow resilience |
| v0.1.17 | `307c9ec6` | **AUTH_MODE=password**, standalone Docker, team/org schema (keep **cloudflare_access** in prod)     |
| v0.1.18 | `89ad06cf` | **OpenRouter gate** for AI visibility setup; Every App auth mode (not used on AJP)                  |
| v0.1.19 | `99d9a49c` | Rendered-audit **>1k pages within one credit hold**; MCP rank keyword volume                        |

## New migrations after production (post–v0.1.14)

SQLite journal adds **0060**, **0061**, **0062** (Postgres **0038–0040**). **0055 remains intentionally skipped** on AJP production; do not run generic `migrate` without an explicit allowlist. Rehearse 0060–0062 on a private restored backup before any prod apply.

## Merge conflict resolution (fork-specific)

Resolved eight conflict regions by combining upstream v0.1.16–v0.19 crawler/auth improvements with fork behavior:

- **Crawler:** `auditRequestHeaders` / `publicFetch`, upstream rate-limit pacing and Shopify `refuse`, plus fork fetch diagnostics and render HTML fallback.
- **AI prompt research:** retained DataForSEO-only path when `OPENROUTER_API_KEY` is unset on self-host.
- **Workflow:** both `renderHold` (metered rendered audits) and per-audit `diagnostics`.

## Material risks (unchanged constraints)

1. **Auth:** v0.1.17 adds password/standalone paths; production must stay `cloudflare_access` until an explicit product decision.
2. **OpenRouter:** setup gate is stricter upstream; optional key still unlocks model filtering—fork fallback remains for prompt research without a key.
3. **Migrations:** 0055 skip + non-contiguous ledger; plan 0060–0062 explicitly.
4. **Shopify signature:** save/re-encrypt still open; do not rotate secrets during integration testing.
5. **Rank check:** upstream changes may help retries/UI; Oct 20 cost/queue findings are not automatically fixed—re-read code, no new paid runs without approval.
6. **GitHub CI:** Actions are **disabled** on `alljigsawpuzzles/open-seo` (workflow dispatch returns HTTP 422). PR #22 shows no checks because nothing runs—not because checks failed. Droplet validation is the current gate unless Actions is re-enabled.
7. **AI visibility UI (v0.1.18):** `OpenRouterKeyGate` blocks `/ai-visibility` and `/prompt-explorer` until `OPENROUTER_API_KEY` is set. Server-side **manual** setup and **DataForSEO-only prompt research** remain; confirm this matches how staff use the product without a key.

## Validation (droplet, 2026-10-27)

| Check                                | Result                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `pnpm ci:check`                      | Passed at `c5776f55` (oxlint needs ~6 GB Node heap on this machine)        |
| Vitest                               | **1847** tests, **265** files                                              |
| Selfhost build (`cloudflare_access`) | Passed                                                                     |
| Wrangler dry-run                     | `open-seo-selfhost` (43 bindings), `open-seo-selfhost-audit` (18 bindings) |
| Migration rehearsal                  | 0059–0062 on private SQLite copy; FK 0; 0055 skipped; ledger **62**        |

Private logs: `/home/geoffajp/openseo-release-review/v0.1.19/` (not in git).

## Next steps

1. Review draft PR #22; wait for GitHub CI where applicable.
2. Geoff approves `ajp-v0.1.19-rollout.md` before D1 apply or Worker activation.
3. Fresh production export and live binding snapshot immediately before publication.

## Deployment state

**Not live.** Integration branch validated on droplet only.
