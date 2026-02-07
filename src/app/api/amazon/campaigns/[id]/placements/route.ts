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

    // Verify campaign belongs to user's profile
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        profileId: profile.id,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const placement = searchParams.get('placement') || 'ALL';
    const days = parseInt(searchParams.get('days') || '30', 10);

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Build placement filter
    const placementFilter: any = {
      campaignId: id,
      date: { gte: sinceDate },
    };

    if (placement !== 'ALL') {
      placementFilter.placement = placement;
    }

    const placementMetrics: any[] = await prisma.placementMetric.findMany({
      where: placementFilter,
      orderBy: { date: 'asc' },
    });

    // Group by placement
    const placementGroups: Record<string, {
      totals: {
        impressions: number;
        clicks: number;
        cost: number;
        sales: number;
        orders: number;
        ctr: number;
        cpc: number;
        acos: number;
        roas: number;
      };
      history: any[];
    }> = {};

    for (const metric of placementMetrics) {
      const key = metric.placement;

      if (!placementGroups[key]) {
        placementGroups[key] = {
          totals: {
            impressions: 0,
            clicks: 0,
            cost: 0,
            sales: 0,
            orders: 0,
            ctr: 0,
            cpc: 0,
            acos: 0,
            roas: 0,
          },
          history: [],
        };
      }

      const group = placementGroups[key];

      group.totals.impressions += metric.impressions;
      group.totals.clicks += metric.clicks;
      group.totals.cost += parseFloat(metric.cost.toString());
      group.totals.sales += parseFloat(metric.sales.toString());
      group.totals.orders += metric.orders;

      group.history.push({
        date: metric.date.toISOString(),
        impressions: metric.impressions,
        clicks: metric.clicks,
        cost: parseFloat(metric.cost.toString()),
        sales: parseFloat(metric.sales.toString()),
        orders: metric.orders,
        ctr: parseFloat(metric.ctr.toString()),
        cpc: parseFloat(metric.cpc.toString()),
        acos: parseFloat(metric.acos.toString()),
        roas: parseFloat(metric.roas.toString()),
      });
    }

    // Calculate aggregate CTR, CPC, ACOS, ROAS for each placement
    for (const key of Object.keys(placementGroups)) {
      const totals = placementGroups[key].totals;

      totals.ctr = totals.impressions > 0
        ? (totals.clicks / totals.impressions) * 100
        : 0;
      totals.cpc = totals.clicks > 0
        ? totals.cost / totals.clicks
        : 0;
      totals.acos = totals.sales > 0
        ? (totals.cost / totals.sales) * 100
        : 0;
      totals.roas = totals.cost > 0
        ? totals.sales / totals.cost
        : 0;
    }

    return NextResponse.json({ placements: placementGroups });
  } catch (error) {
    console.error('Error fetching placement metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
