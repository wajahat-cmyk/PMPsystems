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
    const days = parseInt(searchParams.get('days') || '30', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    // Find search terms by direct campaignId or through keyword->adGroup->campaign chain
    const searchTerms: any[] = await prisma.searchTerm.findMany({
      where: {
        date: { gte: sinceDate },
        OR: [
          { campaignId: id },
          {
            keyword: {
              adGroup: {
                campaignId: id,
              },
            },
          },
        ],
      },
      include: {
        keyword: {
          select: { keywordText: true },
        },
      },
    });

    // Aggregate by searchTerm text across dates
    const termMap = new Map<string, {
      searchTerm: string;
      keywordText: string;
      impressions: number;
      clicks: number;
      cost: number;
      sales: number;
      orders: number;
    }>();

    for (const st of searchTerms) {
      const key = st.searchTerm;

      if (!termMap.has(key)) {
        termMap.set(key, {
          searchTerm: st.searchTerm,
          keywordText: st.keyword.keywordText,
          impressions: 0,
          clicks: 0,
          cost: 0,
          sales: 0,
          orders: 0,
        });
      }

      const entry = termMap.get(key)!;
      entry.impressions += st.impressions;
      entry.clicks += st.clicks;
      entry.cost += parseFloat(st.cost.toString());
      entry.sales += parseFloat(st.sales.toString());
      entry.orders += st.orders;
    }

    // Convert to array with calculated metrics, sort by clicks desc, limit
    const aggregated = Array.from(termMap.values())
      .map((term) => ({
        ...term,
        ctr: term.impressions > 0
          ? (term.clicks / term.impressions) * 100
          : 0,
        cpc: term.clicks > 0
          ? term.cost / term.clicks
          : 0,
        acos: term.sales > 0
          ? (term.cost / term.sales) * 100
          : 0,
        roas: term.cost > 0
          ? term.sales / term.cost
          : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit);

    return NextResponse.json({ searchTerms: aggregated });
  } catch (error) {
    console.error('Error fetching campaign search terms:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
