# Agent Rules — Hippocampus

## Context discovery rule

Read `docs/superpowers/handover/2026-08-21-hippocampus-deploy-handover.md` first (or whichever is most recent).
Read `git log --oneline -20` for the most recent commits.
Read `docs/superpowers/specs/2026-08-21-hippocampus-deploy-design.md` for the design.

## Spec-first rule

Specs go in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`,
handovers in `docs/superpowers/handover/`. Match the existing convention.

## .env handling

Same pattern as ocr-cat (see that repo's `scripts/env-backup.sh` /
`scripts/env-check.sh` / `scripts/env-setup.sh`). Tokens NEVER appear in
git-tracked files. Real secrets are set via `wrangler secret put`.

## Font-size tokens (matching ocr-cat)

Use `var(--text-xs / -sm / -base / -md / -lg / -xl / -2xl)`.
CSS lives in `src/styles/global.css`.

## No health check

Hippocampus has no local dev container — it's Cloudflare Pages + Workers.
Skip the curl probes from ocr-cat's AGENTS.md. Local smoke = `pnpm dev`
serving on http://localhost:4321.

## Credentials policy (per spec §Credentials policy)

Never store secrets in `notes` or `access_command`. Use the
`encrypted_secrets` blob (client-side envelope encryption) or reference
a path to your password manager.
