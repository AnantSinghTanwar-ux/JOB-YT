/**
 * Authentication Service Tests
 *
 * Comprehensive test suite covering login, registration, password utilities,
 * JWT operations, and edge cases including the OAuth null-password scenario.
 */

import bcrypt from 'bcrypt';

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing modules under test
// ---------------------------------------------------------------------------

// Mock the database pool
const mockQuery = jest.fn();
jest.mock('../config/database', () => ({
  __esModule: true,
  default: { query: mockQuery, connect: jest.fn() },
}));

// Mock Prisma
jest.mock('../config/prisma', () => ({
  __esModule: true,
  default: {
    users: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));

// Mock Redis
jest.mock('../config/redis', () => ({
  __esModule: true,
  default: { get: jest.fn(), set: jest.fn(), status: 'ready' },
}));

// Mock logger
jest.mock('../config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock email utility
jest.mock('../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  verificationEmailHtml: jest.fn().mockReturnValue('<html></html>'),
  passwordResetEmailHtml: jest.fn().mockReturnValue('<html></html>'),
  oauthEmailVerificationHtml: jest.fn().mockReturnValue('<html></html>'),
}));

// Mock webhook service
jest.mock('../services/webhook.service', () => ({
  WebhookService: { fireEvent: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../services/webhook/eventCatalog', () => ({
  WEBHOOK_EVENTS: { USER_REGISTERED: 'user.registered' },
}));

// Mock ProfileBootstrapService
jest.mock('../services/profileBootstrap.service', () => ({
  ProfileBootstrapService: { ensureRoleProfileWithSql: jest.fn().mockResolvedValue(undefined) },
}));

// Mock CreditService
jest.mock('../services/credit.service', () => ({
  CreditService: {
    grantRegistrationCredits: jest.fn().mockResolvedValue(undefined),
    grantReferralRewards: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock ReferralModel
jest.mock('../models/referral.model', () => ({
  ReferralModel: {
    create: jest.fn().mockResolvedValue(undefined),
    findByReferredId: jest.fn().mockResolvedValue(null),
    markReferrerCredited: jest.fn().mockResolvedValue(undefined),
    markReferredCredited: jest.fn().mockResolvedValue(undefined),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyToken } from '../utils/jwt';


// Set JWT_SECRET for token tests
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-only';
process.env.AUTO_VERIFY_EMAIL_ON_REGISTER = 'true';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Password Utilities', () => {
  describe('hashPassword()', () => {
    it('should hash a valid password', async () => {
      const hash = await hashPassword('StrongPass1!');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    it('should produce unique hashes for the same password', async () => {
      const hash1 = await hashPassword('SamePass1!');
      const hash2 = await hashPassword('SamePass1!');
      expect(hash1).not.toBe(hash2);
    });

    it('should throw on empty string', () => {
      expect(() => hashPassword('')).toThrow('Password is required for hashing');
    });

    it('should throw on undefined', () => {
      expect(() => hashPassword(undefined as unknown as string)).toThrow(
        'Password is required for hashing',
      );
    });

    it('should throw on null', () => {
      expect(() => hashPassword(null as unknown as string)).toThrow(
        'Password is required for hashing',
      );
    });

    it('should throw on non-string input', () => {
      expect(() => hashPassword(12345 as unknown as string)).toThrow(
        'Password is required for hashing',
      );
    });
  });

  describe('comparePassword()', () => {
    let validHash: string;

    beforeAll(async () => {
      validHash = await bcrypt.hash('TestPassword1!', 12);
    });

    it('should return true for matching password', async () => {
      const result = await comparePassword('TestPassword1!', validHash);
      expect(result).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const result = await comparePassword('WrongPassword1!', validHash);
      expect(result).toBe(false);
    });

    it('should return false when hash is null (OAuth user)', async () => {
      const result = await comparePassword('SomePassword1!', null);
      expect(result).toBe(false);
    });

    it('should return false when hash is undefined', async () => {
      const result = await comparePassword('SomePassword1!', undefined);
      expect(result).toBe(false);
    });

    it('should return false when hash is empty string', async () => {
      const result = await comparePassword('SomePassword1!', '');
      expect(result).toBe(false);
    });

    it('should throw when plain password is empty', () => {
      expect(() => comparePassword('', validHash)).toThrow(
        'Plain password is required for comparison',
      );
    });

    it('should throw when plain password is undefined', () => {
      expect(() => comparePassword(undefined as unknown as string, validHash)).toThrow(
        'Plain password is required for comparison',
      );
    });

    it('should throw when plain password is null', () => {
      expect(() => comparePassword(null as unknown as string, validHash)).toThrow(
        'Plain password is required for comparison',
      );
    });
  });
});

describe('JWT Utilities', () => {
  const payload = { userId: 'test-uuid-123', email: 'test@example.com', role: 'applicant' as const };

  describe('signAccessToken()', () => {
    it('should return a JWT string', () => {
      const token = signAccessToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('signRefreshToken()', () => {
    it('should return a JWT string', () => {
      const token = signRefreshToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should produce a different token than access token', () => {
      const access = signAccessToken(payload);
      const refresh = signRefreshToken(payload);
      expect(access).not.toBe(refresh);
    });
  });

  describe('verifyToken()', () => {
    it('should verify and decode a valid access token', () => {
      const token = signAccessToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should throw for an invalid token', () => {
      expect(() => verifyToken('invalid.token.here')).toThrow();
    });

    it('should throw for a tampered token', () => {
      const token = signAccessToken(payload);
      const tampered = token.slice(0, -5) + 'XXXXX';
      expect(() => verifyToken(tampered)).toThrow();
    });
  });
});

describe('AuthService.login()', () => {
  // Import AuthService lazily to ensure mocks are in place
  let AuthService: typeof import('../services/auth.service').AuthService;

  beforeAll(async () => {
    const mod = await import('../services/auth.service');
    AuthService = mod.AuthService;
  });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('should succeed with valid credentials', async () => {
    const hash = await bcrypt.hash('Valid1Password!', 12);
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-1',
          email: 'user@example.com',
          password_hash: hash,
          role: 'applicant',
          is_verified: true,
          banned_at: null,
        },
      ],
    });

    const result = await AuthService.login('user@example.com', 'Valid1Password!');
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result.user.email).toBe('user@example.com');
  });

  it('should throw for unknown email', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(AuthService.login('unknown@example.com', 'Pass1!'))
      .rejects.toThrow('Invalid credentials');
  });

  it('should throw for incorrect password', async () => {
    const hash = await bcrypt.hash('CorrectPass1!', 12);
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'user-2',
          email: 'user@example.com',
          password_hash: hash,
          role: 'applicant',
          is_verified: true,
          banned_at: null,
        },
      ],
    });

    await expect(AuthService.login('user@example.com', 'WrongPass1!'))
      .rejects.toThrow('Invalid credentials');
  });

  it('should throw structured error for OAuth-only user (null password_hash)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'oauth-user',
          email: 'oauth@example.com',
          password_hash: null,
          role: 'applicant',
          is_verified: true,
          banned_at: null,
          auth_provider: 'google',
        },
      ],
    });

    await expect(AuthService.login('oauth@example.com', 'AnyPass1!'))
      .rejects.toThrow('This account uses social login');
  });

  it('should throw for unverified user', async () => {
    const hash = await bcrypt.hash('Pass1!', 12);
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'unverified-user',
          email: 'unverified@example.com',
          password_hash: hash,
          role: 'applicant',
          is_verified: false,
          banned_at: null,
        },
      ],
    });

    await expect(AuthService.login('unverified@example.com', 'Pass1!'))
      .rejects.toThrow('Please verify your email first');
  });

  it('should throw for banned user', async () => {
    const hash = await bcrypt.hash('Pass1!', 12);
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'banned-user',
          email: 'banned@example.com',
          password_hash: hash,
          role: 'applicant',
          is_verified: true,
          banned_at: new Date(),
        },
      ],
    });

    await expect(AuthService.login('banned@example.com', 'Pass1!'))
      .rejects.toThrow('suspended');
  });

  it('should throw for empty email', async () => {
    await expect(AuthService.login('', 'Pass1!')).rejects.toThrow('Invalid credentials');
  });

  it('should throw for empty password', async () => {
    await expect(AuthService.login('user@example.com', '')).rejects.toThrow('Invalid credentials');
  });

  it('should never crash with 500 for null password_hash', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 'null-pass-user',
          email: 'nullpass@example.com',
          password_hash: null,
          role: 'applicant',
          is_verified: true,
          banned_at: null,
          auth_provider: 'github',
        },
      ],
    });

    try {
      await AuthService.login('nullpass@example.com', 'AnyPassword1!');
      fail('Should have thrown');
    } catch (err) {
      const error = err as { statusCode?: number; code?: string; message?: string };
      // Should be a structured 401, NOT a 500
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('SOCIAL_LOGIN_REQUIRED');
      // Must NOT be the raw bcrypt error
      expect(error.message).not.toContain('data and hash arguments required');
    }
  });
});

