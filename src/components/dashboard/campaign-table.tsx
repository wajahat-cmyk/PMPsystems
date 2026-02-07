'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercentage, formatCompactNumber } from '@/lib/utils/formatters';
import type { CampaignData } from '@/hooks/use-campaigns';

interface CampaignTableProps {
  campaigns: CampaignData[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function CampaignTable({
  campaigns,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
}: CampaignTableProps) {
  if (campaigns.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No campaigns found. Connect your Amazon account to get started.
      </div>
    );
  }

  const allSelected = campaigns.length > 0 && campaigns.every((c) => selectedIds.has(c.id));
  const someSelected = campaigns.some((c) => selectedIds.has(c.id)) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      const next = new Set(selectedIds);
      campaigns.forEach((c) => next.delete(c.id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      campaigns.forEach((c) => next.add(c.id));
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
            <th className="pb-3 pr-4 font-medium">Campaign</th>
            <th className="pb-3 pr-4 font-medium text-right">Budget</th>
            <th className="pb-3 pr-4 font-medium text-right">Impressions</th>
            <th className="pb-3 pr-4 font-medium text-right">Clicks</th>
            <th className="pb-3 pr-4 font-medium text-right">Spend</th>
            <th className="pb-3 pr-4 font-medium text-right">Sales</th>
            <th className="pb-3 pr-4 font-medium text-right">ACOS</th>
            <th className="pb-3 pr-4 font-medium text-right">ROAS</th>
            <th className="pb-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr
              key={campaign.id}
              className="border-b last:border-0 hover:bg-muted/50 transition-colors"
            >
              {selectable && (
                <td className="py-3 pr-2">
                  <Checkbox
                    checked={selectedIds.has(campaign.id)}
                    onCheckedChange={() => toggleOne(campaign.id)}
                  />
                </td>
              )}
              <td className="py-3 pr-4">
                <Link
                  href={`/campaigns/${campaign.id}`}
                  className="font-medium hover:underline"
                >
                  {campaign.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {campaign.campaignType} / {campaign.targetingType}
                </div>
              </td>
              <td className="py-3 pr-4 text-right">
                {formatCurrency(campaign.dailyBudget)}/day
              </td>
              <td className="py-3 pr-4 text-right">
                {formatCompactNumber(campaign.thirtyDay.impressions)}
              </td>
              <td className="py-3 pr-4 text-right">
                {formatCompactNumber(campaign.thirtyDay.clicks)}
              </td>
              <td className="py-3 pr-4 text-right">
                {formatCurrency(campaign.thirtyDay.cost)}
              </td>
              <td className="py-3 pr-4 text-right">
                {formatCurrency(campaign.thirtyDay.sales)}
              </td>
              <td className="py-3 pr-4 text-right">
                <span
                  className={cn(
                    campaign.targetAcos &&
                      campaign.thirtyDay.acos > campaign.targetAcos
                      ? 'text-red-600 font-medium'
                      : ''
                  )}
                >
                  {formatPercentage(campaign.thirtyDay.acos)}
                </span>
              </td>
              <td className="py-3 pr-4 text-right">
                {campaign.thirtyDay.roas.toFixed(2)}x
              </td>
              <td className="py-3">
                <Badge
                  variant={
                    campaign.state === 'enabled'
                      ? 'default'
                      : campaign.state === 'paused'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="capitalize"
                >
                  {campaign.state}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
