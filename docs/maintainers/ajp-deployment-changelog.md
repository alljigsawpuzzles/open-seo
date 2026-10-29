# AJP deployment log (in-app changelog)

Staff see **Settings → Deployment log** (`/settings/changelog`) on self-host builds (not OpenSEO Cloud).

## Source of truth

Edit **`src/shared/ajp-deployment-changelog.ts`** when you deploy or merge upstream.

| Field | Meaning |
| ----- | ------- |
| `version` | Must match `package.json` after the deploy |
| `upstream.sections` | Summaries from [every-app/open-seo releases](https://github.com/every-app/open-seo/releases) we integrated |
| `forkChanges` | Anything AJP-specific (auth, migrations skipped, gate bypass, crawler, public pages, ops) |
| `operations` | D1 allowlist, Worker pairs, schedules — no secrets |
| `openFollowUps` | Known issues **not** fixed by this deploy (keep separate from release bullets) |

The **Personal → About** version label reads `package.json` only. That is the upstream OpenSEO semver we integrated, not a fork-only number.

## Checklist on each production deploy

1. Bump `package.json` to the integrated upstream version (if not already).
2. Prepend a new entry to `AJP_DEPLOYMENT_CHANGELOG` (newest first).
3. Record PR merge commit, migration allowlist, and fork deltas.
4. Copy open follow-ups forward until closed (Shopify signatures, rank UX/cost, etc.).
5. Update `docs/maintainers/ajp-upstream-integration.md` and handover `DEPLOYMENT-v*.md` as today.

## Next integration

**v0.1.20** — assess tag `v0.1.20` on upstream; add a changelog entry only after merge and production deploy.
