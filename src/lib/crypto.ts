import { webcrypto as crypto } from 'node:crypto';

const subtle = crypto.subtle;

export const V1_PARAMS = {
  version: 1,
  pbkdf2Algorithm: 'PBKDF2',
  pbkdf2Hash: 'SHA-256',
  pbkdf2Iterations: 600000,
  saltBytes: 16,
  aesAlgorithm: 'AES-GCM',
  keyBytes: 32,
  ivBytes: 12,
} as const;

export interface EncryptedSecretsBlob {
  v: number;
  salt: string;
  wrapped_dek_pass: string;
  wrapped_dek_rec: string;
  iv: string;
  ct: string;
}

function toBase64(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString('base64');
}

function fromBase64(base64: string): ArrayBuffer {
  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function randomBytes(n: number): ArrayBuffer {
  const buffer = new Uint8Array(n);
  crypto.getRandomValues(buffer);
  return buffer.buffer;
}

export function generateRecoveryKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function deriveKek(
  passphrase: string,
  salt: ArrayBuffer
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: V1_PARAMS.pbkdf2Iterations,
      hash: V1_PARAMS.pbkdf2Hash,
    },
    keyMaterial,
    { name: V1_PARAMS.aesAlgorithm, length: V1_PARAMS.keyBytes * 8 },
    true,
    ['wrapKey', 'unwrapKey']
  );
}

export async function generateDek(): Promise<CryptoKey> {
  return subtle.generateKey(
    { name: V1_PARAMS.aesAlgorithm, length: V1_PARAMS.keyBytes * 8 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function wrapDek(
  dek: CryptoKey,
  kek: CryptoKey
): Promise<ArrayBuffer> {
  const iv = randomBytes(V1_PARAMS.ivBytes);
  const wrappedKey = await subtle.wrapKey('raw', dek, kek, {
    name: V1_PARAMS.aesAlgorithm,
    iv: new Uint8Array(iv),
  });

  const result = new Uint8Array(iv.byteLength + wrappedKey.byteLength);
  result.set(new Uint8Array(iv), 0);
  result.set(new Uint8Array(wrappedKey), iv.byteLength);
  return result.buffer;
}

export async function unwrapDek(
  wrapped: ArrayBuffer,
  kek: CryptoKey
): Promise<CryptoKey> {
  const wrappedArray = new Uint8Array(wrapped);
  const iv = wrappedArray.slice(0, V1_PARAMS.ivBytes);
  const encryptedKey = wrappedArray.slice(V1_PARAMS.ivBytes);

  return subtle.unwrapKey(
    'raw',
    encryptedKey,
    kek,
    { name: V1_PARAMS.aesAlgorithm, iv },
    { name: V1_PARAMS.aesAlgorithm, length: V1_PARAMS.keyBytes * 8 },
    true,
    ['encrypt', 'decrypt']
  );
}

async function tryBoth(
  blob: EncryptedSecretsBlob,
  passphraseOrRecoveryKey: string,
  attempt: 'pass' | 'rec'
): Promise<string> {
  const salt = fromBase64(blob.salt);
  const iv = fromBase64(blob.iv);
  const ciphertext = fromBase64(blob.ct);

  let wrappedDek: string;
  if (attempt === 'pass') {
    wrappedDek = blob.wrapped_dek_pass;
  } else {
    wrappedDek = blob.wrapped_dek_rec;
  }

  const kek = await deriveKek(passphraseOrRecoveryKey, salt);
  const dek = await unwrapDek(fromBase64(wrappedDek), kek);

  const decrypted = await subtle.decrypt(
    { name: V1_PARAMS.aesAlgorithm, iv: new Uint8Array(iv) },
    dek,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

export async function encryptSecrets(
  plaintext: string,
  passphrase: string,
  recoveryKey: string
): Promise<EncryptedSecretsBlob> {
  const salt = randomBytes(V1_PARAMS.saltBytes);
  const encoder = new TextEncoder();
  const plaintextBuffer = encoder.encode(plaintext);

  const kekPass = await deriveKek(passphrase, salt);
  const kekRec = await deriveKek(recoveryKey, salt);

  const dek = await generateDek();

  const wrappedDekPass = await wrapDek(dek, kekPass);
  const wrappedDekRec = await wrapDek(dek, kekRec);

  const iv = randomBytes(V1_PARAMS.ivBytes);
  const ciphertext = await subtle.encrypt(
    { name: V1_PARAMS.aesAlgorithm, iv: new Uint8Array(iv) },
    dek,
    plaintextBuffer
  );

  return {
    v: V1_PARAMS.version,
    salt: toBase64(salt),
    wrapped_dek_pass: toBase64(wrappedDekPass),
    wrapped_dek_rec: toBase64(wrappedDekRec),
    iv: toBase64(iv),
    ct: toBase64(ciphertext),
  };
}

export async function decryptSecrets(
  blob: EncryptedSecretsBlob,
  passphraseOrRecoveryKey: string
): Promise<string> {
  try {
    return await tryBoth(blob, passphraseOrRecoveryKey, 'pass');
  } catch {
    return await tryBoth(blob, passphraseOrRecoveryKey, 'rec');
  }
}

export function encryptBlobToString(blob: EncryptedSecretsBlob): string {
  return Buffer.from(JSON.stringify(blob)).toString('base64');
}

export function decryptBlobFromString(s: string): EncryptedSecretsBlob {
  return JSON.parse(Buffer.from(s, 'base64').toString('utf-8'));
}