import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAmazonClient } from '@/lib/amazon-api/auth';
import { checkAndCreateAlerts } from '@/lib/alerts/detector';
import {
  calculateAcos,
  calculateRoas,
  calculateCtr,
  calculateCpc,
} from '@/lib/utils/calculations';

/**
 * Cron job endpoint for scheduled data sync
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/webhooks/cron",
 *     "schedule": "0 2 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const profiles = await prisma.amazonProfile.findMany({
      include: { user: true },
    });

    const results = [];

    for (const profile of profiles) {
      try {
        // Update sync status
        await prisma.amazonProfile.update({
          where: { id: profile.id },
          data: { syncStatus: 'syncing' },
        });

        // Create sync history
        const syncHistory = await prisma.syncHistory.create({
          data: {
            profileId: profile.id,
            syncType: 'SCHEDULED',
            status: 'IN_PROGRESS',
          },
        });

        const client = await getAmazonClient(profile.profileId);
        let recordsProcessed = 0;

        // Sync campaigns
        const campaigns = await client.getCampaigns();
        for (const campaign of campaigns) {
          await prisma.campaign.upsert({
            where: { amazonCampaignId: campaign.campaignId },
            create: {
              profileId: profile.id,
              amazonCampaignId: campaign.campaignId,
              name: campaign.name,
              campaignType: campaign.campaignType,
              targetingType: campaign.targetingType,
              state: campaign.state,
              dailyBudget: campaign.dailyBudget,
              startDate: new Date(campaign.startDate),
              endDate: campaign.endDate
                ? new Date(campaign.endDate)
                : null,
            },
            update: {
              name: campaign.name,
              state: campaign.state,
              dailyBudget: campaign.dailyBudget,
            },
          });
          recordsProcessed++;
        }

        // Sync performance metrics (last 7 days for daily cron)
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];

        try {
          const performanceData = await client.getCampaignPerformanceReport(
            startDate,
            endDate
          );

          for (const record of performanceData) {
            const dbCampaign = await prisma.campaign.findUnique({
              where: { amazonCampaignId: record.campaignId },
            });

            if (!dbCampaign) continue;

            const cost = parseFloat(record.cost) || 0;
            const sales = parseFloat(record.sales) || 0;
            const clicks = parseInt(record.clicks) || 0;
            const impressions = parseInt(record.impressions) || 0;
            const orders = parseInt(record.purchases) || 0;
            const units = parseInt(record.attributedUnitsOrdered) || 0;

            await prisma.campaignMetric.upsert({
              where: {
                campaignId_date: {
                  campaignId: dbCampaign.id,
                  date: new Date(record.date),
                },
              },
              create: {
                campaignId: dbCampaign.id,
                date: new Date(record.date),
                impressions,
                clicks,
                cost,
                sales,
                orders,
                units,
                ctr: calculateCtr(clicks, impressions),
                cpc: calculateCpc(cost, clicks),
                acos: calculateAcos(cost, sales),
                roas: calculateRoas(sales, cost),
              },
              update: {
                impressions,
                clicks,
                cost,
                sales,
                orders,
                units,
                ctr: calculateCtr(clicks, impressions),
                cpc: calculateCpc(cost, clicks),
                acos: calculateAcos(cost, sales),
                roas: calculateRoas(sales, cost),
              },
            });
            recordsProcessed++;
          }
        } catch (reportError) {
          console.error(
            `Report fetch failed for profile ${profile.profileId}:`,
            reportError
          );
        }

        // Run alert detection
        const alertsCreated = await checkAndCreateAlerts(
          profile.userId,
          profile.id
        );

        // Update sync status
        await prisma.amazonProfile.update({
          where: { id: profile.id },
          data: {
            syncStatus: 'completed',
            lastSyncAt: new Date(),
          },
        });

        await prisma.syncHistory.update({
          where: { id: syncHistory.id },
          data: {
            status: 'SUCCESS',
            recordsProcessed,
            completedAt: new Date(),
          },
        });

        results.push({
          profileId: profile.profileId,
          status: 'success',
          recordsProcessed,
          alertsCreated,
        });
      } catch (profileError) {
        console.error(
          `Sync failed for profile ${profile.profileId}:`,
          profileError
        );

        await prisma.amazonProfile.update({
          where: { id: profile.id },
          data: { syncStatus: 'failed' },
        });

        results.push({
          profileId: profile.profileId,
          status: 'failed',
          error:
            profileError instanceof Error
              ? profileError.message
              : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      profilesSynced: profiles.length,
      results,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
