import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ syntaxGroup: string }> }
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
    const { syntaxGroup } = await params;
    const decodedSyntaxGroup = decodeURIComponent(syntaxGroup);

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
    const days = parseInt(searchParams.get('days') || '30', 10);
    const portfolio = searchParams.get('portfolio');

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const campaignFilter: any = { profileId: profile.id };
    if (portfolio) campaignFilter.portfolio = portfolio;

    // Get keywords where syntaxGroup matches, scoped to user's profile
    const keywords: any[] = await prisma.keyword.findMany({
      where: {
        syntaxGroup: decodedSyntaxGroup,
        adGroup: {
          campaign: campaignFilter,
        },
      },
      include: {
        metrics: {
          where: {
            date: { gte: sinceDate },
          },
          orderBy: { date: 'desc' },
        },
        adGroup: {
          include: {
            campaign: {
              select: { name: true },
            },
          },
        },
      },
    });

    // Transform data - same shape as /api/amazon/keywords
    const keywordsWithMetrics = keywords.map((keyword: any) => {
      const thirtyDayMetrics = keyword.metrics.reduce(
        (acc: any, m: any) => ({
          impressions: acc.impressions + m.impressions,
          clicks: acc.clicks + m.clicks,
          cost: acc.cost + parseFloat(m.cost.toString()),
          sales: acc.sales + parseFloat(m.sales.toString()),
          orders: acc.orders + m.orders,
        }),
        { impressions: 0, clicks: 0, cost: 0, sales: 0, orders: 0 }
      );

      const acos =
        thirtyDayMetrics.sales > 0
          ? (thirtyDayMetrics.cost / thirtyDayMetrics.sales) * 100
          : 0;
      const roas =
        thirtyDayMetrics.cost > 0
          ? thirtyDayMetrics.sales / thirtyDayMetrics.cost
          : 0;
      const ctr =
        thirtyDayMetrics.impressions > 0
          ? (thirtyDayMetrics.clicks / thirtyDayMetrics.impressions) * 100
          : 0;
      const cpc =
        thirtyDayMetrics.clicks > 0
          ? thirtyDayMetrics.cost / thirtyDayMetrics.clicks
          : 0;

      return {
        id: keyword.id,
        keywordText: keyword.keywordText,
        matchType: keyword.matchType,
        bid: parseFloat(keyword.bid.toString()),
        state: keyword.state,
        syntaxGroup: keyword.syntaxGroup,
        campaignName: keyword.adGroup.campaign.name,
        adGroupName: keyword.adGroup.name,
        metrics: {
          ...thirtyDayMetrics,
          acos,
          roas,
          ctr,
          cpc,
        },
      };
    });

    return NextResponse.json({ keywords: keywordsWithMetrics });
  } catch (error) {
    console.error('Error fetching keywords for syntax group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
