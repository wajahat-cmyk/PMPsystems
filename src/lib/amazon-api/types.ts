// Amazon Advertising API Types

export interface AmazonProfile {
  profileId: string;
  countryCode: string;
  currencyCode: string;
  timezone: string;
  accountInfo: {
    id: string;
    type: 'seller' | 'vendor';
    name: string;
    validPaymentMethod: boolean;
  };
}

export interface Campaign {
  campaignId: string;
  name: string;
  campaignType: 'sponsoredProducts' | 'sponsoredBrands' | 'sponsoredDisplay';
  targetingType: 'manual' | 'auto';
  state: 'enabled' | 'paused' | 'archived';
  dailyBudget: number;
  startDate: string;
  endDate?: string;
  budget?: {
    budgetType: string;
    budget: number;
  };
}

export interface AdGroup {
  adGroupId: string;
  campaignId: string;
  name: string;
  defaultBid: number;
  state: 'enabled' | 'paused' | 'archived';
}

export interface Keyword {
  keywordId: string;
  adGroupId: string;
  campaignId: string;
  keywordText: string;
  matchType: 'exact' | 'phrase' | 'broad';
  bid: number;
  state: 'enabled' | 'paused' | 'archived';
}

export interface ReportConfig {
  reportType: string;
  startDate: string;
  endDate: string;
  metrics: string[];
  groupBy?: string[];
  filters?: Record<string, any>;
}

export interface ReportStatus {
  reportId: string;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE';
  url?: string;
  fileSize?: number;
  statusDetails?: string;
}

export interface CampaignMetricsReport {
  campaignId: string;
  campaignName: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  sales: number;
  orders: number;
  units: number;
}

export interface KeywordMetricsReport {
  keywordId: string;
  keyword: string;
  campaignId: string;
  adGroupId: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  sales: number;
  orders: number;
}

export interface SearchTermReport {
  keywordId: string;
  searchTerm: string;
  campaignId: string;
  adGroupId: string;
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  sales: number;
  orders: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export type ApiRegion = 'NA' | 'EU' | 'FE';
