/**
 * Amazon bulk report XLSX parser.
 * Parses the standard Amazon SP bulk report format into structured data.
 */

import * as XLSX from 'xlsx';
import { classifySyntax } from './syntax-classifier';

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedCampaign {
  amazonCampaignId: string;
  name: string;
  portfolio: string | null;
  dailyBudget: number;
  biddingStrategy: string | null;
  targetingType: string;
  state: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
  cvr: number;
  acos: number;
  cpc: number;
  roas: number;
}

export interface ParsedAdGroup {
  amazonAdGroupId: string;
  amazonCampaignId: string;
  name: string;
  campaignName: string;
  defaultBid: number;
  state: string;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
}

export interface ParsedKeyword {
  amazonKeywordId: string;
  amazonCampaignId: string;
  amazonAdGroupId: string;
  campaignName: string;
  adGroupName: string;
  portfolio: string | null;
  keywordText: string;
  matchType: string;
  bid: number;
  state: string;
  syntaxGroup: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
  cvr: number;
  acos: number;
  cpc: number;
  roas: number;
}

export interface ParsedPlacement {
  amazonCampaignId: string;
  campaignName: string;
  placement: string;
  percentage: number;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
  cvr: number;
  acos: number;
  cpc: number;
  roas: number;
}

export interface ParsedSearchTerm {
  amazonCampaignId: string;
  amazonAdGroupId: string;
  amazonKeywordId: string;
  campaignName: string;
  adGroupName: string;
  portfolio: string | null;
  keywordText: string;
  matchType: string;
  searchTerm: string;
  syntaxGroup: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  sales: number;
  orders: number;
  units: number;
  cvr: number;
  acos: number;
  cpc: number;
  roas: number;
}

export interface ParsedPortfolio {
  portfolioId: string;
  name: string;
  state: string;
}

export interface ParsedReport {
  campaigns: ParsedCampaign[];
  adGroups: ParsedAdGroup[];
  keywords: ParsedKeyword[];
  placements: ParsedPlacement[];
  searchTerms: ParsedSearchTerm[];
  portfolios: ParsedPortfolio[];
}

// ============================================================================
// HELPERS
// ============================================================================

