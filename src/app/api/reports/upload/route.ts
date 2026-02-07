import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseAmazonBulkReport } from '@/lib/bulk-report-parser';

export const maxDuration = 120; // Allow up to 2 minutes for large uploads

const BATCH_SIZE = 500;

async function batchCreateMany<T>(
  model: { createMany: (args: { data: T[]; skipDuplicates?: boolean }) => Promise<any> },
  data: T[],
) {
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    await model.createMany({ data: data.slice(i, i + BATCH_SIZE), skipDuplicates: true });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Stricter rate limit for uploads: 5 per hour
  const { success } = await checkRateLimit(session.user.id + ':upload', 5, 3600000);
  if (!success) {
    return NextResponse.json({ error: 'Upload rate limit exceeded' }, { status: 429 });
  }

  try {
    // Verify DB is reachable before starting long operation
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
    } catch (connErr) {
      console.error('[Upload] Database connection check failed:', connErr);
      return NextResponse.json(
        { error: 'Database is unavailable. Please try again in a moment.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Only .xlsx files are supported' }, { status: 400 });
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    console.log('[Upload] Step 1: File validated, creating upload record');
    // Create upload record
    const upload = await prisma.reportUpload.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        reportMonth: new Date().toISOString().slice(0, 7),
        status: 'PROCESSING',
      },
    });

    try {
      console.log('[Upload] Step 2: Parsing report file');
      // Parse the report
      const report = parseAmazonBulkReport(buffer);
      console.log(`[Upload] Step 2 complete: ${report.campaigns.length} campaigns, ${report.keywords.length} keywords, ${report.searchTerms.length} search terms`);

      console.log('[Upload] Step 3: Ensuring Amazon profile exists');
      // Ensure user has an AmazonProfile
      let profile: any = await prisma.amazonProfile.findUnique({
        where: { userId: session.user.id },
      });

      if (!profile) {
        profile = await prisma.amazonProfile.create({
          data: {
            userId: session.user.id,
            profileId: `upload-${session.user.id}`,
            countryCode: 'US',
            currencyCode: 'USD',
            timezone: 'America/Los_Angeles',
            accountType: 'SELLER',
            accessToken: 'upload-mode',
            refreshToken: 'upload-mode',
            tokenExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            syncStatus: 'completed',
            lastSyncAt: new Date(),
          },
        });
      }

      const reportDate = new Date();
      reportDate.setHours(0, 0, 0, 0);

      console.log('[Upload] Step 4: Deleting old data for profile');
      // ── Delete all old data for this profile (cascades through all relations) ──
      await prisma.campaign.deleteMany({
        where: { profileId: profile.id },
      });

      // Deactivate old dataset versions
      await prisma.datasetVersion.updateMany({
        where: { profileId: profile.id, isActive: true },
        data: { isActive: false },
      });

      // Create new dataset version
      const datasetVersion = await prisma.datasetVersion.create({
        data: {
          profileId: profile.id,
          uploadId: upload.id,
          label: `${file.name} - ${new Date().toLocaleDateString()}`,
          isActive: true,
        },
      });

      console.log('[Upload] Step 5: Creating campaigns');
      // ── Batch create campaigns ──
      if (report.campaigns.length > 0) {
        await prisma.campaign.createMany({
          skipDuplicates: true,
          data: report.campaigns.map((c) => ({
            profileId: profile.id,
            amazonCampaignId: c.amazonCampaignId,
            name: c.name,
            campaignType: 'SPONSORED_PRODUCTS',
            targetingType: c.targetingType || 'MANUAL',
            state: c.state.toUpperCase(),
            dailyBudget: c.dailyBudget,
            startDate: new Date(),
            portfolio: c.portfolio,
            biddingStrategy: c.biddingStrategy,
          })),
        });
      }

      // Build campaign ID map
      const campaignRows: any[] = await prisma.campaign.findMany({
        where: { profileId: profile.id },
        select: { id: true, amazonCampaignId: true },
      });
      const campaignIdMap = new Map(campaignRows.map((c) => [c.amazonCampaignId, c.id]));

      console.log('[Upload] Step 6: Creating campaign metrics');
      // ── Batch create campaign metrics ──
      const campaignMetrics = report.campaigns
        .filter((c) => campaignIdMap.has(c.amazonCampaignId))
        .map((c) => ({
          campaignId: campaignIdMap.get(c.amazonCampaignId)!,
          date: reportDate,
          impressions: c.impressions,
          clicks: c.clicks,
          cost: c.spend,
          sales: c.sales,
          orders: c.orders,
          units: c.units,
          ctr: c.ctr,
          cpc: c.cpc,
          acos: c.acos,
          roas: c.roas,
        }));
      if (campaignMetrics.length > 0) {
        await prisma.campaignMetric.createMany({ data: campaignMetrics, skipDuplicates: true });
      }

      console.log('[Upload] Step 7: Creating ad groups');
      // ── Batch create ad groups ──
      const adGroupData = report.adGroups
        .filter((ag) => campaignIdMap.has(ag.amazonCampaignId))
        .map((ag) => ({
          campaignId: campaignIdMap.get(ag.amazonCampaignId)!,
          amazonAdGroupId: ag.amazonAdGroupId,
          name: ag.name,
          defaultBid: ag.defaultBid || 1.0,
          state: ag.state.toUpperCase(),
        }));
      if (adGroupData.length > 0) {
        await prisma.adGroup.createMany({ data: adGroupData, skipDuplicates: true });
      }

      // Build ad group ID map
      const adGroupRows: any[] = await prisma.adGroup.findMany({
        where: { campaign: { profileId: profile.id } },
        select: { id: true, amazonAdGroupId: true },
      });
      const adGroupIdMap = new Map(adGroupRows.map((ag) => [ag.amazonAdGroupId, ag.id]));

      console.log('[Upload] Step 8: Creating keywords');
      // ── Batch create keywords ──
      const keywordData = report.keywords
        .filter((kw) => adGroupIdMap.has(kw.amazonAdGroupId))
        .map((kw) => ({
          adGroupId: adGroupIdMap.get(kw.amazonAdGroupId)!,
          amazonKeywordId: kw.amazonKeywordId,
          keywordText: kw.keywordText,
          matchType: kw.matchType,
          bid: kw.bid,
          state: kw.state.toUpperCase(),
          syntaxGroup: kw.syntaxGroup,
        }));
      if (keywordData.length > 0) {
        await batchCreateMany(prisma.keyword, keywordData);
      }

      // Build keyword ID map
      const keywordRows: any[] = await prisma.keyword.findMany({
        where: { adGroup: { campaign: { profileId: profile.id } } },
        select: { id: true, amazonKeywordId: true },
      });
      const keywordIdMap = new Map(keywordRows.map((kw) => [kw.amazonKeywordId, kw.id]));

      console.log('[Upload] Step 9: Creating keyword metrics');
      // ── Batch create keyword metrics ──
      const keywordMetrics = report.keywords
        .filter((kw) => keywordIdMap.has(kw.amazonKeywordId))
        .map((kw) => ({
          keywordId: keywordIdMap.get(kw.amazonKeywordId)!,
          date: reportDate,
          impressions: kw.impressions,
          clicks: kw.clicks,
          cost: kw.spend,
          sales: kw.sales,
          orders: kw.orders,
          ctr: kw.ctr,
          cpc: kw.cpc,
          acos: kw.acos,
          roas: kw.roas,
        }));
      if (keywordMetrics.length > 0) {
        await batchCreateMany(prisma.keywordMetric, keywordMetrics);
      }

      console.log('[Upload] Step 10: Creating placement metrics');
      // ── Batch create placement metrics + update campaign modifiers ──
      const placementMetrics = report.placements
        .filter((p) => campaignIdMap.has(p.amazonCampaignId))
        .map((p) => ({
          campaignId: campaignIdMap.get(p.amazonCampaignId)!,
          placement: p.placement,
          date: reportDate,
          impressions: p.impressions,
          clicks: p.clicks,
          cost: p.spend,
          sales: p.sales,
          orders: p.orders,
          ctr: p.ctr,
          cpc: p.cpc,
          acos: p.acos,
          roas: p.roas,
        }));
      if (placementMetrics.length > 0) {
        await prisma.placementMetric.createMany({ data: placementMetrics, skipDuplicates: true });
      }

      // Update placement modifiers on campaigns
      for (const p of report.placements) {
        const campId = campaignIdMap.get(p.amazonCampaignId);
        if (!campId) continue;
        const modifierField =
          p.placement === 'TOP_OF_SEARCH' ? 'tosModifier' :
          p.placement === 'REST_OF_SEARCH' ? 'rosModifier' :
          p.placement === 'PRODUCT_PAGES' ? 'pdpModifier' : null;
        if (modifierField) {
          await prisma.campaign.update({
            where: { id: campId },
            data: { [modifierField]: p.percentage },
          });
        }
      }

      console.log('[Upload] Step 11: Creating search terms');
      // ── Batch create search terms ──
      const searchTermData = report.searchTerms
        .filter((st) => keywordIdMap.has(st.amazonKeywordId))
        .map((st) => ({
          keywordId: keywordIdMap.get(st.amazonKeywordId)!,
          campaignId: campaignIdMap.get(st.amazonCampaignId) || null,
          adGroupId: adGroupIdMap.get(st.amazonAdGroupId) || null,
          searchTerm: st.searchTerm,
          date: reportDate,
          impressions: st.impressions,
          clicks: st.clicks,
          cost: st.spend,
          sales: st.sales,
          orders: st.orders,
        }));
      if (searchTermData.length > 0) {
        await batchCreateMany(prisma.searchTerm, searchTermData);
      }

      console.log('[Upload] Step 12: Finalizing — updating upload status');
      // Update upload status
      await prisma.reportUpload.update({
        where: { id: upload.id },
        data: {
          status: 'COMPLETED',
          campaignCount: report.campaigns.length,
          keywordCount: report.keywords.length,
          searchTermCount: report.searchTerms.length,
        },
      });

      // Update profile sync status
      await prisma.amazonProfile.update({
        where: { id: profile.id },
        data: {
          lastSyncAt: new Date(),
          syncStatus: 'completed',
          activeDatasetVersionId: datasetVersion.id,
        },
      });

      return NextResponse.json(
        {
          upload: {
            id: upload.id,
            fileName: upload.fileName,
            status: 'COMPLETED',
            campaignCount: report.campaigns.length,
            keywordCount: report.keywords.length,
            searchTermCount: report.searchTerms.length,
          },
        },
        { status: 201 }
      );
    } catch (parseError) {
      console.error('Upload processing error:', parseError);
      // Mark upload as failed (connection may be dead, so wrap in try/catch)
      try {
        await prisma.reportUpload.update({
          where: { id: upload.id },
          data: {
            status: 'FAILED',
            errorMessage: parseError instanceof Error ? parseError.message : 'Unknown error',
          },
        });
      } catch {
        console.error('Failed to mark upload as FAILED (connection lost)');
      }
      throw parseError;
    }
  } catch (error) {
    console.error('Error uploading report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process report' },
      { status: 500 }
    );
  }
}
