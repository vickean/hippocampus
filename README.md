# Hippocampus

Deployment inventory. What is running where, how do I reach it.

- Live: https://hippocampus.novovecta.com
- **Runbook:** [`docs/runbook.md`](docs/runbook.md) — setup, backup, restore, troubleshooting
- Spec: ocr-cat repo → `docs/superpowers/specs/2026-08-21-hippocampus-deploy-design.md`
- Plan: ocr-cat repo → `docs/superpowers/plans/2026-08-21-hippocampus-deploy.md`

## Local development

```bash
pnpm install
pnpm dev                                # astro on http://localhost:4321
wrangler d1 migrations apply hippocampus-db --local
```

## Deploy

```bash
pnpm pages:deploy                       # wrangler pages deploy ./dist
pnpm exec wrangler deploy --config cron/wrangler.toml  # cron Worker
```

## Tests

```bash
pnpm test
```

## Documentation locations

| Doc | Location | Purpose |
|---|---|---|
| Runbook | `docs/runbook.md` in this repo | Operator-facing: setup, backup, restore, troubleshooting |
| Spec | `docs/superpowers/specs/2026-08-21-hippocampus-deploy-design.md` in **ocr-cat** | Design (brainstorming artifact) |
| Plan | `docs/superpowers/plans/2026-08-21-hippocampus-deploy.md` in **ocr-cat** | Implementation plan |
| Handover | `docs/superpowers/handover/2026-08-21-hippocampus-deploy-handover.md` in **ocr-cat** | Session-close notes, post-mortem |
| Master TODO | §30.24 in `docs/superpowers/handover/2026-06-28-master-todo.md` in **ocr-cat** | Project queue |

**Why split:** operational docs (runbook) live with the system they document; design/planning/handover docs live in the meta-project (ocr-cat) where brainstorming happens and the master TODO is maintained.
