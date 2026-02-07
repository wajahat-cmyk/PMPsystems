import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting
  const { success, limit, remaining, reset } = await checkRateLimit(
    session.user.id,
    20, // 20 requests
    60000 // per minute
  );

  if (!success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        limit,
        remaining,
        reset,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  try {
    // Get user's Amazon profile
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

    // Fetch campaigns with their latest metrics
    const campaigns: any[] = await prisma.campaign.findMany({
      where: campaignFilter,
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 30, // Last 30 days of metrics
        },
      },
    });

    // Transform data for frontend
    const campaignsWithAggregates = campaigns.map((campaign: any) => {
      const latestMetric = campaign.metrics[0];

      // Calculate 30-day aggregates
      const thirtyDayMetrics = campaign.metrics.reduce(
        (acc: any, m: any) => ({
          impressions: acc.impressions + m.impressions,
          clicks: acc.clicks + m.clicks,
          cost: acc.cost + parseFloat(m.cost.toString()),
          sales: acc.sales + parseFloat(m.sales.toString()),
          orders: acc.orders + m.orders,
          units: acc.units + m.units,
        }),
        { impressions: 0, clicks: 0, cost: 0, sales: 0, orders: 0, units: 0 }
      );

      const acos =
        thirtyDayMetrics.sales > 0
          ? (thirtyDayMetrics.cost / thirtyDayMetrics.sales) * 100
          : 0;
      const roas =
        thirtyDayMetrics.cost > 0
          ? thirtyDayMetrics.sales / thirtyDayMetrics.cost
          : 0;

      return {
        id: campaign.id,
        amazonCampaignId: campaign.amazonCampaignId,
        name: campaign.name,
        campaignType: campaign.campaignType,
        targetingType: campaign.targetingType,
        state: campaign.state,
        dailyBudget: parseFloat(campaign.dailyBudget.toString()),
        startDate: campaign.startDate.toISOString(),
        endDate: campaign.endDate?.toISOString() || null,
        targetAcos: campaign.targetAcos
          ? parseFloat(campaign.targetAcos.toString())
          : null,
        targetRoas: campaign.targetRoas
          ? parseFloat(campaign.targetRoas.toString())
          : null,
        portfolio: campaign.portfolio || null,
        tosModifier: campaign.tosModifier ? parseFloat(campaign.tosModifier.toString()) : null,
        rosModifier: campaign.rosModifier ? parseFloat(campaign.rosModifier.toString()) : null,
        pdpModifier: campaign.pdpModifier ? parseFloat(campaign.pdpModifier.toString()) : null,
        latest: latestMetric
          ? {
              date: latestMetric.date.toISOString(),
              impressions: latestMetric.impressions,
              clicks: latestMetric.clicks,
              cost: parseFloat(latestMetric.cost.toString()),
              sales: parseFloat(latestMetric.sales.toString()),
              orders: latestMetric.orders,
              units: latestMetric.units,
              ctr: parseFloat(latestMetric.ctr.toString()),
              cpc: parseFloat(latestMetric.cpc.toString()),
              acos: parseFloat(latestMetric.acos.toString()),
              roas: parseFloat(latestMetric.roas.toString()),
            }
          : null,
        thirtyDay: {
          ...thirtyDayMetrics,
          acos,
          roas,
          ctr:
            thirtyDayMetrics.impressions > 0
              ? (thirtyDayMetrics.clicks / thirtyDayMetrics.impressions) * 100
              : 0,
          cpc:
            thirtyDayMetrics.clicks > 0
              ? thirtyDayMetrics.cost / thirtyDayMetrics.clicks
              : 0,
        },
        metricsHistory: campaign.metrics.map((m: any) => ({
          date: m.date.toISOString(),
          impressions: m.impressions,
          clicks: m.clicks,
          cost: parseFloat(m.cost.toString()),
          sales: parseFloat(m.sales.toString()),
          orders: m.orders,
          acos: parseFloat(m.acos.toString()),
          roas: parseFloat(m.roas.toString()),
        })),
      };
    });

    return NextResponse.json(
      { campaigns: campaignsWithAggregates },
      {
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
