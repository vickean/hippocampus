# Hippocampus runbook

Operator's reference for the hippocampus deployment inventory app. Live at **https://hippocampus.novovecta.com**.

---

## Start / stop / restart

### Local dev
```bash
pnpm dev               # astro on http://localhost:4321
```

### Production
Cloudflare Pages handles deploy + scaling automatically. No "start" step needed.

### Cron Worker (D1 → R2 backup)
Deployed via `wrangler deploy --config cron/wrangler.toml` or automatically via the GitHub Action on push to `master` with changes in `cron/**`.

---

## Setup (fresh deploy)

```bash
# 1. Clone + install
git clone git@github.com:vickean/hippocampus.git
cd hippocampus
pnpm install
pnpm approve-builds    # one-time per clone (pnpm 11+)

# 2. Create D1 database
pnpm exec wrangler d1 create hippocampus-db
# → paste the database_id into wrangler.toml AND cron/wrangler.toml

# 3. Apply migrations locally + remotely
pnpm exec wrangler d1 migrations apply hippocampus-db --local
pnpm exec wrangler d1 migrations apply hippocampus-db --remote

# 4. Create R2 bucket + 90-day lifecycle
pnpm exec wrangler r2 bucket create hippocampus-backups
pnpm exec wrangler r2 bucket lifecycle put hippocampus-backups \
  --rules='[{"id":"expire","enabled":true,"conditions":{"max_age":90}}]'

# 5. Set bearer token secret (random)
openssl rand -base64 32 | tr -d '\n'
pnpm exec wrangler secret put HIPPOCAMPUS_API_TOKEN   # paste token
pnpm exec wrangler secret put HIPPOCAMPUS_API_TOKEN --config cron/wrangler.toml  # same token, cron Worker scope

# 6. Set Cloudflare Access email ACL (dashboard)
#    Zero Trust → Access → Applications → Add
#    Name: Hippocampus
#    Domain: hippocampus.novovecta.com
#    Policies: Allow your email + collaborators' emails

# 7. Build + deploy Pages
pnpm build
pnpm exec wrangler pages deploy ./dist --project-name hippocampus

# 8. Deploy cron Worker
pnpm exec wrangler deploy --config cron/wrangler.toml

# 9. Add custom domain (dashboard)
#    Workers & Pages → hippocampus → Custom domains → hippocampus.novovecta.com
#    (Requires CNAME delegation from novovecta.com to <project>.pages.dev)

# 10. Add GitHub repo secret for GH Action
#     Settings → Secrets and variables → Actions → New repository secret
#     CLOUDFLARE_API_TOKEN: from https://dash.cloudflare.com/profile/api-tokens
#       (template: Edit Cloudflare Workers)
```

---

## Backup

- **Schedule:** daily 03:00 UTC via cron Worker
- **Location:** Cloudflare R2 bucket `hippocampus-backups`, path `hippocampus/{YYYY-MM-DD}/dump-{timestamp}.sql`
- **Retention:** 90 days (lifecycle rule on the bucket)
- **Manual trigger:**
  - Dashboard → Workers & Pages → hippocampus-cron → Logs → Trigger
  - OR locally: `wrangler dev --config cron/wrangler.toml` then in another shell `wrangler trigger`
- **Verify last backup:**
  ```bash
  pnpm exec wrangler r2 object list hippocampus-backups | sort | tail -5
  ```

## Restore

```bash
# 1. Find latest dump
pnpm exec wrangler r2 object list hippocampus-backups | sort | tail -3

# 2. Download
pnpm exec wrangler r2 object get hippocampus-backups/hippocampus/<date>/dump-<ts>.sql --file=/tmp/dump.sql

# 3. Create fresh DB
pnpm exec wrangler d1 create hippocampus-db-restored
# Update DCR_ID in a new wrangler.toml or use --database-id flag

# 4. Apply schema
pnpm exec wrangler d1 migrations apply hippocampus-db-restored --remote

# 5. Load data
cat /tmp/dump.sql | pnpm exec wrangler d1 execute hippocampus-db-restored --remote --file=-

# 6. Verify
pnpm exec wrangler d1 execute hippocampus-db-restored --remote \
  --command='SELECT COUNT(*) AS rows, COUNT(encrypted_secrets) AS secrets FROM deployments'

# 7. Test secret decrypt
# Use the browser UI: open the restored URL with credentials, navigate to a deployment
# with encrypted_secrets, unlock with your recovery key.
```

---

## Credentials policy

**Never** put passwords, API keys, or tokens in `notes` or `access_command`.

Use one of:
- **`encrypted_secrets`** field — client-side envelope encryption, server never sees plaintext
- **Pointer to your secret manager** in the `notes` field

Reference patterns:
```
"see 1Password: Servers/UBS Win10 RDP"
"see ~/.password-store/ubs-win10.gpg"
"HIPPOCAMPUS_API_TOKEN in ocr-cat/.env.docker"
"ssh key at ~/.ssh/ubs_win10_key (passphrase in 1Password)"
```

