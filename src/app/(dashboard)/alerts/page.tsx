'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAlerts, useMarkAlertRead, type AlertData } from '@/hooks/use-alerts';
import { formatRelativeTime } from '@/lib/utils/formatters';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  DollarSign,
  Target,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const alertIcons: Record<string, any> = {
  HIGH_ACOS: Target,
  LOW_ROAS: TrendingDown,
  BUDGET_EXCEEDED: DollarSign,
  BUDGET_PACING: AlertTriangle,
};

const severityStyles: Record<string, string> = {
  CRITICAL: 'border-red-200 bg-red-50',
  WARNING: 'border-yellow-200 bg-yellow-50',
  INFO: 'border-blue-200 bg-blue-50',
};

export default function AlertsPage() {
  const { data: alerts, isLoading } = useAlerts();
  const markRead = useMarkAlertRead();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const data = alerts ?? [];
  const unread = data.filter((a) => !a.isRead);
  const read = data.filter((a) => a.isRead);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts</h1>
          <p className="text-muted-foreground">
            {unread.length > 0
              ? `You have ${unread.length} unread alert${unread.length > 1 ? 's' : ''}`
              : 'All caught up! No unread alerts.'}
          </p>
        </div>
      </div>

      {/* Unread Alerts */}
      {unread.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Unread</h2>
          {unread.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onMarkRead={() => markRead.mutate(alert.id)}
            />
          ))}
        </div>
      )}

      {/* Read Alerts */}
      {read.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Previous Alerts
          </h2>
          {read.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {data.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium">No alerts yet</p>
            <p className="text-sm text-muted-foreground">
              Alerts will appear here when your campaigns need attention
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  onMarkRead,
}: {
  alert: AlertData;
  onMarkRead?: () => void;
}) {
  const Icon = alertIcons[alert.type] || Bell;
  const severityStyle = severityStyles[alert.severity] || '';

  return (
    <Card
      className={cn(
        'transition-colors',
        !alert.isRead && severityStyle,
        alert.isRead && 'opacity-70'
      )}
    >
      <CardContent className="flex items-start gap-4 pt-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            alert.severity === 'CRITICAL' && 'bg-red-100 text-red-600',
            alert.severity === 'WARNING' && 'bg-yellow-100 text-yellow-600',
            alert.severity === 'INFO' && 'bg-blue-100 text-blue-600'
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{alert.title}</h3>
            <Badge
              variant={
                alert.severity === 'CRITICAL'
                  ? 'destructive'
                  : alert.severity === 'WARNING'
                    ? 'default'
                    : 'secondary'
              }
              className="text-xs"
            >
              {alert.severity}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {formatRelativeTime(alert.triggeredAt)}
          </p>
        </div>
        {!alert.isRead && onMarkRead && (
          <Button variant="ghost" size="sm" onClick={onMarkRead}>
            <CheckCircle className="h-4 w-4 mr-1" />
            Mark read
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
