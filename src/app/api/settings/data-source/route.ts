import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const updateSchema = z.object({
  dataSource: z.enum(['API', 'BULK']),
});

/**
 * GET - Get current data source mode
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dataSource: true },
    });

    return NextResponse.json({ dataSource: user?.dataSource || 'BULK' });
  } catch (error) {
    console.error('Get data source error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT - Switch data source mode
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dataSource } = updateSchema.parse(body);

    // If switching to API, verify credentials exist
    if (dataSource === 'API') {
      const profile = await prisma.amazonProfile.findUnique({
        where: { userId: session.user.id },
        select: { clientId: true },
      });

      if (!profile?.clientId) {
        return NextResponse.json(
          { error: 'Please save your API credentials first before switching to API mode.' },
          { status: 400 }
        );
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { dataSource },
    });

    return NextResponse.json({ dataSource });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Update data source error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
