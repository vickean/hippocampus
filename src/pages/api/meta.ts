import type { APIRoute } from 'astro';
import { listMeta } from '~/lib/deployment';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(listMeta()), {
    headers: { 'Content-Type': 'application/json' },
  });
};