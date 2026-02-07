import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { validateChangeSetItems } from '@/lib/change-set-validation';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const changeSet = await (prisma as any).changeSet.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!changeSet || changeSet.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (!['DRAFT', 'EXPORTED'].includes(changeSet.status)) {
      return NextResponse.json(
        { error: 'Can only apply change sets in DRAFT or EXPORTED status' },
        { status: 400 }
      );
    }

    // Validate before applying
    const validationErrors = validateChangeSetItems(changeSet.items);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', validationErrors },
        { status: 400 }
      );
    }

    const errors: string[] = [];

    for (const item of changeSet.items) {
      const changes = item.changes as Record<string, any>;

      try {
        if (item.entityType === 'CAMPAIGN') {
          const updateData: Record<string, any> = {};
          if (changes.budget != null) updateData.dailyBudget = changes.budget;
          if (changes.state != null) updateData.state = changes.state.toUpperCase();
          if (changes.tosModifier != null) updateData.tosModifier = changes.tosModifier;
          if (changes.rosModifier != null) updateData.rosModifier = changes.rosModifier;
          if (changes.pdpModifier != null) updateData.pdpModifier = changes.pdpModifier;

          if (Object.keys(updateData).length > 0) {
            await prisma.campaign.update({
              where: { id: item.entityId },
              data: updateData,
            });
          }
        } else if (item.entityType === 'KEYWORD') {
          const updateData: Record<string, any> = {};
          if (changes.bid != null) updateData.bid = changes.bid;
          if (changes.state != null) updateData.state = changes.state.toUpperCase();

          if (Object.keys(updateData).length > 0) {
            await prisma.keyword.update({
              where: { id: item.entityId },
              data: updateData,
            });
          }
        }
      } catch (itemError) {
        errors.push(`Failed to apply ${item.entityType} "${item.entityName}": ${itemError instanceof Error ? itemError.message : 'Unknown error'}`);
      }
    }

    if (errors.length > 0) {
      await (prisma as any).changeSet.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage: errors.join('\n'),
        },
      });

      return NextResponse.json(
        { error: 'Some changes failed to apply', errors },
        { status: 207 }
      );
    }

    await (prisma as any).changeSet.update({
      where: { id },
      data: {
        status: 'APPLIED',
        appliedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, status: 'APPLIED' });
  } catch (error) {
    console.error('Error applying change set:', error);
    return NextResponse.json({ error: 'Failed to apply change set' }, { status: 500 });
  }
}
