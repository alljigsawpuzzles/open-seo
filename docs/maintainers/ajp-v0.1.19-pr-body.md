# Integrate upstream OpenSEO v0.1.15–v0.1.19 on the self-host fork

## TL;DR

The fork stays on the deployed v0.1.14 baseline while absorbing upstream releases through **v0.1.19**, keeping Cloudflare Access production auth, crawler diagnostics, DataForSEO-only prompt research, and the deliberate skip of migration **0055**.

**Compatibility review (vs upstream tag `v0.1.19`):** [`docs/maintainers/ajp-v0.1.19-compatibility.md`](docs/maintainers/ajp-v0.1.19-compatibility.md) — Shopify crawl, HTML/render fallback, rank-check UX/cost, DataForSEO-only AI.

**Gate fix:** upstream v0.1.18 `OpenRouterKeyGate` blocked staff DataForSEO-only UI; this PR bypasses the gate when `generationAvailable === false` (`openRouterKeyGateAccess.test.ts`).

## What is happening?

Production is on v0.1.14 (`ff093c2f`). Upstream shipped five tagged releases with auth, crawler, AI visibility, MCP, and schema changes. The fork needs those fixes and features without regressing AJP-specific crawl and AI behavior or applying deferred migration 0055.

## What should happen?

- Merge upstream **v0.1.19** (not `main`) with explicit conflict resolution where the fork added diagnostics, Shopify pacing, and OpenRouter-optional prompt research.
- Keep `AUTH_MODE=cloudflare_access` for production; treat password/standalone paths as upstream-only until separately approved.
- Plan production D1 updates for **0060–0062** only (verify live ledger first); never apply 0055 via generic migrate/deploy.
- After merge: droplet validation on branch — `ci:check`, Vitest (incl. gate policy tests), selfhost build, both Worker dry-runs, private migration rehearsal.

## Extra context

- Integration status: `docs/maintainers/ajp-upstream-integration.md`
- Rollout/rollback draft (approval required before prod): `docs/maintainers/ajp-v0.1.19-rollout.md`
- Review focus: `site-audit-workflow-helpers.ts`, `auditPageFetch.ts`, `discovery.ts`, `aiPromptResearch.ts`, `OpenRouterKeyGate.tsx`, auth/MCP files from v0.1.17+
- **Not deployed** with this PR.

## Test plan

- [ ] Read `ajp-v0.1.19-compatibility.md` (four focus areas + acceptance checklist)
- [ ] Review fork-specific crawler and AI visibility merges
- [ ] Confirm auth remains cloudflare_access in selfhost build env
- [ ] Approve migration allowlist (0060–0062, not 0055) against a fresh export
- [ ] After merge: Geoff approves rollout doc before Worker upload or D1 apply
- [ ] Post-deploy smoke: AI visibility / Prompt Research / Explorer **without** OpenRouter key (no gate card)
