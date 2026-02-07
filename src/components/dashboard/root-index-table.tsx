'use client';

import { Fragment, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatPercentage,
  formatCompactNumber,
  formatNumber,
} from '@/lib/utils/formatters';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { RootGroupData } from '@/hooks/use-root-index';

interface RootIndexTableProps {
  roots: RootGroupData[];
  loading?: boolean;
}

function RootIndexTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-[20px]" />
          <Skeleton className="h-4 w-[140px]" />
          <Skeleton className="h-4 w-[40px]" />
          <Skeleton className="h-4 w-[40px]" />
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[50px]" />
        </div>
      ))}
    </div>
  );
}

export function RootIndexTable({ roots, loading }: RootIndexTableProps) {
  const [expandedRoot, setExpandedRoot] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Root Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <RootIndexTableSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (roots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Root Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No root group data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Root Groups</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-1 w-6" />
                <th className="pb-3 pr-4 font-medium">Root</th>
                <th className="pb-3 pr-4 font-medium text-right">Sub-Groups</th>
                <th className="pb-3 pr-4 font-medium text-right">Keywords</th>
                <th className="pb-3 pr-4 font-medium text-right">Campaigns</th>
                <th className="pb-3 pr-4 font-medium text-right">Impressions</th>
                <th className="pb-3 pr-4 font-medium text-right">Clicks</th>
                <th className="pb-3 pr-4 font-medium text-right">Spend</th>
                <th className="pb-3 pr-4 font-medium text-right">Sales</th>
                <th className="pb-3 pr-4 font-medium text-right">Orders</th>
                <th className="pb-3 pr-4 font-medium text-right">ACOS</th>
                <th className="pb-3 font-medium text-right">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {roots.map((root) => {
                const isExpanded = expandedRoot === root.root;
                return (
                  <Fragment key={root.root}>
                    <tr className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3 pr-1">
                        <button
                          onClick={() =>
                            setExpandedRoot(isExpanded ? null : root.root)
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
                      <td className="py-3 pr-4 font-medium">{root.root}</td>
                      <td className="py-3 pr-4 text-right">
                        {formatNumber(root.syntaxGroupCount)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatNumber(root.keywordCount)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatNumber(root.campaignCount)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCompactNumber(root.metrics.impressions)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCompactNumber(root.metrics.clicks)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCurrency(root.metrics.cost)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatCurrency(root.metrics.sales)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        {formatNumber(root.metrics.orders)}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <span
                          className={cn(
                            root.metrics.acos > 35
                              ? 'text-red-600 font-medium'
                              : ''
                          )}
                        >
                          {formatPercentage(root.metrics.acos)}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {root.metrics.roas.toFixed(2)}x
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={12} className="bg-muted/30 px-4 py-3">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Syntax Sub-Groups in &ldquo;{root.root}&rdquo;
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {root.subGroups.map((sg) => (
                              <span
                                key={sg}
                                className="inline-flex items-center rounded-md bg-background px-2.5 py-1 text-xs font-medium border"
                              >
                                {sg}
                              </span>
                            ))}
                          </div>
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
