import bcrypt from 'bcrypt';
import logger from '../config/logger';

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt.
 * Validates input before calling bcrypt to prevent cryptic runtime errors.
 */
export const hashPassword = (plain: string): Promise<string> => {
  if (typeof plain !== 'string' || plain.length === 0) {
    logger.error('hashPassword called with invalid input', {
      type: typeof plain,
      isEmpty: plain === '',
    });
    throw new Error('Password is required for hashing');
  }
  return bcrypt.hash(plain, SALT_ROUNDS);
};

/**
 * Compare a plaintext password against a bcrypt hash.
 * Validates both arguments before calling bcrypt to prevent the
 * "data and hash arguments required" runtime error.
 */
export const comparePassword = (plain: string, hash: string | null | undefined): Promise<boolean> => {
  if (typeof plain !== 'string' || plain.length === 0) {
    logger.error('comparePassword called with invalid plain argument', {
      type: typeof plain,
    });
    throw new Error('Plain password is required for comparison');
  }
  if (typeof hash !== 'string' || hash.length === 0) {
    // This occurs when an OAuth-only user attempts password login.
    // Log the condition for diagnostics but do NOT log the hash value.
    logger.warn('comparePassword called with missing or empty hash — returning false', {
      hashType: typeof hash,
      hashIsNull: hash === null,
      hashIsUndefined: hash === undefined,
    });
    return Promise.resolve(false);
  }
  return bcrypt.compare(plain, hash);
};
