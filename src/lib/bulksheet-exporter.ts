import * as XLSX from 'xlsx';

const BULKSHEET_HEADERS = [
  'Product', 'Entity', 'Operation', 'Campaign Id', 'Ad Group Id',
  'Portfolio Id', 'Ad Id (Read only)', 'Keyword Id (Read only)',
  'Product Targeting Id (Read only)', 'Campaign Name', 'Ad Group Name',
  'Start Date', 'End Date', 'Targeting Type', 'State', 'Daily Budget',
  'SKU', 'ASIN', 'Ad Group Default Bid', 'Bid', 'Keyword Text',
  'Match Type', 'Bidding Strategy', 'Placement', 'Percentage',
  'Product Targeting Expression',
];

const PLACEMENT_MAP: Record<string, string> = {
  TOP_OF_SEARCH: 'Placement Top',
  REST_OF_SEARCH: 'Placement Rest Of Search',
  PRODUCT_PAGES: 'Placement Product Page',
};

const MODIFIER_TO_PLACEMENT: Record<string, string> = {
  tosModifier: 'TOP_OF_SEARCH',
  rosModifier: 'REST_OF_SEARCH',
  pdpModifier: 'PRODUCT_PAGES',
};

export interface ExportableItem {
  entityType: string;
  amazonCampaignId: string | null;
  amazonAdGroupId: string | null;
  amazonKeywordId: string | null;
  entityName: string;
  campaignName: string | null;
  adGroupName: string | null;
  matchType: string | null;
  changes: Record<string, any>;
}

function createEmptyRow(): Record<string, string> {
  const row: Record<string, string> = {};
  for (const h of BULKSHEET_HEADERS) row[h] = '';
  row['Product'] = 'Sponsored Products';
  row['Operation'] = 'Update';
  return row;
}

function capitalizeMatchType(mt: string): string {
  return mt.charAt(0).toUpperCase() + mt.slice(1).toLowerCase();
}

export function generateBulksheetRows(items: ExportableItem[]): Record<string, string>[] {
  const rows: Record<string, string>[] = [];

  for (const item of items) {
    const changes = item.changes;

    if (item.entityType === 'CAMPAIGN') {
      // Campaign row for budget/state
      const hasBudgetOrState = changes.budget != null || changes.state != null;
      if (hasBudgetOrState) {
        const row = createEmptyRow();
        row['Entity'] = 'Campaign';
        row['Campaign Id'] = item.amazonCampaignId || '';
        row['Campaign Name'] = item.entityName;
        if (changes.budget != null) row['Daily Budget'] = String(changes.budget);
        if (changes.state != null) row['State'] = changes.state;
        rows.push(row);
      }

      // Bidding Adjustment rows for placement modifiers
      for (const [modKey, placementKey] of Object.entries(MODIFIER_TO_PLACEMENT)) {
        if (changes[modKey] != null) {
          const row = createEmptyRow();
          row['Entity'] = 'Bidding Adjustment';
          row['Campaign Id'] = item.amazonCampaignId || '';
          row['Campaign Name'] = item.entityName;
          row['Placement'] = PLACEMENT_MAP[placementKey];
          row['Percentage'] = String(changes[modKey]);
          rows.push(row);
        }
      }
    }

    if (item.entityType === 'KEYWORD') {
      const row = createEmptyRow();
      row['Entity'] = 'Keyword';
      row['Campaign Id'] = item.amazonCampaignId || '';
      row['Ad Group Id'] = item.amazonAdGroupId || '';
      row['Keyword Id (Read only)'] = item.amazonKeywordId || '';
      row['Campaign Name'] = item.campaignName || '';
      row['Ad Group Name'] = item.adGroupName || '';
      row['Keyword Text'] = item.entityName;
      if (item.matchType) row['Match Type'] = capitalizeMatchType(item.matchType);
      if (changes.bid != null) row['Bid'] = String(changes.bid);
      if (changes.state != null) row['State'] = changes.state;
      rows.push(row);
    }
  }

  return rows;
}

export function generateBulksheetXlsx(items: ExportableItem[]): Buffer {
  const rows = generateBulksheetRows(items);

  const ws = XLSX.utils.json_to_sheet(rows, { header: BULKSHEET_HEADERS });

  // Set column widths for readability
  ws['!cols'] = BULKSHEET_HEADERS.map((h) => ({
    wch: Math.max(h.length, 15),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sponsored Products Campaigns');

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(xlsxBuffer);
}
