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

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 30);

    // Find campaign by id, verify it belongs to user's profile
    const campaign: any = await prisma.campaign.findFirst({
      where: {
        id,
        profileId: profile.id,
      },
      include: {
        metrics: {
          where: {
            date: { gte: sinceDate },
          },
          orderBy: { date: 'desc' },
        },
        adGroups: {
          include: {
            _count: {
              select: { keywords: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

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
    const ctr =
      thirtyDayMetrics.impressions > 0
        ? (thirtyDayMetrics.clicks / thirtyDayMetrics.impressions) * 100
        : 0;
    const cpc =
      thirtyDayMetrics.clicks > 0
        ? thirtyDayMetrics.cost / thirtyDayMetrics.clicks
        : 0;

    const result = {
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
      tosModifier: campaign.tosModifier
        ? parseFloat(campaign.tosModifier.toString())
        : null,
      rosModifier: campaign.rosModifier
        ? parseFloat(campaign.rosModifier.toString())
        : null,
      pdpModifier: campaign.pdpModifier
        ? parseFloat(campaign.pdpModifier.toString())
        : null,
      adGroups: campaign.adGroups.map((ag: any) => ({
        id: ag.id,
        name: ag.name,
        defaultBid: parseFloat(ag.defaultBid.toString()),
        state: ag.state,
        keywordCount: ag._count.keywords,
      })),
      thirtyDay: {
        ...thirtyDayMetrics,
        acos,
        roas,
        ctr,
        cpc,
      },
      metricsHistory: campaign.metrics.map((m: any) => ({
        date: m.date.toISOString(),
        impressions: m.impressions,
        clicks: m.clicks,
        cost: parseFloat(m.cost.toString()),
        sales: parseFloat(m.sales.toString()),
        orders: m.orders,
        units: m.units,
        acos: parseFloat(m.acos.toString()),
        roas: parseFloat(m.roas.toString()),
      })),
    };

    return NextResponse.json({ campaign: result });
  } catch (error) {
    console.error('Error fetching campaign detail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
