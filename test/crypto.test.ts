import { describe, it, expect } from 'vitest';
import {
  V1_PARAMS,
  generateRecoveryKey,
  deriveKek,
  generateDek,
  wrapDek,
  unwrapDek,
  encryptSecrets,
  decryptSecrets,
  encryptBlobToString,
  decryptBlobFromString,
} from '../src/lib/crypto';

describe('crypto', () => {
  it('V1_PARAMS has correct values', () => {
    expect(V1_PARAMS).toEqual({
      version: 1,
      pbkdf2Algorithm: 'PBKDF2',
      pbkdf2Hash: 'SHA-256',
      pbkdf2Iterations: 600000,
      saltBytes: 16,
      aesAlgorithm: 'AES-GCM',
      keyBytes: 32,
      ivBytes: 12,
    });
  });

  it('encrypts and decrypts with passphrase', async () => {
    const plaintext = 'my secret data';
    const passphrase = 'strong-password-123';
    const recoveryKey = generateRecoveryKey();

    const encrypted = await encryptSecrets(plaintext, passphrase, recoveryKey);
    const decrypted = await decryptSecrets(encrypted, passphrase);

    expect(decrypted).toBe(plaintext);
  });

  it('encrypts and decrypts with recovery key', async () => {
    const plaintext = 'my secret data';
    const passphrase = 'strong-password-123';
    const recoveryKey = generateRecoveryKey();

    const encrypted = await encryptSecrets(plaintext, passphrase, recoveryKey);
    const decrypted = await decryptSecrets(encrypted, recoveryKey);

    expect(decrypted).toBe(plaintext);
  });

  it('fails with wrong passphrase', async () => {
    const plaintext = 'my secret data';
    const passphrase = 'strong-password-123';
    const wrongPassphrase = 'wrong-password';
    const recoveryKey = generateRecoveryKey();

    const encrypted = await encryptSecrets(plaintext, passphrase, recoveryKey);

    await expect(decryptSecrets(encrypted, wrongPassphrase)).rejects.toThrow();
  });

  it('encrypts and decrypts plaintext directly', async () => {
    const plaintext = 'sensitive information';
    const passphrase = 'my-passphrase';
    const recoveryKey = generateRecoveryKey();

    const encrypted = await encryptSecrets(plaintext, passphrase, recoveryKey);
    const decrypted = await decryptSecrets(encrypted, passphrase);

    expect(decrypted).toBe(plaintext);
  });

  it('decrypts via recovery key end-to-end', async () => {
    const plaintext = 'another secret';
    const passphrase = 'passphrase';
    const recoveryKey = generateRecoveryKey();

    const encrypted = await encryptSecrets(plaintext, passphrase, recoveryKey);
    const decrypted = await decryptSecrets(encrypted, recoveryKey);

    expect(decrypted).toBe(plaintext);
  });

  it('serializes to and from base64 string', async () => {
    const plaintext = 'serialization test';
    const passphrase = 'pass';
    const recoveryKey = generateRecoveryKey();

    const encrypted = await encryptSecrets(plaintext, passphrase, recoveryKey);
    const serialized = encryptBlobToString(encrypted);
    const deserialized = decryptBlobFromString(serialized);
    const decrypted = await decryptSecrets(deserialized, passphrase);

    expect(decrypted).toBe(plaintext);
  });

  it('fails with wrong passphrase end-to-end', async () => {
    const plaintext = 'final test';
    const passphrase = 'correct';
    const wrongPassphrase = 'incorrect';
    const recoveryKey = generateRecoveryKey();

    const encrypted = await encryptSecrets(plaintext, passphrase, recoveryKey);
    const serialized = encryptBlobToString(encrypted);
    const deserialized = decryptBlobFromString(serialized);

    await expect(decryptSecrets(deserialized, wrongPassphrase)).rejects.toThrow();
  });
});