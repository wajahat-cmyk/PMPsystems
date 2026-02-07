import { prisma } from '@/lib/db/prisma';

/**
 * Check campaigns for alert conditions and create alerts
 */
export async function checkAndCreateAlerts(
  userId: string,
  profileId: string
): Promise<number> {
  let alertsCreated = 0;

  const campaigns: any[] = await prisma.campaign.findMany({
    where: { profileId, state: 'enabled' },
    include: {
      metrics: {
        orderBy: { date: 'desc' },
        take: 1,
      },
      budgetSnapshots: {
        orderBy: { date: 'desc' },
        take: 1,
      },
    },
  });

  for (const campaign of campaigns) {
    const latestMetric = campaign.metrics[0];
    if (!latestMetric) continue;

    const acos = parseFloat(latestMetric.acos.toString());
    const roas = parseFloat(latestMetric.roas.toString());
    const targetAcos = campaign.targetAcos
      ? parseFloat(campaign.targetAcos.toString())
      : null;
    const targetRoas = campaign.targetRoas
      ? parseFloat(campaign.targetRoas.toString())
      : null;

    // Check High ACOS
    if (targetAcos && acos > targetAcos * 1.2) {
      const created = await createAlertIfNew({
        userId,
        type: 'HIGH_ACOS',
        severity: acos > targetAcos * 1.5 ? 'CRITICAL' : 'WARNING',
        title: `High ACOS: ${campaign.name}`,
        message: `Campaign ACOS (${acos.toFixed(1)}%) is above target (${targetAcos}%). Consider reducing bids or pausing underperforming keywords.`,
        metadata: {
          campaignId: campaign.id,
          campaignName: campaign.name,
          currentAcos: acos,
          targetAcos,
        },
      });
      if (created) alertsCreated++;
    }

    // Check Low ROAS
    if (targetRoas && roas < targetRoas * 0.8) {
      const created = await createAlertIfNew({
        userId,
        type: 'LOW_ROAS',
        severity: roas < targetRoas * 0.5 ? 'CRITICAL' : 'WARNING',
        title: `Low ROAS: ${campaign.name}`,
        message: `Campaign ROAS (${roas.toFixed(2)}x) is below target (${targetRoas}x). Review your targeting and bid strategy.`,
        metadata: {
          campaignId: campaign.id,
          campaignName: campaign.name,
          currentRoas: roas,
          targetRoas,
        },
      });
      if (created) alertsCreated++;
    }

    // Check Budget Pacing
    const latestBudget = campaign.budgetSnapshots[0];
    if (latestBudget) {
      const pacePercentage = parseFloat(
        latestBudget.pacePercentage.toString()
      );

      if (pacePercentage > 150) {
        const created = await createAlertIfNew({
          userId,
          type: 'BUDGET_PACING',
          severity: pacePercentage > 200 ? 'CRITICAL' : 'WARNING',
          title: `Budget Overspending: ${campaign.name}`,
          message: `Campaign is pacing at ${pacePercentage.toFixed(0)}% of daily budget ($${campaign.dailyBudget}). Budget may be exhausted early.`,
          metadata: {
            campaignId: campaign.id,
            campaignName: campaign.name,
            pacePercentage,
            dailyBudget: parseFloat(campaign.dailyBudget.toString()),
          },
        });
        if (created) alertsCreated++;
      }
    }

    // Check if daily spend exceeds budget
    const cost = parseFloat(latestMetric.cost.toString());
    const dailyBudget = parseFloat(campaign.dailyBudget.toString());

    if (cost > dailyBudget * 0.9) {
      const created = await createAlertIfNew({
        userId,
        type: 'BUDGET_EXCEEDED',
        severity: cost > dailyBudget ? 'CRITICAL' : 'WARNING',
        title: `Budget Alert: ${campaign.name}`,
        message: `Campaign has spent ${((cost / dailyBudget) * 100).toFixed(0)}% of its daily budget ($${formatBudget(cost)} / $${formatBudget(dailyBudget)}).`,
        metadata: {
          campaignId: campaign.id,
          campaignName: campaign.name,
          spent: cost,
          budget: dailyBudget,
        },
      });
      if (created) alertsCreated++;
    }
  }

  return alertsCreated;
}

/**
 * Create alert only if a similar unresolved alert doesn't already exist
 */
async function createAlertIfNew(data: {
  userId: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  metadata: any;
}): Promise<boolean> {
  // Check for existing unresolved alert of same type for same campaign
  const existing = await prisma.alert.findFirst({
    where: {
      userId: data.userId,
      type: data.type,
      isResolved: false,
      // Check within last 24 hours to avoid duplicate alerts
      triggeredAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  if (existing) return false;

  await prisma.alert.create({ data });
  return true;
}

function formatBudget(value: number): string {
  return value.toFixed(2);
}
