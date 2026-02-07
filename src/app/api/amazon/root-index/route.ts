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
    const portfolio = searchParams.get('portfolio');

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const campaignFilter: any = { profileId: profile.id };
    if (portfolio) campaignFilter.portfolio = portfolio;

    const keywords: any[] = await prisma.keyword.findMany({
      where: {
        syntaxGroup: { not: null },
        adGroup: {
          campaign: campaignFilter,
        },
      },
      include: {
        metrics: {
          where: { date: { gte: sinceDate } },
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

    // Group by root (text before "|")
    const rootMap = new Map<string, {
      impressions: number;
      clicks: number;
      cost: number;
      sales: number;
      orders: number;
      keywordIds: Set<string>;
      campaignIds: Set<string>;
      syntaxGroups: Set<string>;
    }>();

    for (const keyword of keywords) {
      const syntaxGroup = keyword.syntaxGroup as string;
      const pipeIdx = syntaxGroup.indexOf('|');
      const root = pipeIdx >= 0 ? syntaxGroup.substring(0, pipeIdx).trim() : syntaxGroup;

      if (!rootMap.has(root)) {
        rootMap.set(root, {
          impressions: 0,
          clicks: 0,
          cost: 0,
          sales: 0,
          orders: 0,
          keywordIds: new Set(),
          campaignIds: new Set(),
          syntaxGroups: new Set(),
        });
      }

      const entry = rootMap.get(root)!;
      entry.keywordIds.add(keyword.id);
      entry.campaignIds.add(keyword.adGroup.campaign.id);
      entry.syntaxGroups.add(syntaxGroup);

      for (const m of keyword.metrics) {
        entry.impressions += m.impressions;
        entry.clicks += m.clicks;
        entry.cost += parseFloat(m.cost.toString());
        entry.sales += parseFloat(m.sales.toString());
        entry.orders += m.orders;
      }
    }

    const roots = Array.from(rootMap.entries()).map(([root, data]) => {
      const ctr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
      const cvr = data.clicks > 0 ? (data.orders / data.clicks) * 100 : 0;
      const cpc = data.clicks > 0 ? data.cost / data.clicks : 0;
      const acos = data.sales > 0 ? (data.cost / data.sales) * 100 : 0;
      const roas = data.cost > 0 ? data.sales / data.cost : 0;

      return {
        root,
        syntaxGroupCount: data.syntaxGroups.size,
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
        subGroups: Array.from(data.syntaxGroups).sort(),
      };
    });

    roots.sort((a, b) => b.metrics.cost - a.metrics.cost);

    return NextResponse.json({ roots });
  } catch (error) {
    console.error('Error fetching root index:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
