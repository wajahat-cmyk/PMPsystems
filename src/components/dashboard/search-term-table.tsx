'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatPercentage, formatCompactNumber } from '@/lib/utils/formatters';
import type { SearchTermData } from '@/hooks/use-search-terms';

interface SearchTermTableProps {
  searchTerms: SearchTermData[];
  loading?: boolean;
}

function SearchTermTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[50px]" />
          <Skeleton className="h-4 w-[50px]" />
        </div>
      ))}
    </div>
  );
}

export function SearchTermTable({ searchTerms, loading }: SearchTermTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Search Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchTermTableSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (searchTerms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Search Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            No search term data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Search Terms</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 pr-4 font-medium">Search Term</th>
                <th className="pb-3 pr-4 font-medium text-right">Impressions</th>
                <th className="pb-3 pr-4 font-medium text-right">Clicks</th>
                <th className="pb-3 pr-4 font-medium text-right">CTR</th>
                <th className="pb-3 pr-4 font-medium text-right">CPC</th>
                <th className="pb-3 pr-4 font-medium text-right">Spend</th>
                <th className="pb-3 pr-4 font-medium text-right">Sales</th>
                <th className="pb-3 pr-4 font-medium text-right">Orders</th>
                <th className="pb-3 pr-4 font-medium text-right">ACOS</th>
                <th className="pb-3 font-medium text-right">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {searchTerms.map((term) => (
                <tr
                  key={term.searchTerm}
                  className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 pr-4 font-medium">{term.searchTerm}</td>
                  <td className="py-3 pr-4 text-right">
                    {formatCompactNumber(term.impressions)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatCompactNumber(term.clicks)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatPercentage(term.ctr)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatCurrency(term.cpc)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatCurrency(term.cost)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatCurrency(term.sales)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {formatCompactNumber(term.orders)}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span
                      className={cn(
                        term.acos > 40 ? 'text-red-600 font-medium' : ''
                      )}
                    >
                      {formatPercentage(term.acos)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
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
      </CardContent>
    </Card>
  );
}
