import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === 'google' && account.id_token) {
        (token as unknown as Record<string, unknown>).googleIdToken = account.id_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as unknown as Record<string, unknown>).googleIdToken =
        (token as unknown as Record<string, unknown>).googleIdToken;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});
