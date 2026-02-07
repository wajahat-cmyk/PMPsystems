import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import axios from 'axios';

const credentialsSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client Secret is required'),
  refreshToken: z.string().min(1, 'Refresh Token is required'),
  profileId: z.string().min(1, 'Profile ID is required'),
  region: z.enum(['NA', 'EU', 'FE']).default('NA'),
  countryCode: z.string().default('US'),
  currencyCode: z.string().default('USD'),
  timezone: z.string().default('America/Los_Angeles'),
  accountType: z.enum(['SELLER', 'VENDOR']).default('SELLER'),
});

/**
 * POST - Save and validate API credentials
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = credentialsSchema.parse(body);

    // Step 1: Exchange refresh token for access token to validate credentials
    let accessToken: string;
    let expiresIn: number;
    try {
      const tokenResponse = await axios.post(
        'https://api.amazon.com/auth/o2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: data.refreshToken,
          client_id: data.clientId,
          client_secret: data.clientSecret,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      accessToken = tokenResponse.data.access_token;
      expiresIn = tokenResponse.data.expires_in || 3600;
    } catch {
      return NextResponse.json(
        { error: 'Invalid credentials. Could not get access token from Amazon. Check your Client ID, Secret, and Refresh Token.' },
        { status: 400 }
      );
    }

    // Step 2: Validate by fetching profiles from Amazon API
    const regionEndpoints: Record<string, string> = {
      NA: 'https://advertising-api.amazon.com',
      EU: 'https://advertising-api-eu.amazon.com',
      FE: 'https://advertising-api-fe.amazon.com',
    };

    try {
      await axios.get(`${regionEndpoints[data.region]}/v2/profiles`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Amazon-Advertising-API-ClientId': data.clientId,
        },
      });
    } catch {
      return NextResponse.json(
        { error: 'Credentials are valid but could not access Amazon Advertising API. Check your Profile ID and Region.' },
        { status: 400 }
      );
    }

    // Step 3: Upsert AmazonProfile
    await prisma.amazonProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        profileId: data.profileId,
        countryCode: data.countryCode,
        currencyCode: data.currencyCode,
        timezone: data.timezone,
        accountType: data.accountType,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        region: data.region,
        accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        syncStatus: 'pending',
      },
      update: {
        profileId: data.profileId,
        countryCode: data.countryCode,
        currencyCode: data.currencyCode,
        timezone: data.timezone,
        accountType: data.accountType,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        region: data.region,
        accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    // Step 4: Update user data source to API
    await prisma.user.update({
      where: { id: session.user.id },
      data: { dataSource: 'API' },
    });

    return NextResponse.json({ success: true, message: 'API credentials saved and validated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Save credentials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET - Fetch current credentials (masked)
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.amazonProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        clientId: true,
        profileId: true,
        region: true,
        countryCode: true,
        currencyCode: true,
        timezone: true,
        accountType: true,
        syncStatus: true,
        lastSyncAt: true,
      },
    });

    if (!profile || !profile.clientId) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      clientId: maskSecret(profile.clientId),
      hasSecret: true,
      profileId: profile.profileId,
      region: profile.region,
      countryCode: profile.countryCode,
      currencyCode: profile.currencyCode,
      timezone: profile.timezone,
      accountType: profile.accountType,
      syncStatus: profile.syncStatus,
      lastSyncAt: profile.lastSyncAt,
    });
  } catch (error) {
    console.error('Get credentials error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function maskSecret(value: string): string {
  if (value.length <= 4) return '****';
  return '***' + value.slice(-4);
}
