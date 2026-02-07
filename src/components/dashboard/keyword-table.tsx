'use client';

import { Fragment, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercentage, formatCompactNumber } from '@/lib/utils/formatters';
import { useKeywordSearchTerms } from '@/hooks/use-search-terms';
import { useKeywordCampaigns } from '@/hooks/use-keyword-campaigns';
import { usePortfolioFilter } from '@/components/providers/portfolio-filter-provider';
import { ChevronRight, ChevronDown } from 'lucide-react';

export interface KeywordData {
  id: string;
  keywordText: string;
  matchType: string;
  bid: number;
  state: string;
  campaignName?: string;
  adGroupName?: string;
  amazonKeywordId?: string;
  amazonAdGroupId?: string;
  amazonCampaignId?: string;
  metrics: {
    impressions: number;
    clicks: number;
    cost: number;
    sales: number;
    orders: number;
    ctr: number;
    cpc: number;
    acos: number;
    roas: number;
  };
}

interface KeywordTableProps {
  keywords: KeywordData[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  expandable?: boolean;
}

function SearchTermExpansion({ keywordId }: { keywordId: string }) {
  const { data: searchTerms, isLoading } = useKeywordSearchTerms(keywordId);

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  if (!searchTerms || searchTerms.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        No search terms found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">Search Term</th>
            <th className="pb-2 pr-3 font-medium text-right">Imp</th>
            <th className="pb-2 pr-3 font-medium text-right">Clicks</th>
            <th className="pb-2 pr-3 font-medium text-right">Spend</th>
            <th className="pb-2 pr-3 font-medium text-right">Sales</th>
            <th className="pb-2 pr-3 font-medium text-right">ACOS</th>
            <th className="pb-2 font-medium text-right">ROAS</th>
          </tr>
        </thead>
        <tbody>
          {searchTerms.map((term) => (
            <tr
              key={term.searchTerm}
              className="border-t border-dashed hover:bg-muted/30 transition-colors"
            >
              <td className="py-1.5 pr-3">{term.searchTerm}</td>
              <td className="py-1.5 pr-3 text-right">
                {formatCompactNumber(term.impressions)}
              </td>
              <td className="py-1.5 pr-3 text-right">
                {formatCompactNumber(term.clicks)}
              </td>
              <td className="py-1.5 pr-3 text-right">
                {formatCurrency(term.cost)}
              </td>
              <td className="py-1.5 pr-3 text-right">
                {formatCurrency(term.sales)}
              </td>
              <td className="py-1.5 pr-3 text-right">
                <span
                  className={cn(
                    term.acos > 40 ? 'text-red-600 font-medium' : ''
                  )}
                >
                  {formatPercentage(term.acos)}
                </span>
              </td>
              <td className="py-1.5 text-right">
                <span
                  className={cn(
                    term.roas > 3 ? 'text-green-600 font-medium' : ''
                  )}
                >
                  {term.roas.toFixed(2)}x
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CampaignExpansion({ keywordId }: { keywordId: string }) {
  const { selectedPortfolio } = usePortfolioFilter();
  const { data: campaigns, isLoading } = useKeywordCampaigns(
    keywordId,
    selectedPortfolio || undefined
  );

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="p-3 text-xs text-muted-foreground">
        No campaigns found targeting this keyword
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="pb-2 pr-3 font-medium">Campaign</th>
            <th className="pb-2 pr-3 font-medium">Ad Group</th>
            <th className="pb-2 pr-3 font-medium">Match</th>
            <th className="pb-2 pr-3 font-medium text-right">Bid</th>
            <th className="pb-2 pr-3 font-medium text-right">Spend</th>
            <th className="pb-2 pr-3 font-medium text-right">Sales</th>
            <th className="pb-2 pr-3 font-medium text-right">ACOS</th>
            <th className="pb-2 font-medium text-right">ROAS</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c, idx) => (
            <tr
              key={`${c.campaignId}-${idx}`}
              className="border-t border-dashed hover:bg-muted/30 transition-colors"
            >
              <td className="py-1.5 pr-3 font-medium">{c.campaignName}</td>
              <td className="py-1.5 pr-3 text-muted-foreground">{c.adGroupName}</td>
              <td className="py-1.5 pr-3">
                <Badge variant="outline" className="uppercase text-[10px]">
                  {c.matchType}
                </Badge>
              </td>
              <td className="py-1.5 pr-3 text-right">{formatCurrency(c.bid)}</td>
              <td className="py-1.5 pr-3 text-right">{formatCurrency(c.metrics.cost)}</td>
              <td className="py-1.5 pr-3 text-right">{formatCurrency(c.metrics.sales)}</td>
              <td className="py-1.5 pr-3 text-right">
                <span className={cn(c.metrics.acos > 35 ? 'text-red-600 font-medium' : '')}>
                  {formatPercentage(c.metrics.acos)}
                </span>
              </td>
              <td className="py-1.5 text-right">{c.metrics.roas.toFixed(2)}x</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function KeywordTable({
  keywords,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  expandable = false,
}: KeywordTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'search-terms'>('campaigns');

  if (keywords.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No keyword data available
      </div>
    );
  }

  const allSelected = keywords.length > 0 && keywords.every((k) => selectedIds.has(k.id));
  const someSelected = keywords.some((k) => selectedIds.has(k.id)) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      const next = new Set(selectedIds);
      keywords.forEach((k) => next.delete(k.id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      keywords.forEach((k) => next.add(k.id));
      onSelectionChange(next);
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  // Calculate colSpan for expansion row
  let colCount = 11; // base columns
  if (selectable) colCount++;
  if (expandable) colCount++;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {selectable && (
              <th className="pb-3 pr-2 w-8">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                />
              </th>
            )}
            {expandable && <th className="pb-3 pr-1 w-6" />}
            <th className="pb-3 pr-4 font-medium">Keyword</th>
            <th className="pb-3 pr-4 font-medium">Match</th>
            <th className="pb-3 pr-4 font-medium text-right">Bid</th>
            <th className="pb-3 pr-4 font-medium text-right">Impressions</th>
            <th className="pb-3 pr-4 font-medium text-right">Clicks</th>
            <th className="pb-3 pr-4 font-medium text-right">CTR</th>
            <th className="pb-3 pr-4 font-medium text-right">CPC</th>
            <th className="pb-3 pr-4 font-medium text-right">Spend</th>
            <th className="pb-3 pr-4 font-medium text-right">Sales</th>
            <th className="pb-3 pr-4 font-medium text-right">ACOS</th>
            <th className="pb-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {keywords.map((keyword) => {
            const isExpanded = expandedId === keyword.id;
            return (
              <Fragment key={keyword.id}>
                <tr className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  {selectable && (
                    <td className="py-3 pr-2">
                      <Checkbox
                        checked={selectedIds.has(keyword.id)}
                        onCheckedChange={() => toggleOne(keyword.id)}
                      />
                    </td>
                  )}
                  {expandable && (
                    <td className="py-3 pr-1">
                      <button
                        onClick={() => {
                          setExpandedId(isExpanded ? null : keyword.id);
                          setActiveTab('campaigns');
                        }}
                        className="p-0.5 rounded hover:bg-muted transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="py-3 pr-4 font-medium">
                    {keyword.keywordText}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className="uppercase text-xs">
                      {keyword.matchType}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatCurrency(keyword.bid)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatCompactNumber(keyword.metrics.impressions)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatCompactNumber(keyword.metrics.clicks)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatPercentage(keyword.metrics.ctr)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatCurrency(keyword.metrics.cpc)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatCurrency(keyword.metrics.cost)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatCurrency(keyword.metrics.sales)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span
                      className={cn(
                        keyword.metrics.acos > 30
                          ? 'text-red-600 font-medium'
                          : ''
                      )}
                    >
                      {formatPercentage(keyword.metrics.acos)}
                    </span>
                  </td>
                  <td className="py-3">
                    <Badge
                      variant={
                        keyword.state === 'ENABLED'
                          ? 'default'
                          : keyword.state === 'PAUSED'
                            ? 'secondary'
                            : 'outline'
                      }
                      className="capitalize text-xs"
                    >
                      {keyword.state.toLowerCase()}
                    </Badge>
                  </td>
                </tr>
                {expandable && isExpanded && (
                  <tr>
                    <td colSpan={colCount} className="bg-muted/30 px-4 py-2">
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => setActiveTab('campaigns')}
                          className={cn(
                            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                            activeTab === 'campaigns'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-accent'
                          )}
                        >
                          Campaigns
                        </button>
                        <button
                          onClick={() => setActiveTab('search-terms')}
                          className={cn(
                            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                            activeTab === 'search-terms'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-accent'
                          )}
                        >
                          Search Terms
                        </button>
                      </div>
                      {activeTab === 'campaigns' ? (
                        <CampaignExpansion keywordId={keyword.id} />
                      ) : (
                        <SearchTermExpansion keywordId={keyword.id} />
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
