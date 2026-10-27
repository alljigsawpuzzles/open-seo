# Integrate upstream OpenSEO v0.1.15–v0.1.19 on the self-host fork

## TL;DR

Merge upstream **v0.1.19** onto fork baseline **v0.1.14** (`ff093c2f`), preserving Cloudflare Access production auth, crawler diagnostics, DataForSEO-only AI paths, and the deliberate skip of migration **0055**.

**Compatibility:** [`docs/maintainers/ajp-v0.1.19-compatibility.md`](docs/maintainers/ajp-v0.1.19-compatibility.md)

**Gate fix:** upstream v0.1.18 `OpenRouterKeyGate` blocked DataForSEO-only staff UI; bypass when `generationAvailable === false`.

**Verified @ PR tip** (see below). **Not merged or deployed.**

**Follow-up (out of scope for this PR):** Shopify signature/challenge crawl reliability; rank-check progress/cost/alert UX (Oct 2026 findings).

## Verification (2026-10-27)

| Check                              | Result                                                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest                             | **1852** passed (266 files), incl. gate policy + manual AI setup                                                                                          |
| Browser (local)                    | `AUTH_MODE=local_noauth`, local D1, no OpenRouter/DataForSEO keys — AI Visibility, Prompt Research, Prompt Explorer reachable **without** OpenRouter gate |
| `pnpm ci:check`                    | Re-run on **droplet** before deploy (OOM on 8GB agent host during this pass)                                                                              |
| Selfhost build + Wrangler dry-runs | Refresh on droplet @ merged SHA after merge (last full pass @ `c5776f55`; gate fix is small)                                                              |

## What should happen?

- Merge after Geoff approves rollout doc and migration allowlist (**0060–0062** only).
- Production stays `AUTH_MODE=cloudflare_access`.
- Post-deploy smoke: staff AI paths without OpenRouter (no gate card).

## Test plan

- [x] Read compatibility doc
- [x] OpenRouter gate — unit + browser (local_noauth)
- [ ] `pnpm ci:check` on droplet @ final SHA
- [ ] Selfhost build + dry-runs on droplet
- [ ] Approve `ajp-v0.1.19-rollout.md` before D1/Workers

## Rollout

`docs/maintainers/ajp-v0.1.19-rollout.md`
