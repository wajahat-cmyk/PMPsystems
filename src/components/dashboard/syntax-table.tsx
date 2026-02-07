'use client';

import { Fragment, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatCurrency,
  formatPercentage,
  formatCompactNumber,
  formatNumber,
} from '@/lib/utils/formatters';
import { useSyntaxKeywords, useSyntaxCampaigns } from '@/hooks/use-syntax';
import { usePortfolioFilter } from '@/components/providers/portfolio-filter-provider';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { SyntaxGroupData } from '@/hooks/use-syntax';

interface SyntaxTableProps {
  syntaxGroups: SyntaxGroupData[];
  loading?: boolean;
}

function SyntaxTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-[160px]" />
          <Skeleton className="h-4 w-[40px]" />
          <Skeleton className="h-4 w-[40px]" />
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[50px]" />
        </div>
      ))}
    </div>
  );
}

function SyntaxExpansion({ syntaxGroup }: { syntaxGroup: string }) {
  const { selectedPortfolio } = usePortfolioFilter();
  const portfolio = selectedPortfolio || undefined;
  const { data: keywords, isLoading: kwLoading } = useSyntaxKeywords(syntaxGroup, portfolio);
  const { data: campaigns, isLoading: campLoading } = useSyntaxCampaigns(syntaxGroup, portfolio);

  return (
    <div className="space-y-4">
      {/* Keywords sub-table */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Keywords ({kwLoading ? '...' : keywords?.length ?? 0})
        </div>
        {kwLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : !keywords || keywords.length === 0 ? (
          <div className="text-xs text-muted-foreground">No keywords found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Keyword</th>
                  <th className="pb-2 pr-3 font-medium">Match</th>
                  <th className="pb-2 pr-3 font-medium">Campaign</th>
                  <th className="pb-2 pr-3 font-medium text-right">Bid</th>
                  <th className="pb-2 pr-3 font-medium text-right">Imp</th>
                  <th className="pb-2 pr-3 font-medium text-right">Clicks</th>
                  <th className="pb-2 pr-3 font-medium text-right">Spend</th>
                  <th className="pb-2 pr-3 font-medium text-right">Sales</th>
                  <th className="pb-2 pr-3 font-medium text-right">ACOS</th>
                  <th className="pb-2 font-medium text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((kw) => (
                  <tr
                    key={kw.id}
                    className="border-t border-dashed hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-1.5 pr-3 font-medium">{kw.keywordText}</td>
                    <td className="py-1.5 pr-3">
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {kw.matchType}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{kw.campaignName}</td>
                    <td className="py-1.5 pr-3 text-right">{formatCurrency(kw.bid)}</td>
                    <td className="py-1.5 pr-3 text-right">{formatCompactNumber(kw.metrics.impressions)}</td>
                    <td className="py-1.5 pr-3 text-right">{formatCompactNumber(kw.metrics.clicks)}</td>
                    <td className="py-1.5 pr-3 text-right">{formatCurrency(kw.metrics.cost)}</td>
                    <td className="py-1.5 pr-3 text-right">{formatCurrency(kw.metrics.sales)}</td>
                    <td className="py-1.5 pr-3 text-right">
                      <span className={cn(kw.metrics.acos > 35 ? 'text-red-600 font-medium' : '')}>
                        {formatPercentage(kw.metrics.acos)}
                      </span>
                    </td>
                    <td className="py-1.5 text-right">{kw.metrics.roas.toFixed(2)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaigns sub-table */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">
          Campaigns ({campLoading ? '...' : campaigns?.length ?? 0})
        </div>
        {campLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        ) : !campaigns || campaigns.length === 0 ? (
          <div className="text-xs text-muted-foreground">No campaigns found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Campaign</th>
                  <th className="pb-2 pr-3 font-medium">State</th>
                  <th className="pb-2 pr-3 font-medium text-right">Budget</th>
                  <th className="pb-2 pr-3 font-medium text-right">Spend</th>
                  <th className="pb-2 pr-3 font-medium text-right">Sales</th>
                  <th className="pb-2 pr-3 font-medium text-right">ACOS</th>
                  <th className="pb-2 font-medium text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-dashed hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-1.5 pr-3 font-medium">{c.name}</td>
                    <td className="py-1.5 pr-3">
                      <Badge
                        variant={c.state === 'ENABLED' ? 'default' : 'secondary'}
                        className="capitalize text-[10px]"
                      >
                        {c.state.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="py-1.5 pr-3 text-right">{formatCurrency(c.dailyBudget)}</td>
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
        )}
      </div>
    </div>
  );
}

export function SyntaxTable({ syntaxGroups, loading }: SyntaxTableProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Syntax Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <SyntaxTableSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (syntaxGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Syntax Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No syntax group data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Syntax Groups</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-1 w-6" />
                <th className="pb-3 pr-4 font-medium">Syntax Group</th>
                <th className="pb-3 pr-4 font-medium text-right">Keywords</th>
                <th className="pb-3 pr-4 font-medium text-right">Campaigns</th>
                <th className="pb-3 pr-4 font-medium text-right">Impressions</th>
                <th className="pb-3 pr-4 font-medium text-right">Clicks</th>
                <th className="pb-3 pr-4 font-medium text-right">CTR</th>
                <th className="pb-3 pr-4 font-medium text-right">CPC</th>
                <th className="pb-3 pr-4 font-medium text-right">Spend</th>
                <th className="pb-3 pr-4 font-medium text-right">Sales</th>
                <th className="pb-3 pr-4 font-medium text-right">Orders</th>
                <th className="pb-3 pr-4 font-medium text-right">CVR</th>
                <th className="pb-3 pr-4 font-medium text-right">ACOS</th>
                <th className="pb-3 font-medium text-right">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {syntaxGroups.map((group) => {
                const isExpanded = expandedGroup === group.syntaxGroup;
                return (
                  <Fragment key={group.syntaxGroup}>
                    <tr className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 pr-1">
                        <button
                          onClick={() =>
                            setExpandedGroup(isExpanded ? null : group.syntaxGroup)
                          }
                          className="p-0.5 rounded hover:bg-muted transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        {group.syntaxGroup}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatNumber(group.keywordCount)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatNumber(group.campaignCount)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCompactNumber(group.metrics.impressions)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCompactNumber(group.metrics.clicks)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatPercentage(group.metrics.ctr)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCurrency(group.metrics.cpc)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCurrency(group.metrics.cost)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCurrency(group.metrics.sales)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatNumber(group.metrics.orders)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatPercentage(group.metrics.cvr)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className={cn(
                            group.metrics.acos > 35 ? 'text-red-600 font-medium' : ''
                          )}
                        >
                          {formatPercentage(group.metrics.acos)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {group.metrics.roas.toFixed(2)}x
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={14} className="bg-muted/30 px-4 py-3">
                          <SyntaxExpansion syntaxGroup={group.syntaxGroup} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
