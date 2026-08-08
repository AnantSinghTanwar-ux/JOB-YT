import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || `${process.env.FRONTEND_URL}/recruiter/settings/integrations/callback`;

export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI) as unknown as OAuth2Client;
}

export function getAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    state,
  });
}

export async function exchangeCode(code: string): Promise<{ access_token: string; refresh_token: string; expiry_date: number }> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new Error('Failed to obtain calendar tokens');
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  };
}

export function createCalendarClient(
  accessToken: string,
  refreshToken: string,
  expiryDate: Date,
  onTokenRefresh?: (accessToken: string, expiryDate: Date) => void,
): { calendar: calendar_v3.Calendar; oauth: OAuth2Client } {
  const oauth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  oauth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiryDate.getTime(),
  });

  if (onTokenRefresh) {
    oauth.on('tokens', (tokens: any) => {
      if (tokens.access_token && tokens.expiry_date) {
        onTokenRefresh(tokens.access_token, new Date(tokens.expiry_date));
      }
    });
  }

  const calendar = google.calendar({ version: 'v3', auth: oauth });
  return { calendar, oauth: oauth as unknown as OAuth2Client };
}
