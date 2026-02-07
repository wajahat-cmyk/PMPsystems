import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { classifySyntax } from '../src/lib/syntax-classifier';

// Use direct TCP connection for seeding
const pool = new pg.Pool({
  connectionString: 'postgres://postgres:postgres@localhost:51214/template1?sslmode=disable',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Create demo user
  const hashedPassword = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@amazondashboard.com' },
    update: {},
    create: {
      email: 'demo@amazondashboard.com',
      name: 'Demo User',
      password: hashedPassword,
    },
  });
  console.log('Created demo user:', user.email);

  // 2. Create Amazon profile (simulated)
  const profile = await prisma.amazonProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      profileId: 'DEMO-PROFILE-001',
      countryCode: 'US',
      currencyCode: 'USD',
      timezone: 'America/Los_Angeles',
      accountType: 'SELLER',
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token',
      tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      syncStatus: 'completed',
      lastSyncAt: new Date(),
    },
  });
  console.log('Created Amazon profile');

  // 3. Create campaigns
  const campaignConfigs = [
    {
      amazonCampaignId: 'CAMP-SP-001',
      name: 'Wireless Earbuds - Sponsored Products',
      campaignType: 'SPONSORED_PRODUCTS',
      targetingType: 'MANUAL',
      state: 'enabled',
      dailyBudget: 50.0,
      targetAcos: 25.0,
      targetRoas: 4.0,
      tosModifier: 50.0,
      rosModifier: 0.0,
      pdpModifier: 25.0,
    },
    {
      amazonCampaignId: 'CAMP-SP-002',
      name: 'Phone Cases - Auto Campaign',
      campaignType: 'SPONSORED_PRODUCTS',
      targetingType: 'AUTO',
      state: 'enabled',
      dailyBudget: 30.0,
      targetAcos: 30.0,
      targetRoas: 3.3,
      tosModifier: undefined,
      rosModifier: undefined,
      pdpModifier: undefined,
    },
    {
      amazonCampaignId: 'CAMP-SB-001',
      name: 'Electronics Brand - Sponsored Brands',
      campaignType: 'SPONSORED_BRANDS',
      targetingType: 'MANUAL',
      state: 'enabled',
      dailyBudget: 75.0,
      targetAcos: 20.0,
      targetRoas: 5.0,
      tosModifier: 75.0,
      rosModifier: 10.0,
      pdpModifier: 30.0,
    },
    {
      amazonCampaignId: 'CAMP-SD-001',
      name: 'Retargeting - Sponsored Display',
      campaignType: 'SPONSORED_DISPLAY',
      targetingType: 'AUTO',
      state: 'enabled',
      dailyBudget: 40.0,
      targetAcos: 35.0,
      targetRoas: 2.8,
      tosModifier: undefined,
      rosModifier: undefined,
      pdpModifier: undefined,
    },
    {
      amazonCampaignId: 'CAMP-SP-003',
      name: 'USB Cables - Low Budget Test',
      campaignType: 'SPONSORED_PRODUCTS',
      targetingType: 'MANUAL',
      state: 'paused',
      dailyBudget: 15.0,
      targetAcos: 20.0,
      targetRoas: 5.0,
      tosModifier: undefined,
      rosModifier: undefined,
      pdpModifier: undefined,
    },
    {
      amazonCampaignId: 'CAMP-SP-004',
      name: 'Laptop Stand - New Launch',
      campaignType: 'SPONSORED_PRODUCTS',
      targetingType: 'MANUAL',
      state: 'enabled',
      dailyBudget: 60.0,
      targetAcos: 30.0,
      targetRoas: 3.3,
      tosModifier: 40.0,
      rosModifier: 0.0,
      pdpModifier: 15.0,
    },
  ];

  const campaigns = [];
  for (const config of campaignConfigs) {
    const campaign = await prisma.campaign.upsert({
      where: { amazonCampaignId: config.amazonCampaignId },
      update: {},
      create: {
        profileId: profile.id,
        amazonCampaignId: config.amazonCampaignId,
        name: config.name,
        campaignType: config.campaignType,
        targetingType: config.targetingType,
        state: config.state,
        dailyBudget: config.dailyBudget,
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        targetAcos: config.targetAcos,
        targetRoas: config.targetRoas,
        tosModifier: config.tosModifier,
        rosModifier: config.rosModifier,
        pdpModifier: config.pdpModifier,
      },
    });
    campaigns.push(campaign);
  }
  console.log(`Created ${campaigns.length} campaigns`);

  // 4. Generate 30 days of metrics for each campaign
  const baseMetrics = [
    { impressions: [8000, 15000], clicks: [200, 500], cost: [25, 55], sales: [80, 220], orders: [4, 12] },
    { impressions: [5000, 10000], clicks: [120, 300], cost: [15, 35], sales: [40, 120], orders: [2, 7] },
    { impressions: [12000, 25000], clicks: [300, 700], cost: [40, 80], sales: [150, 400], orders: [8, 20] },
    { impressions: [6000, 12000], clicks: [150, 350], cost: [20, 45], sales: [50, 140], orders: [3, 8] },
    { impressions: [2000, 5000], clicks: [50, 150], cost: [8, 18], sales: [20, 60], orders: [1, 4] },
    { impressions: [10000, 20000], clicks: [250, 600], cost: [30, 65], sales: [90, 260], orders: [5, 14] },
  ];

  let metricsCount = 0;
  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];
    const base = baseMetrics[i];

    for (let day = 0; day < 30; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);

      // Add some variance and a slight upward trend for recent days
      const trendMultiplier = 1 + (30 - day) * 0.008;
      const dayOfWeek = date.getDay();
      const weekendDip = dayOfWeek === 0 || dayOfWeek === 6 ? 0.75 : 1.0;

      const impressions = Math.round(randomBetween(base.impressions[0], base.impressions[1]) * trendMultiplier * weekendDip);
      const clicks = Math.round(randomBetween(base.clicks[0], base.clicks[1]) * trendMultiplier * weekendDip);
      const cost = parseFloat((randomBetween(base.cost[0], base.cost[1]) * trendMultiplier * weekendDip).toFixed(2));
      const sales = parseFloat((randomBetween(base.sales[0], base.sales[1]) * trendMultiplier * weekendDip).toFixed(2));
      const orders = Math.round(randomBetween(base.orders[0], base.orders[1]) * trendMultiplier * weekendDip);
      const units = orders + Math.round(Math.random() * 3);

      const ctr = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0;
      const cpc = clicks > 0 ? parseFloat((cost / clicks).toFixed(2)) : 0;
      const acos = sales > 0 ? parseFloat(((cost / sales) * 100).toFixed(2)) : 0;
      const roas = cost > 0 ? parseFloat((sales / cost).toFixed(2)) : 0;

      await prisma.campaignMetric.upsert({
        where: { campaignId_date: { campaignId: campaign.id, date } },
        update: {},
        create: {
          campaignId: campaign.id,
          date,
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
      metricsCount++;
    }
  }
  console.log(`Created ${metricsCount} campaign metrics`);

  // 5. Create Ad Groups and Keywords
  const keywordsData = [
    {
      campaignIndex: 0,
      adGroupName: 'Wireless Earbuds - Exact',
      adGroupId: 'AG-001',
      keywords: [
        { id: 'KW-001', text: 'wireless earbuds', match: 'EXACT', bid: 1.25 },
        { id: 'KW-002', text: 'bluetooth earbuds', match: 'EXACT', bid: 1.10 },
        { id: 'KW-003', text: 'earbuds with microphone', match: 'PHRASE', bid: 0.95 },
        { id: 'KW-004', text: 'noise cancelling earbuds', match: 'EXACT', bid: 1.50 },
        { id: 'KW-005', text: 'best wireless earbuds', match: 'BROAD', bid: 0.85 },
      ],
    },
    {
      campaignIndex: 0,
      adGroupName: 'Wireless Earbuds - Broad',
      adGroupId: 'AG-002',
      keywords: [
        { id: 'KW-006', text: 'earbuds for running', match: 'BROAD', bid: 0.75 },
        { id: 'KW-007', text: 'workout earbuds', match: 'PHRASE', bid: 0.80 },
        { id: 'KW-008', text: 'cheap wireless earbuds', match: 'BROAD', bid: 0.55 },
      ],
    },
    {
      campaignIndex: 2,
      adGroupName: 'Electronics Brand Keywords',
      adGroupId: 'AG-003',
      keywords: [
        { id: 'KW-009', text: 'electronics accessories', match: 'PHRASE', bid: 1.00 },
        { id: 'KW-010', text: 'tech gadgets', match: 'BROAD', bid: 0.90 },
        { id: 'KW-011', text: 'phone accessories', match: 'EXACT', bid: 1.15 },
      ],
    },
    {
      campaignIndex: 5,
      adGroupName: 'Laptop Stand Keywords',
      adGroupId: 'AG-004',
      keywords: [
        { id: 'KW-012', text: 'laptop stand', match: 'EXACT', bid: 1.30 },
        { id: 'KW-013', text: 'laptop riser', match: 'PHRASE', bid: 1.05 },
        { id: 'KW-014', text: 'adjustable laptop stand', match: 'EXACT', bid: 1.45 },
        { id: 'KW-015', text: 'desk laptop holder', match: 'BROAD', bid: 0.70 },
      ],
    },
  ];

  let kwCount = 0;
  for (const group of keywordsData) {
    const adGroup = await prisma.adGroup.upsert({
      where: { amazonAdGroupId: group.adGroupId },
      update: {},
      create: {
        campaignId: campaigns[group.campaignIndex].id,
        amazonAdGroupId: group.adGroupId,
        name: group.adGroupName,
        defaultBid: 1.0,
        state: 'ENABLED',
      },
    });

    for (const kw of group.keywords) {
      const keyword = await prisma.keyword.upsert({
        where: { amazonKeywordId: kw.id },
        update: {},
        create: {
          adGroupId: adGroup.id,
          amazonKeywordId: kw.id,
          keywordText: kw.text,
          matchType: kw.match,
          bid: kw.bid,
          state: 'ENABLED',
          syntaxGroup: classifySyntax(kw.text),
        },
      });

      // Generate 30 days of keyword metrics
      for (let day = 0; day < 30; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        date.setHours(0, 0, 0, 0);

        const impressions = Math.round(randomBetween(500, 3000));
        const clicks = Math.round(randomBetween(10, 80));
        const cost = parseFloat(randomBetween(2, 15).toFixed(2));
        const sales = parseFloat(randomBetween(5, 50).toFixed(2));
        const orders = Math.round(randomBetween(0, 4));

        const ctr = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0;
        const cpc = clicks > 0 ? parseFloat((cost / clicks).toFixed(2)) : 0;
        const acos = sales > 0 ? parseFloat(((cost / sales) * 100).toFixed(2)) : 0;
        const roas = cost > 0 ? parseFloat((sales / cost).toFixed(2)) : 0;

        await prisma.keywordMetric.upsert({
          where: { keywordId_date: { keywordId: keyword.id, date } },
          update: {},
          create: {
            keywordId: keyword.id,
            date,
            impressions,
            clicks,
            cost,
            sales,
            orders,
            ctr,
            cpc,
            acos,
            roas,
          },
        });
      }

      // Generate search terms for this keyword
      const searchTermVariants = getSearchTermVariants(kw.text);
      for (const st of searchTermVariants) {
        for (let day = 0; day < 30; day += 3) { // Every 3 days to keep volume manageable
          const date = new Date();
          date.setDate(date.getDate() - day);
          date.setHours(0, 0, 0, 0);

          const impressions = Math.round(randomBetween(50, 500) * st.relevance);
          const clicks = Math.round(randomBetween(1, 20) * st.relevance);
          const cost = parseFloat((randomBetween(0.5, 8) * st.relevance).toFixed(2));
          const sales = parseFloat((randomBetween(0, 30) * st.relevance * st.conversionFactor).toFixed(2));
          const orders = Math.round(randomBetween(0, 2) * st.conversionFactor);

          await prisma.searchTerm.upsert({
            where: {
              keywordId_searchTerm_date: {
                keywordId: keyword.id,
                searchTerm: st.term,
                date,
              },
            },
            update: {},
            create: {
              keywordId: keyword.id,
              campaignId: campaigns[group.campaignIndex].id,
              adGroupId: adGroup.id,
              searchTerm: st.term,
              date,
              impressions,
              clicks,
              cost,
              sales,
              orders,
            },
          });
        }
      }

      kwCount++;
    }
  }
  console.log(`Created ${kwCount} keywords with metrics and search terms`);

  // 5b. Create placement metrics for each campaign
  const placements = ['TOP_OF_SEARCH', 'REST_OF_SEARCH', 'PRODUCT_PAGES'];
  const placementSplits = { TOP_OF_SEARCH: 0.5, REST_OF_SEARCH: 0.3, PRODUCT_PAGES: 0.2 };
  let placementCount = 0;

  for (let i = 0; i < campaigns.length; i++) {
    const campaign = campaigns[i];
    const base = baseMetrics[i];

    for (let day = 0; day < 30; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);

      const trendMultiplier = 1 + (30 - day) * 0.008;
      const dayOfWeek = date.getDay();
      const weekendDip = dayOfWeek === 0 || dayOfWeek === 6 ? 0.75 : 1.0;

      for (const placement of placements) {
        const split = placementSplits[placement as keyof typeof placementSplits];
        const variance = randomBetween(0.8, 1.2);

        const impressions = Math.round(randomBetween(base.impressions[0], base.impressions[1]) * trendMultiplier * weekendDip * split * variance);
        const clicks = Math.round(randomBetween(base.clicks[0], base.clicks[1]) * trendMultiplier * weekendDip * split * variance);
        const cost = parseFloat((randomBetween(base.cost[0], base.cost[1]) * trendMultiplier * weekendDip * split * variance).toFixed(2));
        const sales = parseFloat((randomBetween(base.sales[0], base.sales[1]) * trendMultiplier * weekendDip * split * variance).toFixed(2));
        const orders = Math.round(randomBetween(base.orders[0], base.orders[1]) * trendMultiplier * weekendDip * split * variance);

        const ctr = impressions > 0 ? parseFloat(((clicks / impressions) * 100).toFixed(2)) : 0;
        const cpc = clicks > 0 ? parseFloat((cost / clicks).toFixed(2)) : 0;
        const acos = sales > 0 ? parseFloat(((cost / sales) * 100).toFixed(2)) : 0;
        const roas = cost > 0 ? parseFloat((sales / cost).toFixed(2)) : 0;

        await prisma.placementMetric.upsert({
          where: {
            campaignId_placement_date: {
              campaignId: campaign.id,
              placement,
              date,
            },
          },
          update: {},
          create: {
            campaignId: campaign.id,
            placement,
            date,
            impressions,
            clicks,
            cost,
            sales,
            orders,
            ctr,
            cpc,
            acos,
            roas,
          },
        });
        placementCount++;
      }
    }
  }
  console.log(`Created ${placementCount} placement metrics`);

  // 6. Create budget snapshots for today
  for (const campaign of campaigns.filter((c: any) => c.state === 'enabled')) {
    const dailyBudget = parseFloat((campaign as any).dailyBudget.toString());
    const hourOfDay = new Date().getHours();
    const spentToday = parseFloat((dailyBudget * (hourOfDay / 24) * randomBetween(0.7, 1.3)).toFixed(2));
    const pacing = parseFloat(((spentToday / dailyBudget) * 100).toFixed(2));

    await prisma.budgetSnapshot.upsert({
      where: {
        campaignId_date: {
          campaignId: campaign.id,
          date: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      update: {},
      create: {
        campaignId: campaign.id,
        date: new Date(new Date().setHours(0, 0, 0, 0)),
        dailyBudget,
        spentToday,
        remainingToday: parseFloat(Math.max(dailyBudget - spentToday, 0).toFixed(2)),
        pacePercentage: pacing,
        monthToDateSpend: parseFloat((spentToday * 20).toFixed(2)),
        projectedMonthly: parseFloat((spentToday * 30).toFixed(2)),
      },
    });
  }
  console.log('Created budget snapshots');

  // 7. Create some sample alerts
  const alerts = [
    {
      type: 'HIGH_ACOS',
      severity: 'WARNING',
      title: 'High ACOS: Retargeting - Sponsored Display',
      message: 'Campaign ACOS (38.5%) is above target (35%). Consider reducing bids or pausing underperforming keywords.',
      isRead: false,
    },
    {
      type: 'BUDGET_PACING',
      severity: 'CRITICAL',
      title: 'Budget Overspending: Electronics Brand - Sponsored Brands',
      message: 'Campaign is pacing at 165% of daily budget ($75.00). Budget may be exhausted early.',
      isRead: false,
    },
    {
      type: 'LOW_ROAS',
      severity: 'WARNING',
      title: 'Low ROAS: Phone Cases - Auto Campaign',
      message: 'Campaign ROAS (2.1x) is below target (3.3x). Review your targeting and bid strategy.',
      isRead: true,
    },
    {
      type: 'BUDGET_EXCEEDED',
      severity: 'INFO',
      title: 'Budget Alert: Laptop Stand - New Launch',
      message: 'Campaign has spent 92% of its daily budget ($55.20 / $60.00).',
      isRead: true,
    },
  ];

  for (const alert of alerts) {
    await prisma.alert.create({
      data: {
        userId: user.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        isRead: alert.isRead,
        triggeredAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`Created ${alerts.length} alerts`);

  // 8. Create sync history
  await prisma.syncHistory.create({
    data: {
      profileId: profile.id,
      syncType: 'FULL',
      status: 'SUCCESS',
      recordsProcessed: metricsCount + kwCount,
      startedAt: new Date(Date.now() - 60000),
      completedAt: new Date(),
    },
  });
  console.log('Created sync history');

  console.log('\n========================================');
  console.log('  DEMO ACCOUNT READY!');
  console.log('========================================');
  console.log('  Email:    demo@amazondashboard.com');
  console.log('  Password: demo1234');
  console.log('========================================\n');
}

function getSearchTermVariants(keywordText: string): Array<{ term: string; relevance: number; conversionFactor: number }> {
  const variants: Record<string, Array<{ term: string; relevance: number; conversionFactor: number }>> = {
    'wireless earbuds': [
      { term: 'wireless earbuds bluetooth', relevance: 1.0, conversionFactor: 1.2 },
      { term: 'wireless earbuds for iphone', relevance: 0.8, conversionFactor: 1.0 },
      { term: 'wireless earbuds cheap', relevance: 0.6, conversionFactor: 0.4 },
      { term: 'wireless earbuds noise cancelling', relevance: 0.9, conversionFactor: 1.3 },
    ],
    'bluetooth earbuds': [
      { term: 'bluetooth earbuds 2024', relevance: 0.9, conversionFactor: 1.1 },
      { term: 'bluetooth earphones', relevance: 0.7, conversionFactor: 0.8 },
      { term: 'bluetooth earbuds for gym', relevance: 0.8, conversionFactor: 1.0 },
    ],
    'earbuds with microphone': [
      { term: 'earbuds with mic for calls', relevance: 1.0, conversionFactor: 1.3 },
      { term: 'earbuds microphone gaming', relevance: 0.5, conversionFactor: 0.3 },
    ],
    'noise cancelling earbuds': [
      { term: 'noise cancelling earbuds budget', relevance: 0.8, conversionFactor: 0.9 },
      { term: 'anc earbuds wireless', relevance: 0.7, conversionFactor: 1.1 },
    ],
    'best wireless earbuds': [
      { term: 'best wireless earbuds 2024', relevance: 1.0, conversionFactor: 1.2 },
      { term: 'best earbuds under 50', relevance: 0.6, conversionFactor: 0.7 },
    ],
    'earbuds for running': [
      { term: 'running earbuds waterproof', relevance: 0.9, conversionFactor: 1.1 },
      { term: 'sport earbuds wireless', relevance: 0.7, conversionFactor: 0.9 },
    ],
    'workout earbuds': [
      { term: 'gym earbuds sweatproof', relevance: 0.9, conversionFactor: 1.0 },
      { term: 'workout headphones', relevance: 0.5, conversionFactor: 0.3 },
    ],
    'cheap wireless earbuds': [
      { term: 'wireless earbuds under 20', relevance: 0.8, conversionFactor: 0.6 },
      { term: 'cheap bluetooth earbuds', relevance: 0.7, conversionFactor: 0.5 },
    ],
    'electronics accessories': [
      { term: 'phone and tablet accessories', relevance: 0.8, conversionFactor: 0.9 },
      { term: 'electronics gadgets accessories', relevance: 0.7, conversionFactor: 0.8 },
    ],
    'tech gadgets': [
      { term: 'cool tech gadgets 2024', relevance: 0.6, conversionFactor: 0.5 },
      { term: 'tech accessories for desk', relevance: 0.8, conversionFactor: 1.0 },
    ],
    'phone accessories': [
      { term: 'iphone accessories', relevance: 0.9, conversionFactor: 1.1 },
      { term: 'samsung phone accessories', relevance: 0.7, conversionFactor: 0.9 },
    ],
    'laptop stand': [
      { term: 'laptop stand for desk', relevance: 1.0, conversionFactor: 1.3 },
      { term: 'laptop stand adjustable height', relevance: 0.9, conversionFactor: 1.2 },
      { term: 'laptop stand wood', relevance: 0.5, conversionFactor: 0.4 },
    ],
    'laptop riser': [
      { term: 'laptop riser for desk', relevance: 0.9, conversionFactor: 1.1 },
      { term: 'laptop riser stand portable', relevance: 0.7, conversionFactor: 0.8 },
    ],
    'adjustable laptop stand': [
      { term: 'adjustable laptop stand aluminum', relevance: 0.9, conversionFactor: 1.2 },
      { term: 'adjustable laptop desk stand', relevance: 0.8, conversionFactor: 1.0 },
    ],
    'desk laptop holder': [
      { term: 'desk laptop holder ergonomic', relevance: 0.8, conversionFactor: 1.0 },
      { term: 'laptop holder for home office', relevance: 0.7, conversionFactor: 0.9 },
    ],
  };
  return variants[keywordText] || [
    { term: `${keywordText} best`, relevance: 0.7, conversionFactor: 0.8 },
    { term: `${keywordText} cheap`, relevance: 0.5, conversionFactor: 0.4 },
  ];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  });
