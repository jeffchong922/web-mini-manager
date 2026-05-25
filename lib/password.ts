import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

const PBKDF2_ITERATIONS = 120000;
const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST);
  const hashHex = derivedKey.toString('hex');
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${hashHex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('pbkdf2:')) {
    return false;
  }

  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const [, iterationsStr, salt, expectedHash] = parts;
  const iterations = parseInt(iterationsStr, 10);

  const derivedKey = pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST);
  const hashHex = derivedKey.toString('hex');

  const a = Buffer.from(hashHex, 'hex');
  const b = Buffer.from(expectedHash, 'hex');

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}