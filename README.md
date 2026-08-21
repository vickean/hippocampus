# Hippocampus

Deployment inventory. What is running where, how do I reach it.

- Live: https://hippocampus.novovecta.com
- Spec: `docs/superpowers/specs/2026-08-21-hippocampus-deploy-design.md`
- Runbook: `docs/runbook.md`

## Local development

```bash
pnpm install
pnpm dev                                # astro on http://localhost:4321
wrangler d1 migrations apply hippocampus-db --local
```

## Deploy

```bash
pnpm deploy                             # wrangler pages deploy
```

## Tests

```bash
pnpm test
```