describe('AuthService.register()', () => {
  let AuthService: typeof import('../services/auth.service').AuthService;

  beforeAll(async () => {
    const mod = await import('../services/auth.service');
    AuthService = mod.AuthService;
  });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('should throw for missing email', async () => {
    await expect(AuthService.register('', 'StrongPass1!', 'applicant'))
      .rejects.toThrow('Email is required');
  });

  it('should throw for missing password', async () => {
    await expect(AuthService.register('user@example.com', '', 'applicant'))
      .rejects.toThrow('Password is required');
  });

  it('should throw for duplicate email', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'existing-user', email: 'dup@example.com' }],
    });

    await expect(AuthService.register('dup@example.com', 'StrongPass1!', 'applicant'))
      .rejects.toThrow('Email already registered');
  });
});

describe('AuthService.resetPassword()', () => {
  let AuthService: typeof import('../services/auth.service').AuthService;

  beforeAll(async () => {
    const mod = await import('../services/auth.service');
    AuthService = mod.AuthService;
  });

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('should throw for empty token', async () => {
    await expect(AuthService.resetPassword('', 'NewPass1!'))
      .rejects.toThrow('Reset token is required');
  });

  it('should throw for empty new password', async () => {
    await expect(AuthService.resetPassword('valid-token', ''))
      .rejects.toThrow('New password is required');
  });

  it('should throw for invalid/expired token', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await expect(AuthService.resetPassword('invalid-token', 'NewPass1!'))
      .rejects.toThrow('Invalid or expired reset token');
  });
});
