# AJP v0.1.19 — fork customisations vs upstream tag

Compared **fork baseline** `ff093c2f` (deployed v0.1.14), **integration branch** `codex/upgrade-openseo-v0.1.19`, and **upstream** tag `v0.1.19` (`99d9a49c`). Release notes alone are not evidence; rows cite code diffs and tests.

## Summary

| Area                           | Upstream v0.1.19 alone                                                           | PR #22 outcome                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Shopify crawl / signatures     | Refuse pacing + render-throttled 429s (#1059); RFC 9421 signing in tree          | Fork diagnostics + HTML fallback **merged with** upstream throttle/render paths           |
| Initial HTML + optional render | Dashboard scan without renderer (#1071); >1k render hold (#1085)                 | Fork Filtrex/render diagnostics and **preserve readable HTML on render failure** retained |
| Rank check UX / cost           | Manual never-ranked retries (#1061); no UI/cost fixes for Oct findings           | Same upstream rank UI/estimator as v0.1.19; Oct 20 issues **mostly unresolved**           |
| DataForSEO-only AI             | v0.1.18 **OpenRouterKeyGate** blocks UI; prompt research **requires** OpenRouter | Fork server paths kept; **gate bypass** when `generationAvailable === false` (this PR)    |

---

## 1. Shopify audit refusal, blocking, signature handling

|                                          |                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Original problem (AJP)**               | Intermittent Cloudflare **challenge** and Shopify **429** on signed crawls; need safe rejection telemetry without leaking signatures; signature **save/re-encrypt** under new crawler key still pending ops (handover).                                                                                                   |
| **Upstream (v0.1.16 `c79387a2`, #1059)** | `crawl-throttle.ts`: per-URL **refuse** after repeated 429s; Shopify audits **continue** other URLs; **renderThrottled** sends 429 listing pages through renderer instead of endless backoff.                                                                                                                             |
| **Custom code in PR**                    | `auditPageFetch.ts` (fork module, not in upstream tag), `fetch-diagnostics.ts`, `rejection-details.ts`, `workflow-fetch-comparison.ts`, probe logging in `url-policy.ts`, `discovery.ts` signature redirect rules, `SiteAuditWorkflow` diagnostics timeline. Upstream `web-bot-auth.ts` / `crawlerHeadersFor` used as-is. |
| **Relation to upstream**                 | **Supplements** upstream pacing/render-throttle; **does not override** refuse/renderThrottled semantics (merged in `site-audit-workflow-helpers.ts`). Signature **handling** is upstream; **credential lifecycle** is operational, not changed by this PR.                                                                |
| **Fix status**                           | **Partially addressed** for crawl **throughput** on refused URLs (upstream). **Unresolved** for root cause of challenges / signature acceptance and **re-save** before signed production crawls.                                                                                                                          |
| **Evidence**                             | `git diff v0.1.19..HEAD` audit lib (+1.7k lines); `discovery.crawlerAccess.test.ts`, `crawl-throttle.test.ts`, `site-audit-workflow-helpers.test.ts` (rate-limit fetch count 4→2). Handover `RESUME-AUDIT-DEBUGGING.md`.                                                                                                  |
| **Remaining verification**               | After deploy: signed Shopify audit on store with **re-saved** credential; confirm timeline shows diagnostics + refused URLs do not abort whole audit; compare to pre-upgrade behavior. No secret rotation in this PR.                                                                                                     |

---

## 2. Initial-HTML fallback and optional rendering

|                            |                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Original problem (AJP)** | When JS render fails (Filtrex block, provider error), audits should keep **readable direct-fetch HTML** and log **actionable** render diagnostics.                                                                                                                                                            |
| **Upstream**               | v0.1.16 **#1071** (`39a9fc31`): dashboard scan without renderer when none configured. v0.1.19 **#1085** (`689964bf`): rendered audits **>1,000 pages** within one credit hold (`renderHold`).                                                                                                                 |
| **Custom code in PR**      | `rendered-page.ts`: Filtrex path detection, `site_audit:render` structured outcomes, safe-parse provider JSON. `site-audit-workflow-helpers.ts`: **preserve HTML** when render throws after readable fetch (`renderingFailed`). Fork retained vs upstream tag (`git diff v0.1.19..HEAD -- rendered-page.ts`). |
| **Relation to upstream**   | **Supplements** upstream render hold and provider order (Cloudflare → Context); **overrides** upstream “drop on render failure” for pages that already had usable HTML.                                                                                                                                       |
| **Fix status**             | **Partially addressed** — fallback behavior preserved/enhanced; **not demonstrated** on live Shopify/Filtrex in this integration pass.                                                                                                                                                                        |
| **Evidence**               | `rendered-page.test.ts`, `site-audit-workflow-rendering.test.ts`, `site-audit-workflow-helpers.test.ts`.                                                                                                                                                                                                      |
| **Remaining verification** | Post-deploy: small JS-on audit on a page known to render; force render failure (or use store with intermittent block) and confirm page row keeps initial HTML + `renderingFailed` in timeline.                                                                                                                |

---

## 3. Rank-check retries, progress, cost estimates, warning banners

|                            |                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Original problem (AJP)** | Oct 2026 run: progress stuck at **85/85** during long **queued retries**; **$5.40** estimate misleading on self-host (hosted markup, worst-case retries); **RankRunAlerts** “provider errors” on **unconfirmed misses**; no per-run provider cost ledger (`FINDINGS.md`).                                                                             |
| **Upstream (v0.1.15–19)**  | **#1061** (`d872fb7d`): manual checks **retry never-ranked** keywords (`rankCheckRetries.ts` `recheckMiss` + `trigger === "manual"`). **No** changes to `RankTrackingTableToolbar`, `RankRunAlerts`, or `shared/rank-tracking.ts` cost formulas between v0.1.14 and v0.1.19 (`git diff v0.1.14..v0.1.19 -- src/client/features/rank-tracking` empty). |
| **Custom code in PR**      | **None** on rank UI/cost (inherits v0.1.19). Fork does not reintroduce v0.1.14-only rank paths.                                                                                                                                                                                                                                                       |
| **Relation to upstream**   | **Duplicate** upstream retry logic; Oct findings remain **upstream product gaps**, not fork regressions.                                                                                                                                                                                                                                              |
| **Fix status**             | **Partially addressed** — manual never-ranked retries may help staff re-checks; progress label, self-host cost display, alert copy, billing ledger **still unresolved**.                                                                                                                                                                              |
| **Evidence**               | `rankCheckPaths.test.ts` manual never-ranked cases; handover `rank-check-2026-10-20/FINDINGS.md`; file-level diff vs `8713d753` on rank workflow was already empty at v0.1.14 deploy.                                                                                                                                                                 |
| **Remaining verification** | After deploy: manual check on tracker with a never-ranked keyword — confirm retry rounds in workflow logs. **Do not** treat UI estimate as invoice; optional reconciled run vs DataForSEO dashboard (paid).                                                                                                                                           |

---

## 4. DataForSEO-only AI setup, Prompt Research, Prompt Explorer

|                            |                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Original problem (AJP)** | Self-host uses **DataForSEO** for collection/research; **no OpenRouter** key. Must support **manual** topics/prompts and prompt research **without** model-based relevance filtering.                                                                                                                                             |
| **Upstream**               | v0.1.18 **#1074** (`4d590b4d`): `OpenRouterKeyGate` on `/ai-visibility` and `/prompt-explorer` (blocks before `AiResearchSetupGate`). `aiPromptResearch.ts` on tag calls `requireOpenRouterAccess()`.                                                                                                                             |
| **Custom code in PR**      | **Server:** `aiResearchKeywords.ts` `manual` + `generationAvailable`; `aiPromptResearchFallback.ts` + branch in `aiPromptResearch.ts`; tests in `aiResearchKeywords.test.ts`. **Client:** `TrackerPromptFields` disables Generate when `!generationAvailable`; **`bypassOpenRouterKeyGate`** + `OpenRouterKeyGate.tsx` (this PR). |
| **Relation to upstream**   | Server paths **override** upstream OpenRouter requirement for self-host. Gate fix **overrides** v0.1.18 UI block when generation unavailable; still **supplements** upstream gate when key is expected.                                                                                                                           |
| **Fix status**             | **Demonstrated fixed** (server) via Vitest. **UI gate regression** from v0.1.18 **fixed in this PR** via policy + tests; **live UI** on production still needs smoke (see checklist).                                                                                                                                             |
| **Evidence**               | `openRouterKeyGateAccess.test.ts` (5 cases); `aiResearchKeywords.test.ts` manual self-host; `git diff v0.1.19..HEAD` on `aiPromptResearch.ts`. Local `pnpm dev` without `.env` still defaults to `cloudflare_access` — not a valid OpenRouter gate preview; use deployed self-host or `AUTH_MODE=local_noauth` in worker env.     |
| **Remaining verification** | On **production-like** self-host **without** `OPENROUTER_API_KEY`: open AI Visibility (manual setup), **Prompt Research** tab, **Prompt Explorer** — must **not** show “Add an OpenRouter API key”; Generate stays disabled; research runs use DataForSEO only.                                                                   |

---

## OpenRouterKeyGate investigation (2026-10-27)

| Check                 | Result                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Upstream v0.1.19 gate | Identical to v0.1.18; blocks all child routes including `/ai-visibility/research`.                                   |
| Server without key    | `getAiResearchSetup` → `status: "manual"`, `generationAvailable: false` (tests).                                     |
| PR before gate fix    | **Regression**: staff DataForSEO-only UI unreachable despite server support.                                         |
| PR after gate fix     | `bypassOpenRouterKeyGate` when `generationAvailable === false` on self-host.                                         |

### Browser verification (isolated local, 2026-10-27)

Environment: `.env.local` with `AUTH_MODE=local_noauth`, `PORT=3020`, **no** `OPENROUTER_API_KEY` or `DATAFORSEO_API_KEY`; `pnpm db:migrate:local` → Wrangler local D1 only (no production bindings). Project `example.com` set on local `projects` row so `ProjectWebsiteGate` passes.

| Route | Result |
| ----- | ------ |
| `/p/…/ai-visibility` | **Pass** — heading “Prompt Tracking”, “Add prompts”; **no** “Add an OpenRouter API key”. |
| `/p/…/ai-visibility/research` | **Pass** — heading “Prompt Research”; **no** OpenRouter gate. |
| `/p/…/prompt-explorer` | **Pass** — Prompt Explorer nav active; **no** OpenRouter gate. |
| `/ai` (Agent setup) | **Pass** — MCP setup page loads (SAM/OpenRouter is separate from AI visibility gate). |

Separate **DataForSEO** onboarding modal may overlay the UI; it is unrelated to OpenRouter. No paid provider searches were submitted.

Earlier attempt without `AUTH_MODE=local_noauth` failed with `AUTH_CONFIG_MISSING` (default `cloudflare_access`).

---

## Acceptance checklist (post-merge, pre–go-live)

### Free / local

- [x] `openRouterKeyGateAccess.test.ts` + `aiResearchKeywords.test.ts` (manual self-host) — **1852** Vitest total @ PR tip
- [ ] `pnpm ci:check` full on droplet (this machine OOM-killed `tsc`/`ci:check` during oxlint pass; re-run on 8GB+ host before deploy)
- [ ] Confirm Worker build `AUTH_MODE=cloudflare_access`; no `OPENROUTER_API_KEY` in prod bindings if policy unchanged

### Live (staff; incur provider cost only where noted)

- [ ] **AI Visibility** without OpenRouter: tracking + manual prompts load; no OpenRouter gate card
- [ ] **Prompt Research**: one keyword search (DataForSEO **paid**)
- [ ] **Prompt Explorer**: query loads (DataForSEO **paid** if run)
- [ ] **Rank check**: manual run on small tracker — observe workflow retries in CF dashboard; do not use UI $ estimate as bill
- [ ] **Shopify audit**: only after signature re-save approved — small page cap, JS on/off per staff workflow

**Not in scope without approval:** merge, D1 migrate, Worker cutover, paid full-depth rank check, production deploy.
