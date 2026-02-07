import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();

    // Verify alert belongs to user
    const alert = await prisma.alert.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        isRead: body.isRead ?? alert.isRead,
        isResolved: body.isResolved ?? alert.isResolved,
        readAt: body.isRead ? new Date() : alert.readAt,
        resolvedAt: body.isResolved ? new Date() : alert.resolvedAt,
      },
    });

    return NextResponse.json({ alert: updated });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
