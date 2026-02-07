'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { getBudgetPacingStatus } from '@/lib/utils/calculations';
import { formatCurrency } from '@/lib/utils/formatters';

interface BudgetPacingProps {
  campaignName: string;
  dailyBudget: number;
  spentToday: number;
  pacePercentage: number;
  hourOfDay: number;
}

export function BudgetPacing({
  campaignName,
  dailyBudget,
  spentToday,
  pacePercentage,
  hourOfDay,
}: BudgetPacingProps) {
  const remaining = dailyBudget - spentToday;
  const status = getBudgetPacingStatus(pacePercentage, hourOfDay);

  const statusConfig = {
    'on-track': {
      color: 'text-green-600',
      icon: CheckCircle,
      label: 'On track with expected spending',
      progressColor: 'bg-green-500',
    },
    'over-pacing': {
      color: 'text-red-600',
      icon: AlertTriangle,
      label: 'Spending faster than expected',
      progressColor: 'bg-red-500',
    },
    'under-pacing': {
      color: 'text-yellow-600',
      icon: Clock,
      label: 'Spending slower than expected',
      progressColor: 'bg-yellow-500',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${config.color}`} />
          <span className="truncate">{campaignName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Spent: {formatCurrency(spentToday)}</span>
            <span>Budget: {formatCurrency(dailyBudget)}</span>
          </div>
          <Progress
            value={Math.min(pacePercentage, 100)}
            className="h-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Pace: {pacePercentage.toFixed(1)}%</span>
            <span>
              Remaining: {formatCurrency(Math.max(remaining, 0))}
            </span>
          </div>
          <p className={`text-xs ${config.color}`}>{config.label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
