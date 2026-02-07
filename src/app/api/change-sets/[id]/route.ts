import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(
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

    return NextResponse.json({ changeSet });
  } catch (error) {
    console.error('Error fetching change set:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
    });

    if (!changeSet || changeSet.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (changeSet.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only delete change sets in DRAFT status' },
        { status: 400 }
      );
    }

    await (prisma as any).changeSet.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting change set:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
