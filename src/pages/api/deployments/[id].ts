import type { APIRoute } from 'astro';
import { getDb } from '~/../worker/db';
import { deployments } from '~/../worker/schema';
import { DeploymentUpdateSchema } from '~/lib/deployment';
import { isAuthorized } from '~/lib/auth';
import { eq } from 'drizzle-orm';

function getEnv(ctx: any) {
  return ctx.locals.runtime.env as { DB: D1Database; HIPPOCAMPUS_API_TOKEN: string };
}

function parseId(ctx: any): number | null {
  const n = parseInt(ctx.params.id, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const GET: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  if (!(await isAuthorized(ctx.request, { expectedToken: env.HIPPOCAMPUS_API_TOKEN }))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  const id = parseId(ctx);
  if (!id) return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  const db = getDb(env.DB);
  const row = await db.select().from(deployments).where(eq(deployments.id, id)).get();
  if (!row) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  return new Response(JSON.stringify(row), { headers: { 'Content-Type': 'application/json' } });
};

export const PATCH: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  if (!(await isAuthorized(ctx.request, { expectedToken: env.HIPPOCAMPUS_API_TOKEN }))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  const id = parseId(ctx);
  if (!id) return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  const body = await ctx.request.json().catch(() => ({}));
  const parsed = DeploymentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid payload', details: parsed.error.issues }), { status: 400 });
  }
  const db = getDb(env.DB);
  const update: Record<string, unknown> = { ...parsed.data, updatedAt: new Date().toISOString() };
  if (update.tags && Array.isArray(update.tags)) update.tags = JSON.stringify(update.tags);
  const updated = await db
    .update(deployments)
    .set(update as any)
    .where(eq(deployments.id, id))
    .returning();
  if (!updated.length) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  return new Response(JSON.stringify(updated[0]));
};

export const DELETE: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  if (!(await isAuthorized(ctx.request, { expectedToken: env.HIPPOCAMPUS_API_TOKEN }))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  const id = parseId(ctx);
  if (!id) return new Response(JSON.stringify({ error: 'invalid id' }), { status: 400 });
  const db = getDb(env.DB);
  const deleted = await db.delete(deployments).where(eq(deployments.id, id)).returning();
  if (!deleted.length) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
  return new Response(JSON.stringify({ ok: true, deleted: deleted[0].id }));
};