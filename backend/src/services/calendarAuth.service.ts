import crypto from 'crypto';
import { GoogleCalendarTokenModel } from '../models/googleCalendarToken.model';
import {
  getAuthUrl,
  exchangeCode,
  createCalendarClient,
} from '../config/googleCalendar';

export const CalendarAuthService = {
  async getAuthUrl(userId: string): Promise<{ url: string; state: string }> {
    const state = crypto.randomBytes(16).toString('hex');
    const stateData = Buffer.from(JSON.stringify({ state, userId })).toString('base64');
    const url = getAuthUrl(stateData);
    return { url, state: stateData };
  },

  async handleCallback(stateParam: string, code: string): Promise<string> {
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(stateParam, 'base64').toString('utf8'));
      userId = decoded.userId;
    } catch {
      throw Object.assign(new Error('Invalid state parameter'), { statusCode: 400 });
    }

    const tokens = await exchangeCode(code);
    await GoogleCalendarTokenModel.upsert(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      new Date(tokens.expiry_date),
    );

    return userId;
  },

  async disconnect(userId: string): Promise<void> {
    await GoogleCalendarTokenModel.delete(userId);
  },

  async getClient(userId: string) {
    const token = await GoogleCalendarTokenModel.findByUserId(userId);
    if (!token) throw Object.assign(new Error('Google Calendar not connected'), { statusCode: 400, code: 'CALENDAR_NOT_CONNECTED' });

    return createCalendarClient(
      token.access_token,
      token.refresh_token,
      token.token_expiry,
      async (newAccessToken, newExpiry) => {
        await GoogleCalendarTokenModel.updateTokens(userId, newAccessToken, newExpiry);
      },
    );
  },

  async isConnected(userId: string): Promise<boolean> {
    const token = await GoogleCalendarTokenModel.findByUserId(userId);
    return !!token;
  },
};
