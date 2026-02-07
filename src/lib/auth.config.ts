import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible auth config (no Node.js-only imports).
 * Used by middleware for session checks.
 */
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  providers: [], // Providers added in auth.ts (requires Node.js runtime)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isAuthPage =
        pathname.startsWith('/login') ||
        pathname.startsWith('/register');

      // Public paths that don't require authentication
      const isPublicPath = pathname === '/' || isAuthPage;

      // Redirect authenticated users away from auth pages
      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      // All non-public paths require authentication
      if (!isPublicPath && !isLoggedIn) return false;

      return true;
    },
  },
} satisfies NextAuthConfig;
