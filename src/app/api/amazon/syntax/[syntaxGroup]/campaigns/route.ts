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
    const portfolio = searchParams.get('portfolio');

    const campaignFilter: any = { profileId: profile.id };
    if (portfolio) campaignFilter.portfolio = portfolio;

    // Find campaigns that have keywords in this syntax group
    const keywords: any[] = await prisma.keyword.findMany({
      where: {
        syntaxGroup: decodedSyntaxGroup,
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
              include: {
                metrics: {
                  orderBy: { date: 'desc' },
                  take: 30,
                },
              },
            },
          },
        },
      },
    });

    // Group by campaign to get unique campaigns with metrics
    const campaignMap = new Map<string, any>();

    for (const kw of keywords) {
      const campaign = kw.adGroup.campaign;
      if (!campaignMap.has(campaign.id)) {
        const thirtyDay = campaign.metrics.reduce(
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

        campaignMap.set(campaign.id, {
          id: campaign.id,
          name: campaign.name,
          state: campaign.state,
          dailyBudget: parseFloat(campaign.dailyBudget.toString()),
          portfolio: campaign.portfolio,
          metrics: {
            ...thirtyDay,
            acos,
            roas,
          },
        });
      }
    }

    return NextResponse.json({
      campaigns: Array.from(campaignMap.values()),
    });
  } catch (error) {
    console.error('Error fetching campaigns for syntax group:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
