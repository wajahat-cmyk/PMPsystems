'use client';

import { Bell, RefreshCw, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAlerts } from '@/hooks/use-alerts';
import { useSyncCampaigns } from '@/hooks/use-campaigns';
import { usePortfolios } from '@/hooks/use-portfolios';
import { usePortfolioFilter } from '@/components/providers/portfolio-filter-provider';
import { signOut } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';

export function Header() {
  const queryClient = useQueryClient();
  const { data: alerts } = useAlerts();
  const syncMutation = useSyncCampaigns();
  const { data: portfolios } = usePortfolios();
  const { selectedPortfolio, setSelectedPortfolio } = usePortfolioFilter();

  const unreadCount = alerts?.filter((a: any) => !a.isRead).length ?? 0;
  const portfolioList = portfolios ?? [];

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-sm text-muted-foreground">
          PMP Systems
        </h2>

        {/* Portfolio Filter */}
        {portfolioList.length > 0 && (
          <Select
            value={selectedPortfolio ?? 'ALL'}
            onValueChange={(v) =>
              setSelectedPortfolio(v === 'ALL' ? null : v)
            }
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="All Portfolios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Portfolios</SelectItem>
              {portfolioList.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Sync Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
          />
          {syncMutation.isPending ? 'Syncing...' : 'Sync Data'}
        </Button>

        {/* Alerts */}
        <Button variant="ghost" size="icon" className="relative" asChild>
          <a href="/alerts">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {unreadCount}
              </Badge>
            )}
          </a>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href="/settings">
                <User className="mr-2 h-4 w-4" />
                Settings
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { queryClient.clear(); signOut({ callbackUrl: '/login' }); }}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
