import axios from 'axios';
import { prisma } from '@/lib/db/prisma';
import { AmazonAdvertisingClient } from './client';
import type { ApiRegion, TokenResponse } from './types';

/**
 * Refresh Amazon access token using refresh token
 */
export async function refreshAmazonToken(profileId: string): Promise<string> {
  const profile = await prisma.amazonProfile.findUnique({
    where: { profileId },
  });

  if (!profile) {
    throw new Error('Amazon profile not found');
  }

  // Use per-user credentials, fall back to env vars
  const clientId = profile.clientId || process.env.AMAZON_CLIENT_ID!;
  const clientSecret = profile.clientSecret || process.env.AMAZON_CLIENT_SECRET!;

  try {
    const response = await axios.post<TokenResponse>(
      'https://api.amazon.com/auth/o2/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: profile.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Update tokens in database
    await prisma.amazonProfile.update({
      where: { profileId },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token || profile.refreshToken,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      },
    });

    return access_token;
  } catch (error) {
    console.error('Failed to refresh Amazon token:', error);
    throw new Error('Failed to refresh Amazon access token');
  }
}

/**
 * Get Amazon client with automatic token refresh
 */
export async function getAmazonClient(
  profileId: string
): Promise<AmazonAdvertisingClient> {
  const profile = await prisma.amazonProfile.findUnique({
    where: { profileId },
  });

  if (!profile) {
    throw new Error('Amazon profile not found');
  }

  // Check if token is expired or will expire in the next 5 minutes
  const tokenExpiresIn = profile.tokenExpiresAt.getTime() - Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  let accessToken = profile.accessToken;

  if (tokenExpiresIn < fiveMinutes) {
    accessToken = await refreshAmazonToken(profileId);
  }

  // Use per-user credentials, fall back to env vars
  const clientId = profile.clientId || process.env.AMAZON_CLIENT_ID!;
  const region = (profile.region || process.env.AMAZON_API_REGION || 'NA') as ApiRegion;

  return new AmazonAdvertisingClient(profileId, accessToken, clientId, region);
}

/**
 * Get Amazon client by user ID
 */
export async function getAmazonClientByUserId(
  userId: string
): Promise<AmazonAdvertisingClient> {
  const profile = await prisma.amazonProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new Error('Amazon profile not connected for this user');
  }

  return getAmazonClient(profile.profileId);
}

/**
 * Check if user has connected Amazon account
 */
export async function hasAmazonProfile(userId: string): Promise<boolean> {
  const profile = await prisma.amazonProfile.findUnique({
    where: { userId },
  });

  return !!profile;
}

/**
 * Validate Amazon API credentials
 */
export async function validateAmazonCredentials(
  accessToken: string,
  clientId: string,
  region: ApiRegion = 'NA'
): Promise<boolean> {
  try {
    const baseURLs: Record<ApiRegion, string> = {
      NA: 'https://advertising-api.amazon.com',
      EU: 'https://advertising-api-eu.amazon.com',
      FE: 'https://advertising-api-fe.amazon.com',
    };

    const response = await axios.get(`${baseURLs[region]}/v2/profiles`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Amazon-Advertising-API-ClientId': clientId,
      },
    });

    return response.status === 200;
  } catch {
    return false;
  }
}