The encryption envelope is zero-knowledge:
- Server (Cloudflare, anyone with D1 access, anyone with API token) sees only ciphertext
- Decryption key never leaves your browser
- Recovery key shown once at first secret save — without it, encrypted secrets are unrecoverable

---

## Encryption envelope (v1)

Pinned parameters in `src/lib/crypto.ts`:

```ts
V1_PARAMS = {
  version: 1,
  kdf:    { algo: 'PBKDF2', hash: 'SHA-256', iterations: 600_000, saltBytes: 16 },
  cipher: { algo: 'AES-GCM', keyBytes: 32, ivBytes: 12 },
}
```

Forward compatibility: blob's `v` field enables future algorithm migration. On read, if `v < currentVersion`, unwrap with old params and silently re-wrap with current. Migration is invisible.

---

## Auth model

- **Humans (browser):** Cloudflare Access email ACL at the edge. The Pages site is gated; users log in via Cloudflare's email flow.
- **Agents (CLI/curl):** `Authorization: Bearer $HIPPOCAMPUS_API_TOKEN` header. Token validated with `timingSafeEqualString` (constant-time compare, no timing side channel).
- Reads require Access. Writes accept either path.

The bearer token is stored as a Cloudflare Worker secret (`wrangler secret put HIPPOCAMPUS_API_TOKEN`). Never literal in shell history — always use `$HIPPOCAMPUS_API_TOKEN`.

---

## Troubleshooting

### "Wrong passphrase or recovery key"
- Recovery key shown ONCE at first save in `/settings`. If lost, those secrets are permanently unrecoverable.
- Verify passphrase length matches what was set in `/settings`.

### API returns 401
- **Browser:** Check Network tab → verify `cf-access-jwt-assertion` header is present (means Cloudflare Access JWT is set). If missing, session expired — re-login at Cloudflare Access.
- **CLI:** Verify `HIPPOCAMPUS_API_TOKEN` is set in `.env` or shell env. Verify `wrangler secret list` shows it for the Worker.

### Cron Worker logs show "Backup FAILED"
- Check D1 binding in `cron/wrangler.toml` — `database_id` must match the deployed D1
- Check R2 bucket name matches the `BACKUPS` binding
- Re-trigger manually from dashboard → Workers & Pages → hippocampus-cron → Logs → Trigger
- Inspect logs for the actual error message

### Cloudflare Access blocks you
- Verify your email is in the Access policy
- Check session has not expired (default 24h)
- Zero Trust → Access → Logs shows the block reason

### "Cannot find module '~/'"
- Vite alias is configured in `astro.config.mjs`. If you see this, check the file is committed.

### Browser shows 500 on detail/edit page
- Check the D1 binding in Pages Functions: `ctx.locals.runtime.env.DB` must be the deployed `hippocampus-db`
- Verify migrations applied remotely: `wrangler d1 migrations list hippocampus-db --remote`

### `pnpm install` fails with "Cannot approve builds"
- pnpm 11+ requires explicit approval of postinstall scripts. Run once:
  ```bash
  pnpm approve-builds    # or: pnpm approve-builds --all
  ```

### Dev server returns 500
- `pnpm dev` requires `pnpm install` first
- Check astro log for import errors — usually a missing file or wrong path

---

## Local D1 inspection

```bash
# Apply migrations locally (creates .wrangler/state/v3/d1/)
pnpm exec wrangler d1 migrations apply hippocampus-db --local

# Query
pnpm exec wrangler d1 execute hippocampus-db --local --command="SELECT id, name, type FROM deployments"

# From a file
pnpm exec wrangler d1 execute hippocampus-db --local --file=./query.sql
```

---

## Code organization

| Path | Purpose |
|---|---|
| `src/pages/` | Astro routes (frontend + Pages Functions) |
| `src/pages/api/` | Pages Functions = the Worker API |
| `src/components/` | Preact islands (interactive UI) |
| `src/lib/` | Shared client+server utilities (crypto, api client, types, schemas) |
| `src/styles/` | global.css (font-size tokens, layout) |
| `worker/` | Drizzle schema + db helper (shared by API handlers) |
| `worker/migrations/` | Drizzle-generated SQL migrations |
| `cron/` | Separate cron Worker for D1 → R2 daily backups |
| `scripts/hippo.sh` | CLI helper for agents |
| `test/` | Vitest tests |

---

## Related docs

- **Spec** (design, enums, schema, auth model): `docs/superpowers/specs/2026-08-21-hippocampus-deploy-design.md` in the ocr-cat repo
- **Plan** (19-task implementation plan): `docs/superpowers/plans/2026-08-21-hippocampus-deploy.md` in the ocr-cat repo
- **Handover** (session-close notes): `docs/superpowers/handover/2026-08-21-hippocampus-deploy-handover.md` in the ocr-cat repo
- **Master TODO row** (project tracking): §30.24 in `docs/superpowers/handover/2026-06-28-master-todo.md` in the ocr-cat repo