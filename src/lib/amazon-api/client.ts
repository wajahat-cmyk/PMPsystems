import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Campaign,
  AdGroup,
  Keyword,
  ReportConfig,
  ReportStatus,
  ApiRegion,
} from './types';

export class AmazonAdvertisingClient {
  private client: AxiosInstance;
  private profileId: string;
  private accessToken: string;
  private region: ApiRegion;

  constructor(profileId: string, accessToken: string, clientId: string, region: ApiRegion = 'NA') {
    this.profileId = profileId;
    this.accessToken = accessToken;
    this.region = region;

    const baseURL = this.getBaseURL(region);

    this.client = axios.create({
      baseURL,
      headers: {
        'Amazon-Advertising-API-ClientId': clientId,
        'Amazon-Advertising-API-Scope': profileId,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          throw new Error('Amazon API authentication failed. Token may be expired.');
        }
        if (error.response?.status === 429) {
          throw new Error('Amazon API rate limit exceeded. Please try again later.');
        }
        throw error;
      }
    );
  }

  private getBaseURL(region: ApiRegion): string {
    const endpoints: Record<ApiRegion, string> = {
      NA: 'https://advertising-api.amazon.com',
      EU: 'https://advertising-api-eu.amazon.com',
      FE: 'https://advertising-api-fe.amazon.com',
    };
    return endpoints[region];
  }

  /**
   * Get all campaigns for the profile
   */
  async getCampaigns(params?: {
    stateFilter?: 'enabled' | 'paused' | 'archived';
    campaignIdFilter?: string[];
  }): Promise<Campaign[]> {
    const response = await this.client.post('/sp/campaigns/list', params || {});
    return response.data.campaigns || [];
  }

  /**
   * Get a specific campaign by ID
   */
  async getCampaign(campaignId: string): Promise<Campaign> {
    const response = await this.client.get(`/sp/campaigns/${campaignId}`);
    return response.data;
  }

  /**
   * Get ad groups for a campaign
   */
  async getAdGroups(campaignId: string): Promise<AdGroup[]> {
    const response = await this.client.post('/sp/adGroups/list', {
      campaignIdFilter: [campaignId],
    });
    return response.data.adGroups || [];
  }

  /**
   * Get keywords for an ad group
   */
  async getKeywords(adGroupId: string): Promise<Keyword[]> {
    const response = await this.client.post('/sp/keywords/list', {
      adGroupIdFilter: [adGroupId],
    });
    return response.data.keywords || [];
  }

  /**
   * Request a report (asynchronous)
   */
  async requestReport(config: ReportConfig): Promise<{ reportId: string }> {
    const response = await this.client.post('/reporting/reports', {
      configuration: {
        adProduct: 'SPONSORED_PRODUCTS',
        groupBy: config.groupBy || ['campaign'],
        columns: config.metrics,
        reportTypeId: config.reportType,
        timeUnit: 'DAILY',
        format: 'GZIP_JSON',
      },
      startDate: config.startDate,
      endDate: config.endDate,
    });
    return { reportId: response.data.reportId };
  }

  /**
   * Check report status
   */
  async getReportStatus(reportId: string): Promise<ReportStatus> {
    const response = await this.client.get(`/reporting/reports/${reportId}`);
    return {
      reportId: response.data.reportId,
      status: response.data.status,
      url: response.data.url,
      fileSize: response.data.fileSize,
      statusDetails: response.data.statusDetails,
    };
  }

  /**
   * Download report data
   */
  async downloadReport(reportUrl: string): Promise<any> {
    const response = await axios.get(reportUrl, {
      responseType: 'json',
    });
    return response.data;
  }

  /**
   * Get campaign performance report (simplified method)
   */
  async getCampaignPerformanceReport(
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const reportConfig: ReportConfig = {
      reportType: 'spCampaigns',
      startDate,
      endDate,
      metrics: [
        'campaignId',
        'campaignName',
        'date',
        'impressions',
        'clicks',
        'cost',
        'purchases',
        'sales',
        'attributedUnitsOrdered',
      ],
      groupBy: ['campaign'],
    };

    // Request report
    const { reportId } = await this.requestReport(reportConfig);

    // Poll for completion
    let status: ReportStatus;
    let attempts = 0;
    const maxAttempts = 20; // Max 10 minutes (30 seconds * 20)

    do {
      await this.sleep(30000); // Wait 30 seconds
      status = await this.getReportStatus(reportId);
      attempts++;

      if (attempts >= maxAttempts) {
        throw new Error('Report generation timeout');
      }
    } while (status.status === 'IN_PROGRESS');

    if (status.status !== 'SUCCESS' || !status.url) {
      throw new Error(`Report failed with status: ${status.status}`);
    }

    // Download and return report data
    return await this.downloadReport(status.url);
  }

  /**
   * Get keyword performance report
   */
  async getKeywordPerformanceReport(
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const reportConfig: ReportConfig = {
      reportType: 'spKeywords',
      startDate,
      endDate,
      metrics: [
        'keywordId',
        'keyword',
        'campaignId',
        'adGroupId',
        'date',
        'impressions',
        'clicks',
        'cost',
        'purchases',
        'sales',
      ],
      groupBy: ['keyword'],
    };

    const { reportId } = await this.requestReport(reportConfig);

    // Poll for completion
    let status: ReportStatus;
    let attempts = 0;

    do {
      await this.sleep(30000);
      status = await this.getReportStatus(reportId);
      attempts++;

      if (attempts >= 20) {
        throw new Error('Report generation timeout');
      }
    } while (status.status === 'IN_PROGRESS');

    if (status.status !== 'SUCCESS' || !status.url) {
      throw new Error(`Report failed with status: ${status.status}`);
    }

    return await this.downloadReport(status.url);
  }

  /**
   * Get search term report
   */
  async getSearchTermReport(startDate: string, endDate: string): Promise<any[]> {
    const reportConfig: ReportConfig = {
      reportType: 'spSearchTerm',
      startDate,
      endDate,
      metrics: [
        'keywordId',
        'searchTerm',
        'campaignId',
        'adGroupId',
        'date',
        'impressions',
        'clicks',
        'cost',
        'purchases',
        'sales',
      ],
    };

    const { reportId } = await this.requestReport(reportConfig);

    // Poll for completion
    let status: ReportStatus;
    let attempts = 0;

    do {
      await this.sleep(30000);
      status = await this.getReportStatus(reportId);
      attempts++;

      if (attempts >= 20) {
        throw new Error('Report generation timeout');
      }
    } while (status.status === 'IN_PROGRESS');

    if (status.status !== 'SUCCESS' || !status.url) {
      throw new Error(`Report failed with status: ${status.status}`);
    }

    return await this.downloadReport(status.url);
  }

  /**
   * Sleep utility for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
