import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { generateBulksheetXlsx } from '@/lib/bulksheet-exporter';
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
        { error: 'Can only export change sets in DRAFT or EXPORTED status' },
        { status: 400 }
      );
    }

    // Validate before export
    const validationErrors = validateChangeSetItems(changeSet.items);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', validationErrors },
        { status: 400 }
      );
    }

    // Generate XLSX
    const xlsxBuffer = generateBulksheetXlsx(changeSet.items);

    // Update status
    await (prisma as any).changeSet.update({
      where: { id },
      data: {
        status: 'EXPORTED',
        exportedAt: new Date(),
      },
    });

    const fileName = changeSet.name
      ? `change-set-${changeSet.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.xlsx`
      : `change-set-${id}.xlsx`;

    return new NextResponse(new Uint8Array(xlsxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting change set:', error);
    return NextResponse.json({ error: 'Failed to export change set' }, { status: 500 });
  }
}
