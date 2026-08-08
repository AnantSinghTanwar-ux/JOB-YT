import crypto from 'crypto';
import redis from '../config/redis';
import { AppError, badRequest } from '../utils/appError';

export type OtpChannel = 'email' | 'whatsapp';

const OTP_TTL_SECONDS = 300; // 5 minutes
const MAX_ATTEMPTS = 3;

export const OtpService = {
  /**
   * Generates a secure 6-digit OTP and stores it in Redis.
   */
  async generateOtp(identifier: string, channel: OtpChannel): Promise<string> {
    if (redis.status === 'wait' || redis.status === 'end') {
      await redis.connect();
    }

    // Generate secure 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();
    
    const key = `otp:${channel}:${identifier}`;
    const attemptsKey = `otp_attempts:${channel}:${identifier}`;

    // Store OTP with 5-minute expiry
    await redis.set(key, code, 'EX', OTP_TTL_SECONDS);
    // Reset attempt counter
    await redis.set(attemptsKey, '0', 'EX', OTP_TTL_SECONDS);

    return code;
  },

  /**
   * Verifies an OTP against Redis. Handles attempt limits and expiry.
   */
  async verifyOtp(identifier: string, channel: OtpChannel, inputCode: string): Promise<boolean> {
    if (redis.status === 'wait' || redis.status === 'end') {
      await redis.connect();
    }

    const key = `otp:${channel}:${identifier}`;
    const attemptsKey = `otp_attempts:${channel}:${identifier}`;

    const attemptsStr = await redis.get(attemptsKey);
    let attempts = parseInt(attemptsStr || '0', 10);

    if (attempts >= MAX_ATTEMPTS) {
      throw new AppError('Maximum verification attempts reached. Please request a new OTP.', 429);
    }

    const storedCode = await redis.get(key);

    if (!storedCode) {
      throw badRequest('OTP expired or invalid');
    }

    if (storedCode !== inputCode) {
      // Increment attempt counter
      attempts++;
      await redis.set(attemptsKey, attempts.toString(), 'KEEPTTL');
      
      const remaining = MAX_ATTEMPTS - attempts;
      throw badRequest(`Invalid OTP. ${remaining} attempts remaining.`);
    }

    // Success! Clear the keys to prevent replay attacks
    await redis.del(key);
    await redis.del(attemptsKey);

    return true;
  }
};
