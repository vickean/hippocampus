const subtle = globalThis.crypto.subtle;

export const V1_PARAMS = {
  version: 1,
  kdf: { algo: 'PBKDF2', hash: 'SHA-256', iterations: 600_000, saltBytes: 16 },
  cipher: { algo: 'AES-GCM', keyBytes: 32, ivBytes: 12 },
} as const;

export interface EncryptedSecretsBlob {
  v: number;
  salt: string;
  wrapped_dek_pass: string;
  wrapped_dek_rec: string;
  iv: string;
  ct: string;
}

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBuf(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

export function generateRecoveryKey(): string {
  const bytes = randomBytes(32);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function deriveKek(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: V1_PARAMS.kdf.hash,
      salt: salt as BufferSource,
      iterations: V1_PARAMS.kdf.iterations,
    },
    baseKey,
    { name: V1_PARAMS.cipher.algo, length: V1_PARAMS.cipher.keyBytes * 8 },
    false,
    ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']
  );
}

export async function generateDek(): Promise<CryptoKey> {
  return subtle.generateKey(
    { name: V1_PARAMS.cipher.algo, length: V1_PARAMS.cipher.keyBytes * 8 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<ArrayBuffer> {
  const iv = randomBytes(V1_PARAMS.cipher.ivBytes);
  const wrapped = await subtle.wrapKey('raw', dek, kek, { name: V1_PARAMS.cipher.algo, iv: iv as BufferSource });
  const result = new Uint8Array(iv.byteLength + wrapped.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(wrapped), iv.byteLength);
  return result.buffer;
}

export async function unwrapDek(wrapped: ArrayBuffer, kek: CryptoKey): Promise<CryptoKey> {
  const all = new Uint8Array(wrapped);
  const iv = all.slice(0, V1_PARAMS.cipher.ivBytes);
  const ciphertext = all.slice(V1_PARAMS.cipher.ivBytes);
  return subtle.unwrapKey(
    'raw',
    ciphertext,
    kek,
    { name: V1_PARAMS.cipher.algo, iv },
    { name: V1_PARAMS.cipher.algo, length: V1_PARAMS.cipher.keyBytes * 8 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function tryUnwrap(
  blob: EncryptedSecretsBlob,
  passphraseOrRecoveryKey: string,
  wrappedKeyB64: string
): Promise<CryptoKey> {
  const salt = b64ToBuf(blob.salt);
  const kek = await deriveKek(passphraseOrRecoveryKey, salt);
  const wrapped = b64ToBuf(wrappedKeyB64);
  const iv = wrapped.slice(0, V1_PARAMS.cipher.ivBytes);
  const ciphertext = wrapped.slice(V1_PARAMS.cipher.ivBytes);
  return subtle.unwrapKey(
    'raw',
    ciphertext,
    kek,
    { name: V1_PARAMS.cipher.algo, iv },
    { name: V1_PARAMS.cipher.algo, length: V1_PARAMS.cipher.keyBytes * 8 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptSecrets(
  plaintext: string,
  passphrase: string,
  recoveryKey: string
): Promise<EncryptedSecretsBlob> {
  const salt = randomBytes(V1_PARAMS.kdf.saltBytes);
  const kekPass = await deriveKek(passphrase, salt);
  const kekRec = await deriveKek(recoveryKey, salt);
  const dek = await generateDek();
  const wrappedPass = await wrapDek(dek, kekPass);
  const wrappedRec = await wrapDek(dek, kekRec);
  const iv = randomBytes(V1_PARAMS.cipher.ivBytes);
  const ct = await subtle.encrypt(
    { name: V1_PARAMS.cipher.algo, iv: iv as BufferSource },
    dek,
    new TextEncoder().encode(plaintext)
  );
  return {
    v: V1_PARAMS.version,
    salt: bufToB64(salt),
    wrapped_dek_pass: bufToB64(wrappedPass),
    wrapped_dek_rec: bufToB64(wrappedRec),
    iv: bufToB64(iv),
    ct: bufToB64(ct),
  };
}

export async function decryptSecrets(
  blob: EncryptedSecretsBlob,
  passphraseOrRecoveryKey: string
): Promise<string> {
  if (blob.v !== V1_PARAMS.version) {
    throw new Error(`Unsupported blob version: ${blob.v}`);
  }
  let dek: CryptoKey;
  try {
    dek = await tryUnwrap(blob, passphraseOrRecoveryKey, blob.wrapped_dek_pass);
  } catch {
    dek = await tryUnwrap(blob, passphraseOrRecoveryKey, blob.wrapped_dek_rec);
  }
  const ct = b64ToBuf(blob.ct);
  const iv = b64ToBuf(blob.iv);
  const pt = await subtle.decrypt({ name: V1_PARAMS.cipher.algo, iv: iv as BufferSource }, dek, ct as BufferSource);
  return new TextDecoder().decode(pt);
}

export function encryptBlobToString(blob: EncryptedSecretsBlob): string {
  return JSON.stringify(blob);
}

export function decryptBlobFromString(s: string): EncryptedSecretsBlob {
  return JSON.parse(s) as EncryptedSecretsBlob;
}