function num(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function str(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

/** Convert Amazon decimal ratios to percentage (0.5296 → 52.96) */
function toPercent(value: unknown): number {
  const n = num(value);
  // If already > 1, it might already be a percentage
  // Amazon stores as decimal: 0.5296 = 52.96%
  return n * 100;
}

/** Normalize placement name from Amazon format */
function normalizePlacement(raw: string): string {
  const map: Record<string, string> = {
    'Placement Top': 'TOP_OF_SEARCH',
    'Placement Rest Of Search': 'REST_OF_SEARCH',
    'Placement Product Page': 'PRODUCT_PAGES',
    'Placement Amazon Business': 'AMAZON_BUSINESS',
  };
  return map[raw] || raw;
}

// ============================================================================
// PARSER
// ============================================================================

export function parseAmazonBulkReport(buffer: Buffer): ParsedReport {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  const campaigns: ParsedCampaign[] = [];
  const adGroups: ParsedAdGroup[] = [];
  const keywords: ParsedKeyword[] = [];
  const placements: ParsedPlacement[] = [];
  const searchTerms: ParsedSearchTerm[] = [];
  const portfolios: ParsedPortfolio[] = [];

  // ── Parse Portfolios ──
  const portfolioSheet = workbook.Sheets['Portfolios'];
  if (portfolioSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(portfolioSheet);
    for (const row of rows) {
      const name = str(row['Portfolio Name']);
      if (!name) continue;
      portfolios.push({
        portfolioId: str(row['Portfolio ID']),
        name,
        state: str(row['State (Informational only)'] || row['State']),
      });
    }
  }

  // ── Parse SP Campaigns sheet ──
  const spSheet = workbook.Sheets['Sponsored Products Campaigns'];
  if (spSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(spSheet);

    for (const row of rows) {
      const entity = str(row['Entity']);

      if (entity === 'Campaign') {
        const campaignId = str(row['Campaign ID']);
        if (!campaignId) continue;

        campaigns.push({
          amazonCampaignId: campaignId,
          name: str(row['Campaign Name'] || row['Campaign Name (Informational only)']),
          portfolio: str(row['Portfolio Name (Informational only)']) || null,
          dailyBudget: num(row['Daily Budget']),
          biddingStrategy: str(row['Bidding Strategy']) || null,
          targetingType: str(row['Targeting Type']),
          state: str(row['State']),
          impressions: num(row['Impressions']),
          clicks: num(row['Clicks']),
          ctr: toPercent(row['Click-through Rate']),
          spend: num(row['Spend']),
          sales: num(row['Sales']),
          orders: num(row['Orders']),
          units: num(row['Units']),
          cvr: toPercent(row['Conversion Rate']),
          acos: toPercent(row['ACOS']),
          cpc: num(row['CPC']),
          roas: num(row['ROAS']),
        });
      }

      if (entity === 'Ad Group') {
        const adGroupId = str(row['Ad Group ID']);
        const campaignId = str(row['Campaign ID']);
        if (!adGroupId || !campaignId) continue;

        adGroups.push({
          amazonAdGroupId: adGroupId,
          amazonCampaignId: campaignId,
          name: str(row['Ad Group Name'] || row['Ad Group Name (Informational only)']),
          campaignName: str(row['Campaign Name (Informational only)']),
          defaultBid: num(row['Ad Group Default Bid']),
          state: str(row['State']),
          impressions: num(row['Impressions']),
          clicks: num(row['Clicks']),
          spend: num(row['Spend']),
          sales: num(row['Sales']),
          orders: num(row['Orders']),
        });
      }

      if (entity === 'Keyword') {
        const keywordId = str(row['Keyword ID']);
        const campaignId = str(row['Campaign ID']);
        const adGroupId = str(row['Ad Group ID']);
        if (!keywordId) continue;

        const keywordText = str(row['Keyword Text']);
        const matchType = str(row['Match Type']);

        // Skip negative keywords
        if (matchType.toLowerCase().includes('negative')) continue;

        keywords.push({
          amazonKeywordId: keywordId,
          amazonCampaignId: campaignId,
          amazonAdGroupId: adGroupId,
          campaignName: str(row['Campaign Name (Informational only)']),
          adGroupName: str(row['Ad Group Name (Informational only)']),
          portfolio: str(row['Portfolio Name (Informational only)']) || null,
          keywordText,
          matchType: matchType.toUpperCase(),
          bid: num(row['Bid']),
          state: str(row['State']),
          syntaxGroup: classifySyntax(keywordText),
          impressions: num(row['Impressions']),
          clicks: num(row['Clicks']),
          ctr: toPercent(row['Click-through Rate']),
          spend: num(row['Spend']),
          sales: num(row['Sales']),
          orders: num(row['Orders']),
          units: num(row['Units']),
          cvr: toPercent(row['Conversion Rate']),
          acos: toPercent(row['ACOS']),
          cpc: num(row['CPC']),
          roas: num(row['ROAS']),
        });
      }

      if (entity === 'Bidding Adjustment') {
        const campaignId = str(row['Campaign ID']);
        const placement = str(row['Placement']);
        if (!campaignId || !placement) continue;

        placements.push({
          amazonCampaignId: campaignId,
          campaignName: str(row['Campaign Name (Informational only)']),
          placement: normalizePlacement(placement),
          percentage: num(row['Percentage']),
          impressions: num(row['Impressions']),
          clicks: num(row['Clicks']),
          ctr: toPercent(row['Click-through Rate']),
          spend: num(row['Spend']),
          sales: num(row['Sales']),
          orders: num(row['Orders']),
          units: num(row['Units']),
          cvr: toPercent(row['Conversion Rate']),
          acos: toPercent(row['ACOS']),
          cpc: num(row['CPC']),
          roas: num(row['ROAS']),
        });
      }
    }
  }

  // ── Parse Search Term Report ──
  const stSheet = workbook.Sheets['SP Search Term Report'];
  if (stSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(stSheet);

    for (const row of rows) {
      const searchTermText = str(row['Customer Search Term']);
      if (!searchTermText) continue;

      searchTerms.push({
        amazonCampaignId: str(row['Campaign ID']),
        amazonAdGroupId: str(row['Ad Group ID']),
        amazonKeywordId: str(row['Keyword ID']),
        campaignName: str(row['Campaign Name (Informational only)']),
        adGroupName: str(row['Ad Group Name (Informational only)']),
        portfolio: str(row['Portfolio Name (Informational only)']) || null,
        keywordText: str(row['Keyword Text']),
        matchType: str(row['Match Type']).toUpperCase(),
        searchTerm: searchTermText,
        syntaxGroup: classifySyntax(searchTermText),
        impressions: num(row['Impressions']),
        clicks: num(row['Clicks']),
        ctr: toPercent(row['Click-through Rate']),
        spend: num(row['Spend']),
        sales: num(row['Sales']),
        orders: num(row['Orders']),
        units: num(row['Units']),
        cvr: toPercent(row['Conversion Rate']),
        acos: toPercent(row['ACOS']),
        cpc: num(row['CPC']),
        roas: num(row['ROAS']),
      });
    }
  }

  return {
    campaigns,
    adGroups,
    keywords,
    placements,
    searchTerms,
    portfolios,
  };
}
