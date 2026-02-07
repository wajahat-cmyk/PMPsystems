import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/amazon/oauth/callback`;

  const authUrl = new URL('https://www.amazon.com/ap/oa');
  authUrl.searchParams.append('client_id', process.env.AMAZON_CLIENT_ID!);
  authUrl.searchParams.append('scope', 'advertising::campaign_management');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);

  // Generate and store state for CSRF protection
  const state = crypto.randomUUID();
  // In production, store this in Redis or session
  authUrl.searchParams.append('state', state);

  return NextResponse.redirect(authUrl.toString());
}
