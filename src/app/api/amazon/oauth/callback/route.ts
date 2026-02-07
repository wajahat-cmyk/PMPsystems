import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import axios from 'axios';
import { prisma } from '@/lib/db/prisma';
import type { TokenResponse, AmazonProfile } from '@/lib/amazon-api/types';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL('/login?error=unauthorized', request.url)
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard?error=oauth_failed', request.url)
    );
  }

  // TODO: Verify state for CSRF protection in production
  // const storedState = await getStoredState(session.user.id);
  // if (state !== storedState) {
  //   return NextResponse.redirect('/dashboard?error=invalid_state');
  // }

  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/amazon/oauth/callback`;

    // Exchange authorization code for access token
    const tokenResponse = await axios.post<TokenResponse>(
      'https://api.amazon.com/auth/o2/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.AMAZON_CLIENT_ID!,
        client_secret: process.env.AMAZON_CLIENT_SECRET!,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Get Amazon Advertising profile information
    const profileResponse = await axios.get<AmazonProfile[]>(
      'https://advertising-api.amazon.com/v2/profiles',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID!,
        },
      }
    );

    const profiles = profileResponse.data;

    if (!profiles || profiles.length === 0) {
      return NextResponse.redirect(
        new URL('/dashboard?error=no_profiles', request.url)
      );
    }

    // Use the first profile (or let user choose in the future)
    const primaryProfile = profiles[0];

    // Store Amazon profile in database
    await prisma.amazonProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        profileId: primaryProfile.profileId,
        countryCode: primaryProfile.countryCode,
        currencyCode: primaryProfile.currencyCode,
        timezone: primaryProfile.timezone,
        accountType: primaryProfile.accountInfo.type.toUpperCase(),
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        syncStatus: 'pending',
      },
      update: {
        profileId: primaryProfile.profileId,
        countryCode: primaryProfile.countryCode,
        currencyCode: primaryProfile.currencyCode,
        timezone: primaryProfile.timezone,
        accountType: primaryProfile.accountInfo.type.toUpperCase(),
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        syncStatus: 'pending',
      },
    });

    return NextResponse.redirect(
      new URL('/dashboard?connected=true', request.url)
    );
  } catch (error) {
    console.error('Amazon OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=oauth_failed', request.url)
    );
  }
}
