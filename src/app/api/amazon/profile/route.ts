import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profile = await prisma.amazonProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        profileId: true,
        countryCode: true,
        currencyCode: true,
        timezone: true,
        accountType: true,
        lastSyncAt: true,
        syncStatus: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
