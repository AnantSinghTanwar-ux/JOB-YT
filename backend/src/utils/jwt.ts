import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

function getPrimaryJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function getVerificationSecrets(): string[] {
  const candidates = [
    process.env.JWT_SECRET,
    process.env.JWT_SECRET_PREVIOUS,
    process.env.JWT_SECRET_FALLBACKS,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(candidates));
}

export const signAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, getPrimaryJwtSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  } as jwt.SignOptions);

export const signRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, getPrimaryJwtSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as jwt.SignOptions);

export const verifyToken = (token: string): JwtPayload => {
  const secrets = getVerificationSecrets();
  if (secrets.length === 0) {
    throw new Error('No JWT verification secret configured');
  }

  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret) as JwtPayload;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Invalid token');
};
