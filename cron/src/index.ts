export interface Env {
  DB: D1Database;
  BACKUPS: R2Bucket;
}

const EXPORT_COLUMNS = [
  'name', 'type', 'environment', 'purpose', 'host', 'public_url',
  'access_command', 'software_version', 'status', 'last_verified_at',
  'notes', 'tags', 'encrypted_secrets', 'created_at', 'updated_at',
];

function ts(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sqlEscape(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function toInsert(row: Record<string, unknown>): string {
  const cols = EXPORT_COLUMNS.map((c) => `"${c}"`).join(', ');
  const vals = EXPORT_COLUMNS.map((c) => sqlEscape(row[c])).join(', ');
  return `INSERT INTO deployments (${cols}) VALUES (${vals});`;
}

function toSqlDump(rows: Record<string, unknown>[]): string {
  const header = `-- Hippocampus D1 dump\n-- Generated: ${new Date().toISOString()}\nBEGIN TRANSACTION;\n`;
  const body = rows.map(toInsert).join('\n');
  return `${header}${body}\nCOMMIT;\n`;
}

export default {
  async scheduled(_event: Event, env: Env, ctx: ExecutionContext): Promise<void> {
    const start = Date.now();
    const date = new Date().toISOString().slice(0, 10);
    const stamp = ts();
    const key = `hippocampus/${date}/dump-${stamp}.sql`;
    try {
      const { results } = await env.DB.prepare(
        `SELECT ${EXPORT_COLUMNS.join(', ')} FROM deployments`
      ).all();
      const dump = toSqlDump(results as Record<string, unknown>[]);
      await env.BACKUPS.put(key, dump, { httpMetadata: { contentType: 'application/sql' } });
      const duration = Date.now() - start;
      console.log(`Backup OK: ${key} (${(results as unknown[]).length} rows, ${dump.length} bytes, ${duration}ms)`);
    } catch (err) {
      console.error(`Backup FAILED: ${key}`, err);
      throw err;
    }
    ctx.waitUntil(Promise.resolve());
  },
};