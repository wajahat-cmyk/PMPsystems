import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { success } = await checkRateLimit(session.user.id, 20, 60000);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { id } = await params;

    const profile = await prisma.amazonProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Amazon profile not connected' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const portfolio = searchParams.get('portfolio');

    // First get the keyword to find its keywordText
    const keyword: any = await prisma.keyword.findUnique({
      where: { id },
      select: { keywordText: true },
    });

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword not found' }, { status: 404 });
    }

    const campaignFilter: any = { profileId: profile.id };
    if (portfolio) campaignFilter.portfolio = portfolio;

    // Find all keywords with the same text across campaigns
    const relatedKeywords: any[] = await prisma.keyword.findMany({
      where: {
        keywordText: keyword.keywordText,
        adGroup: {
          campaign: campaignFilter,
        },
      },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        adGroup: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                state: true,
                portfolio: true,
              },
            },
          },
        },
      },
    });

    const campaigns = relatedKeywords.map((kw) => {
      const thirtyDay = kw.metrics.reduce(
        (acc: any, m: any) => ({
          impressions: acc.impressions + m.impressions,
          clicks: acc.clicks + m.clicks,
          cost: acc.cost + parseFloat(m.cost.toString()),
          sales: acc.sales + parseFloat(m.sales.toString()),
          orders: acc.orders + m.orders,
        }),
        { impressions: 0, clicks: 0, cost: 0, sales: 0, orders: 0 }
      );

      const acos = thirtyDay.sales > 0 ? (thirtyDay.cost / thirtyDay.sales) * 100 : 0;
      const roas = thirtyDay.cost > 0 ? thirtyDay.sales / thirtyDay.cost : 0;

      return {
        campaignId: kw.adGroup.campaign.id,
        campaignName: kw.adGroup.campaign.name,
        adGroupName: kw.adGroup.name,
        matchType: kw.matchType,
        bid: parseFloat(kw.bid.toString()),
        state: kw.state,
        portfolio: kw.adGroup.campaign.portfolio,
        metrics: {
          ...thirtyDay,
          acos,
          roas,
        },
      };
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Error fetching campaigns for keyword:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
