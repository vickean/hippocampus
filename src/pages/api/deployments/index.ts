import type { APIRoute } from 'astro';
import { getDb } from '../../../../worker/db';
import { deployments } from '../../../../worker/schema';
import { DeploymentCreateSchema, DeploymentListQuerySchema } from '~/lib/deployment';
import { isAuthorized, rejectCors } from '~/lib/auth';
import { eq, like } from 'drizzle-orm';

function getEnv(ctx: any) {
  return ctx.locals.runtime.env as { DB: D1Database; HIPPOCAMPUS_API_TOKEN: string; ALLOWED_ORIGIN?: string };
}

export const GET: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  if (!(await isAuthorized(ctx.request, { expectedToken: env.HIPPOCAMPUS_API_TOKEN }))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const url = new URL(ctx.request.url);
  const parsed = DeploymentListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid query', details: parsed.error.issues }), { status: 400 });
  }

  const db = getDb(env.DB);
  let q = db.select().from(deployments).$dynamic();
  const filters = parsed.data;
  if (filters.type) q = q.where(eq(deployments.type, filters.type));
  if (filters.environment) q = q.where(eq(deployments.environment, filters.environment));
  if (filters.status) q = q.where(eq(deployments.status, filters.status));
  if (filters.q) q = q.where(like(deployments.name, `%${filters.q}%`));
  q = q.orderBy(deployments.name);
  const rows = await q.all();
  return new Response(JSON.stringify({ deployments: rows }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async (ctx) => {
  const env = getEnv(ctx);
  if (env.ALLOWED_ORIGIN && rejectCors(ctx.request, env.ALLOWED_ORIGIN)) {
    return new Response(JSON.stringify({ error: 'forbidden origin' }), { status: 403 });
  }
  if (!(await isAuthorized(ctx.request, { expectedToken: env.HIPPOCAMPUS_API_TOKEN }))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const body = await ctx.request.json().catch(() => ({}));
  const parsed = DeploymentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid payload', details: parsed.error.issues }), { status: 400 });
  }

  const db = getDb(env.DB);
  const inserted = await db
    .insert(deployments)
    .values({
      ...parsed.data,
      tags: parsed.data.tags ? JSON.stringify(parsed.data.tags) : null,
      status: parsed.data.status ?? 'unknown',
    } as any)
    .returning();
  return new Response(JSON.stringify(inserted[0]), { status: 201 });
};