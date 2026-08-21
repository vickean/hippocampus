import type { Config } from 'drizzle-kit';

export default {
  schema: './worker/schema.ts',
  out: './worker/migrations',
  dialect: 'sqlite',
} satisfies Config;