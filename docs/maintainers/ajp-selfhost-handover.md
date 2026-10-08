# AJP self-hosted OpenSEO handover

This checkout is AJP's fork of OpenSEO. `origin` is
`alljigsawpuzzles/open-seo`; `upstream` is `every-app/open-seo`.

## Deployment

OpenSEO is deployed from the `selfhost` Alchemy stage to:

- App: `https://open-seo-selfhost.geoff-038.workers.dev`
- MCP endpoint: `https://open-seo-selfhost.geoff-038.workers.dev/mcp`
- Cloudflare account: `038f8876db2bd0a07a8b343d5e38d29d`
- Workers subdomain: `geoff-038.workers.dev`
- Zero Trust team: `late-unit-a3c5.cloudflareaccess.com`

Cloudflare Access protects the app and MCP endpoint. The current allow policy
contains only `geoff@alljigsawpuzzles.co.uk`. The Access application is
`open-seo selfhost` (`afe193f0-1c9d-42c3-94a5-a10ccb4b6b9e`), with policy
`0c95f8e2-d71d-445d-b956-7678c20d73d5`. Managed OAuth is enabled.

Alchemy state is stored in the account-level `alchemy-state-store` Worker. Do
not remove it while this deployment is in use.

## Resources

| Resource     | Identifier                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------- |
| App Worker   | `open-seo-selfhost`                                                                               |
| Audit Worker | `open-seo-selfhost-audit`                                                                         |
| D1           | `open-seo-db-selfhost` — `15a32f87-b31d-43c7-b9fb-5c1b66c9a128`                                   |
| R2           | `open-seo-r2-selfhost`                                                                            |
| KV           | `open-seo-kv-selfhost` — `17ed2448ab834072b1de964cb51b887f`                                       |
| OAuth KV     | `open-seo-oauth-kv-selfhost` — `622ec7ddae72489e8c28954ca0a1f9ca`                                 |
| Workflows    | `site-audit-workflow-selfhost`, `rank-check-workflow-selfhost`, `ai-visibility-workflow-selfhost` |

## Credentials and integrations

Secrets belong in the Git-ignored, owner-only `.env.selfhost` file. It holds
the DataForSEO credential, the Access email allowlist, Google OAuth client
settings, and `BETTER_AUTH_SECRET`. Local development uses the similarly
ignored `.env.local`. Alchemy OAuth and state-store credentials live under
`~/.alchemy/`; neither directory nor its backups/logs belong in Git.

Google Search Console and GA4 share one Google OAuth web client. In Google
Cloud, configure these exact redirect URIs:

- `https://open-seo-selfhost.geoff-038.workers.dev/api/gsc/oauth/callback`
- `https://open-seo-selfhost.geoff-038.workers.dev/api/ga4/oauth/callback`

The OAuth consent screen remains in **Testing**. Google issues refresh tokens
that expire after seven days for an external app in Testing when it requests
these API scopes. Add every connecting Google account as a test user and expect
to reconnect weekly until the consent screen is moved out of Testing. See
[Google's refresh-token policy](https://developers.google.com/identity/protocols/oauth2#expiration).

Cloudflare Access Managed OAuth is enabled for MCP. Its dashboard-managed
callback allowlist includes ChatGPT; retain it when editing the Access
application. Add loopback callbacks for local agent clients or HTTPS callbacks
for other connectors as needed. ChatGPT project listing has been confirmed to
work.

## Operations

To add a browser user, add their address to `ACCESS_ALLOWED_EMAILS` in
`.env.selfhost`, then redeploy:

```sh
source ~/.nvm/nvm.sh
nvm use
pnpm deploy:selfhost --yes
```

The deployment reconciles the Access policy, so dashboard edits to the managed
email policy will be overwritten. Before deployment, source NVM so the project
uses Node 24.21.0 and Corepack's pnpm 10.30.1.

To take upstream changes while retaining AJP setup changes, work on a branch,
then merge upstream's main branch into AJP main and deploy after review:

```sh
git fetch upstream
git switch main
git merge upstream/main
pnpm install --frozen-lockfile
pnpm deploy:selfhost --yes
git push origin main
```

Resolve conflicts in AJP-specific documentation or setup before deploying. Do
not commit `.env*`, `.alchemy/`, `.logs/`, `dist/`, `.wrangler/`, or OAuth
credential files.

## Validation status

Confirmed working:

- Browser login through Cloudflare Access.
- ChatGPT project listing through MCP.
- GSC and GA4 dashboard data.
- An initial 50-page site audit.

Still to test:

- Codex MCP access.
- AI write actions.
- Rank tracking.
