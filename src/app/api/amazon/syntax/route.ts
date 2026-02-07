import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { success } = await checkRateLimit(session.user.id, 20, 60000);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
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
    const campaignType = searchParams.get('campaignType');
    const matchType = searchParams.get('matchType');
    const root = searchParams.get('root');

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const portfolio = searchParams.get('portfolio');

    // Build campaign filter
    const campaignFilter: any = { profileId: profile.id };
    if (campaignType) {
      campaignFilter.campaignType = campaignType;
    }
    if (portfolio) {
      campaignFilter.portfolio = portfolio;
    }

    // Query keywords with syntaxGroup set, include metrics and campaign info
    const keywords: any[] = await prisma.keyword.findMany({
      where: {
        syntaxGroup: { not: null },
        ...(matchType ? { matchType } : {}),
        adGroup: {
          campaign: campaignFilter,
        },
      },
      include: {
        metrics: {
          where: {
            date: { gte: sinceDate },
          },
        },
        adGroup: {
          include: {
            campaign: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Group by syntaxGroup and aggregate metrics
    const groupMap = new Map<string, {
      impressions: number;
      clicks: number;
      cost: number;
      sales: number;
      orders: number;
      keywordIds: Set<string>;
      campaignIds: Set<string>;
    }>();

    for (const keyword of keywords) {
      const group = keyword.syntaxGroup as string;

      if (!groupMap.has(group)) {
        groupMap.set(group, {
          impressions: 0,
          clicks: 0,
          cost: 0,
          sales: 0,
          orders: 0,
          keywordIds: new Set(),
          campaignIds: new Set(),
        });
      }

      const entry = groupMap.get(group)!;
      entry.keywordIds.add(keyword.id);
      entry.campaignIds.add(keyword.adGroup.campaign.id);

      for (const m of keyword.metrics) {
        entry.impressions += m.impressions;
        entry.clicks += m.clicks;
        entry.cost += parseFloat(m.cost.toString());
        entry.sales += parseFloat(m.sales.toString());
        entry.orders += m.orders;
      }
    }

    // Filter by root prefix if provided
    let groups = Array.from(groupMap.entries());
    if (root) {
      groups = groups.filter(([name]) => name.startsWith(root));
    }

    // Build response with calculated metrics
    const syntaxGroups = groups.map(([name, data]) => {
      const ctr = data.impressions > 0
        ? (data.clicks / data.impressions) * 100
        : 0;
      const cvr = data.clicks > 0
        ? (data.orders / data.clicks) * 100
        : 0;
      const cpc = data.clicks > 0
        ? data.cost / data.clicks
        : 0;
      const acos = data.sales > 0
        ? (data.cost / data.sales) * 100
        : 0;
      const roas = data.cost > 0
        ? data.sales / data.cost
        : 0;

      return {
        syntaxGroup: name,
        keywordCount: data.keywordIds.size,
        campaignCount: data.campaignIds.size,
        metrics: {
          impressions: data.impressions,
          clicks: data.clicks,
          cost: data.cost,
          sales: data.sales,
          orders: data.orders,
          ctr,
          cvr,
          cpc,
          acos,
          roas,
        },
      };
    });

    // Sort by cost descending
    syntaxGroups.sort((a, b) => b.metrics.cost - a.metrics.cost);

    return NextResponse.json({ syntaxGroups });
  } catch (error) {
    console.error('Error fetching syntax groups:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
