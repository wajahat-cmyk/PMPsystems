import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { validateChangeSetItems } from '@/lib/change-set-validation';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { success } = await checkRateLimit(session.user.id + ':change-sets', 20, 60000);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { items, name } = await request.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Validate required fields
    for (const item of items) {
      if (!item.entityType || !item.entityId || !item.entityName || !item.changes) {
        return NextResponse.json(
          { error: 'Each item requires entityType, entityId, entityName, and changes' },
          { status: 400 }
        );
      }
    }

    // Validate changes values
    const validationErrors = validateChangeSetItems(items);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', validationErrors },
        { status: 400 }
      );
    }

    const changeSet = await (prisma as any).changeSet.create({
      data: {
        userId: session.user.id,
        name: name || null,
        status: 'DRAFT',
        items: {
          create: items.map((item: any) => ({
            entityType: item.entityType,
            entityId: item.entityId,
            entityName: item.entityName,
            campaignName: item.campaignName || null,
            adGroupName: item.adGroupName || null,
            amazonCampaignId: item.amazonCampaignId || null,
            amazonAdGroupId: item.amazonAdGroupId || null,
            amazonKeywordId: item.amazonKeywordId || null,
            matchType: item.matchType || null,
            changes: item.changes,
            previousValues: item.previousValues || null,
          })),
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ changeSet }, { status: 201 });
  } catch (error) {
    console.error('Error creating change set:', error);
    return NextResponse.json(
      { error: 'Failed to create change set' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const changeSets = await (prisma as any).changeSet.findMany({
      where: { userId: session.user.id },
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      changeSets: changeSets.map((cs: any) => ({
        id: cs.id,
        name: cs.name,
        status: cs.status,
        itemCount: cs._count.items,
        createdAt: cs.createdAt.toISOString(),
        updatedAt: cs.updatedAt.toISOString(),
        exportedAt: cs.exportedAt?.toISOString() || null,
        appliedAt: cs.appliedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error('Error fetching change sets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch change sets' },
      { status: 500 }
    );
  }
}
