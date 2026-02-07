import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { success } = await checkRateLimit(session.user.id, 20, 60000);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const uploads: any[] = await prisma.reportUpload.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      uploads: uploads.map((u) => ({
        id: u.id,
        fileName: u.fileName,
        reportMonth: u.reportMonth,
        status: u.status,
        campaignCount: u.campaignCount,
        keywordCount: u.keywordCount,
        searchTermCount: u.searchTermCount,
        errorMessage: u.errorMessage,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
