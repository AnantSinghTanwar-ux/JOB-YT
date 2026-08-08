import { Request, Response, NextFunction } from 'express';
import { OtpService, OtpChannel } from '../services/otp.service';
import { WhatsAppService } from '../services/whatsapp.service';
import { sendEmail, otpEmailHtml } from '../utils/email';
import { sendSuccess } from '../utils/response';
import { UserModel } from '../models/user.model';
import { badRequest, notFound } from '../utils/appError';
import pool from '../config/database'; // Using raw pool as we added fields directly to schema but might not have regenerated Prisma client

export const OtpController = {
  /**
   * Request an OTP to be sent via Email or WhatsApp.
   */
  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { channel } = req.body as { channel: OtpChannel };
      
      const user = await UserModel.findById(userId);
      if (!user) throw notFound('User');

      let identifier: string | undefined;

      if (channel === 'email') {
        identifier = user.email || undefined;
      } else if (channel === 'whatsapp') {
        // Since we manually added phone to schema, we access it via a raw query if it's not mapped yet in UserModel
        const { rows } = await pool.query('SELECT phone FROM users WHERE id = $1', [userId]);
        identifier = rows[0]?.phone;
        
        if (!identifier) {
          throw badRequest('No phone number associated with this account. Please update your profile first.');
        }
      }

      if (!identifier) {
        throw badRequest(`No valid identifier found for channel: ${channel}`);
      }

      // Generate OTP
      const code = await OtpService.generateOtp(identifier, channel);

      // Dispatch OTP
      if (channel === 'email') {
        await sendEmail({
          to: identifier,
          subject: 'Your Verification Code',
          html: otpEmailHtml(code, 5)
        });
      } else if (channel === 'whatsapp') {
        await WhatsAppService.sendOtp(identifier, code);
      }

      sendSuccess(res, null, `OTP sent successfully via ${channel}`);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Verify an OTP and mark the corresponding channel as verified.
   */
  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { channel, code } = req.body as { channel: OtpChannel; code: string };

      const user = await UserModel.findById(userId);
      if (!user) throw notFound('User');

      let identifier: string | undefined;

      if (channel === 'email') {
        identifier = user.email || undefined;
      } else if (channel === 'whatsapp') {
        const { rows } = await pool.query('SELECT phone FROM users WHERE id = $1', [userId]);
        identifier = rows[0]?.phone;
      }

      if (!identifier) {
        throw badRequest(`No valid identifier found for channel: ${channel}`);
      }

      // Validate OTP (throws if invalid/expired/exhausted)
      await OtpService.verifyOtp(identifier, channel, code);

      // Mark verified
      if (channel === 'email') {
        await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [userId]);
      } else if (channel === 'whatsapp') {
        await pool.query('UPDATE users SET phone_verified = true WHERE id = $1', [userId]);
      }

      sendSuccess(res, null, `${channel} verified successfully`);
    } catch (err) {
      next(err);
    }
  }
};
