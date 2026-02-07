import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { getAmazonClientByUserId } from '@/lib/amazon-api/auth';
import {
  calculateAcos,
  calculateRoas,
  calculateCtr,
  calculateCpc,
} from '@/lib/utils/calculations';

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get user's Amazon profile
    const profile = await prisma.amazonProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Amazon profile not connected' },
        { status: 404 }
      );
    }

    // Update sync status to 'syncing'
    await prisma.amazonProfile.update({
      where: { id: profile.id },
      data: { syncStatus: 'syncing' },
    });

    // Create sync history record
    const syncHistory = await prisma.syncHistory.create({
      data: {
        profileId: profile.id,
        syncType: 'MANUAL',
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    try {
      // Get Amazon API client
      const client = await getAmazonClientByUserId(session.user.id);

      let recordsProcessed = 0;

      // 1. Sync Campaigns
      const campaigns = await client.getCampaigns();

      for (const amazonCampaign of campaigns) {
        await prisma.campaign.upsert({
          where: { amazonCampaignId: amazonCampaign.campaignId },
          create: {
            profileId: profile.id,
            amazonCampaignId: amazonCampaign.campaignId,
            name: amazonCampaign.name,
            campaignType: amazonCampaign.campaignType,
            targetingType: amazonCampaign.targetingType,
            state: amazonCampaign.state,
            dailyBudget: amazonCampaign.dailyBudget,
            startDate: new Date(amazonCampaign.startDate),
            endDate: amazonCampaign.endDate
              ? new Date(amazonCampaign.endDate)
              : null,
          },
          update: {
            name: amazonCampaign.name,
            campaignType: amazonCampaign.campaignType,
            targetingType: amazonCampaign.targetingType,
            state: amazonCampaign.state,
            dailyBudget: amazonCampaign.dailyBudget,
            endDate: amazonCampaign.endDate
              ? new Date(amazonCampaign.endDate)
              : null,
          },
        });
        recordsProcessed++;
      }

      // 2. Sync Campaign Performance Metrics (last 30 days)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const performanceData = await client.getCampaignPerformanceReport(
        startDate,
        endDate
      );

      // Process performance data
      for (const record of performanceData) {
        const campaign = await prisma.campaign.findUnique({
          where: { amazonCampaignId: record.campaignId },
        });

        if (!campaign) continue;

        const cost = parseFloat(record.cost) || 0;
        const sales = parseFloat(record.sales) || 0;
        const clicks = parseInt(record.clicks) || 0;
        const impressions = parseInt(record.impressions) || 0;
        const orders = parseInt(record.purchases) || 0;
        const units = parseInt(record.attributedUnitsOrdered) || 0;

        const acos = calculateAcos(cost, sales);
        const roas = calculateRoas(sales, cost);
        const ctr = calculateCtr(clicks, impressions);
        const cpc = calculateCpc(cost, clicks);

        await prisma.campaignMetric.upsert({
          where: {
            campaignId_date: {
              campaignId: campaign.id,
              date: new Date(record.date),
            },
          },
          create: {
            campaignId: campaign.id,
            date: new Date(record.date),
            impressions,
            clicks,
            cost,
            sales,
            orders,
            units,
            ctr,
            cpc,
            acos,
            roas,
          },
          update: {
            impressions,
            clicks,
            cost,
            sales,
            orders,
            units,
            ctr,
            cpc,
            acos,
            roas,
          },
        });
        recordsProcessed++;
      }

      // 3. Sync Ad Groups and Keywords for each campaign
      for (const campaign of campaigns.slice(0, 5)) {
        // Limit to first 5 campaigns to avoid timeout
        const dbCampaign = await prisma.campaign.findUnique({
          where: { amazonCampaignId: campaign.campaignId },
        });

        if (!dbCampaign) continue;

        const adGroups = await client.getAdGroups(campaign.campaignId);

        for (const amazonAdGroup of adGroups) {
          await prisma.adGroup.upsert({
            where: { amazonAdGroupId: amazonAdGroup.adGroupId },
            create: {
              campaignId: dbCampaign.id,
              amazonAdGroupId: amazonAdGroup.adGroupId,
              name: amazonAdGroup.name,
              defaultBid: amazonAdGroup.defaultBid,
              state: amazonAdGroup.state,
            },
            update: {
              name: amazonAdGroup.name,
              defaultBid: amazonAdGroup.defaultBid,
              state: amazonAdGroup.state,
            },
          });
          recordsProcessed++;

          // Sync keywords for this ad group
          const keywords = await client.getKeywords(amazonAdGroup.adGroupId);

          for (const amazonKeyword of keywords) {
            const dbAdGroup = await prisma.adGroup.findUnique({
              where: { amazonAdGroupId: amazonAdGroup.adGroupId },
            });

            if (!dbAdGroup) continue;

            await prisma.keyword.upsert({
              where: { amazonKeywordId: amazonKeyword.keywordId },
              create: {
                adGroupId: dbAdGroup.id,
                amazonKeywordId: amazonKeyword.keywordId,
                keywordText: amazonKeyword.keywordText,
                matchType: amazonKeyword.matchType.toUpperCase(),
                bid: amazonKeyword.bid,
                state: amazonKeyword.state,
              },
              update: {
                keywordText: amazonKeyword.keywordText,
                matchType: amazonKeyword.matchType.toUpperCase(),
                bid: amazonKeyword.bid,
                state: amazonKeyword.state,
              },
            });
            recordsProcessed++;
          }
        }
      }

      // Update sync status to 'completed'
      await prisma.amazonProfile.update({
        where: { id: profile.id },
        data: {
          syncStatus: 'completed',
          lastSyncAt: new Date(),
        },
      });

      // Update sync history
      await prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'SUCCESS',
          recordsProcessed,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        recordsProcessed,
        message: 'Data synchronization completed successfully',
      });
    } catch (error) {
      console.error('Sync error:', error);

      // Update sync status to 'failed'
      await prisma.amazonProfile.update({
        where: { id: profile.id },
        data: { syncStatus: 'failed' },
      });

      // Update sync history
      await prisma.syncHistory.update({
        where: { id: syncHistory.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          error: 'Sync failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Sync initialization error:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize sync',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
