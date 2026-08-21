export interface AuthEnv {
  expectedToken: string;
}

const ACCESS_JWT_HEADER = 'cf-access-jwt-assertion';

export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function extractBearer(req: Request): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

export async function isAuthorized(req: Request, env: AuthEnv): Promise<boolean> {
  if (req.headers.get(ACCESS_JWT_HEADER)) return true;

  const token = extractBearer(req);
  if (!token) return false;
  if (!env.expectedToken) return false;
  return timingSafeEqualString(token, env.expectedToken);
}

export function rejectCors(req: Request, allowedOrigin: string): boolean {
  const origin = req.headers.get('Origin');
  if (!origin) return false;
  return origin !== allowedOrigin;
}