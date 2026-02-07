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
    });

    if (!profile) {
      return NextResponse.json({ portfolios: [] });
    }

    const campaigns: any[] = await prisma.campaign.findMany({
      where: {
        profileId: profile.id,
        portfolio: { not: null },
      },
      select: { portfolio: true },
      distinct: ['portfolio'],
    });

    const portfolios = campaigns
      .map((c) => c.portfolio as string)
      .filter(Boolean)
      .sort();

    return NextResponse.json({ portfolios });
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
