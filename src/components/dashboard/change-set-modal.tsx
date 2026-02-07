'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatPercentage } from '@/lib/utils/formatters';
import { useCreateChangeSet, useExportChangeSet, useApplyChangeSet } from '@/hooks/use-change-sets';

export interface SelectedEntity {
  id: string;
  name: string;
  campaignName?: string;
  adGroupName?: string;
  amazonCampaignId?: string;
  amazonAdGroupId?: string;
  amazonKeywordId?: string;
  matchType?: string;
  currentBid?: number;
  currentBudget?: number;
  currentState?: string;
  currentTos?: number;
  currentRos?: number;
  currentPdp?: number;
}

interface ChangeSetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'CAMPAIGN' | 'KEYWORD';
  selectedEntities: SelectedEntity[];
  onSuccess: () => void;
}

export function ChangeSetModal({
  open,
  onOpenChange,
  entityType,
  selectedEntities,
  onSuccess,
}: ChangeSetModalProps) {
  const [newBid, setNewBid] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [newState, setNewState] = useState('');
  const [newTos, setNewTos] = useState('');
  const [newRos, setNewRos] = useState('');
  const [newPdp, setNewPdp] = useState('');

  const createChangeSet = useCreateChangeSet();
  const exportChangeSet = useExportChangeSet();
  const applyChangeSet = useApplyChangeSet();

  const entityLabel = entityType === 'CAMPAIGN' ? 'Campaigns' : 'Keywords';

  const buildChanges = useCallback(() => {
    const changes: Record<string, any> = {};
    if (entityType === 'KEYWORD' && newBid) changes.bid = parseFloat(newBid);
    if (entityType === 'CAMPAIGN' && newBudget) changes.budget = parseFloat(newBudget);
    if (newState && newState !== 'no-change') changes.state = newState;
    if (entityType === 'CAMPAIGN') {
      if (newTos) changes.tosModifier = parseInt(newTos);
      if (newRos) changes.rosModifier = parseInt(newRos);
      if (newPdp) changes.pdpModifier = parseInt(newPdp);
    }
    return changes;
  }, [entityType, newBid, newBudget, newState, newTos, newRos, newPdp]);

  const hasChanges = Object.keys(buildChanges()).length > 0;

  const buildItems = useCallback(() => {
    const changes = buildChanges();
    return selectedEntities.map((e) => {
      const previousValues: Record<string, any> = {};
      if (changes.bid != null && e.currentBid != null) previousValues.bid = e.currentBid;
      if (changes.budget != null && e.currentBudget != null) previousValues.budget = e.currentBudget;
      if (changes.state != null && e.currentState != null) previousValues.state = e.currentState.toLowerCase();
      if (changes.tosModifier != null && e.currentTos != null) previousValues.tosModifier = e.currentTos;
      if (changes.rosModifier != null && e.currentRos != null) previousValues.rosModifier = e.currentRos;
      if (changes.pdpModifier != null && e.currentPdp != null) previousValues.pdpModifier = e.currentPdp;

      return {
        entityType,
        entityId: e.id,
        entityName: e.name,
        campaignName: e.campaignName,
        adGroupName: e.adGroupName,
        amazonCampaignId: e.amazonCampaignId,
        amazonAdGroupId: e.amazonAdGroupId,
        amazonKeywordId: e.amazonKeywordId,
        matchType: e.matchType,
        changes,
        previousValues: Object.keys(previousValues).length > 0 ? previousValues : undefined,
      };
    });
  }, [selectedEntities, entityType, buildChanges]);

  const formatValue = (value: number | string | undefined, format: 'currency' | 'percentage' | 'state') => {
    if (value === undefined || value === null) return '-';
    if (format === 'state') return String(value);
    return format === 'currency' ? formatCurrency(value as number) : formatPercentage(value as number);
  };

  const resetForm = () => {
    setNewBid('');
    setNewBudget('');
    setNewState('');
    setNewTos('');
    setNewRos('');
    setNewPdp('');
  };

  const handleSaveDraft = async () => {
    if (!hasChanges) return;
    try {
      await createChangeSet.mutateAsync({ items: buildItems() });
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch {
      // Error handled by React Query
    }
  };

  const handleExport = async () => {
    if (!hasChanges) return;
    try {
      const result = await createChangeSet.mutateAsync({ items: buildItems() });

      const blob = await exportChangeSet.mutateAsync(result.changeSet.id);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `change-set-${result.changeSet.id}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch {
      // Error handled by React Query
    }
  };

  const handleApply = async () => {
    if (!hasChanges) return;
    try {
      const result = await createChangeSet.mutateAsync({ items: buildItems() });
      await applyChangeSet.mutateAsync(result.changeSet.id);
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch {
      // Error handled by React Query
    }
  };

  const isLoading = createChangeSet.isPending || exportChangeSet.isPending || applyChangeSet.isPending;

  // Build preview fields
  const changes = buildChanges();
  const previewFields: Array<{ label: string; key: string; currentKey: string; format: 'currency' | 'percentage' | 'state' }> = [];
  if (changes.bid != null) previewFields.push({ label: 'Bid', key: 'bid', currentKey: 'currentBid', format: 'currency' });
  if (changes.budget != null) previewFields.push({ label: 'Budget', key: 'budget', currentKey: 'currentBudget', format: 'currency' });
  if (changes.state != null) previewFields.push({ label: 'State', key: 'state', currentKey: 'currentState', format: 'state' });
  if (changes.tosModifier != null) previewFields.push({ label: 'TOS %', key: 'tosModifier', currentKey: 'currentTos', format: 'percentage' });
  if (changes.rosModifier != null) previewFields.push({ label: 'ROS %', key: 'rosModifier', currentKey: 'currentRos', format: 'percentage' });
  if (changes.pdpModifier != null) previewFields.push({ label: 'PDP %', key: 'pdpModifier', currentKey: 'currentPdp', format: 'percentage' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Edit {selectedEntities.length} {entityLabel}
          </DialogTitle>
          <DialogDescription>
            Set new values for the selected {entityLabel.toLowerCase()}. Leave fields empty to keep
            current values.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {entityType === 'KEYWORD' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">New Bid</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.02"
                  placeholder="e.g. 1.50"
                  value={newBid}
                  onChange={(e) => setNewBid(e.target.value)}
                />
              </div>
            )}
            {entityType === 'CAMPAIGN' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">New Daily Budget</label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="e.g. 50.00"
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Select value={newState} onValueChange={setNewState}>
                <SelectTrigger>
                  <SelectValue placeholder="No change" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-change">No change</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {entityType === 'CAMPAIGN' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">TOS %</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="900"
                    placeholder="e.g. 50"
                    value={newTos}
                    onChange={(e) => setNewTos(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ROS %</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="900"
                    placeholder="e.g. 25"
                    value={newRos}
                    onChange={(e) => setNewRos(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">PDP %</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="900"
                    placeholder="e.g. 30"
                    value={newPdp}
                    onChange={(e) => setNewPdp(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {previewFields.length > 0 && (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground bg-muted/50">
                    <th className="px-3 py-2 font-medium">
                      {entityType === 'CAMPAIGN' ? 'Campaign' : 'Keyword'}
                    </th>
                    {previewFields.map((field) => (
                      <th key={field.key} className="px-3 py-2 font-medium text-right">
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedEntities.map((entity) => (
                    <tr
                      key={entity.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-3 py-2 font-medium">
                        {entity.name}
                        {entity.campaignName && (
                          <div className="text-xs text-muted-foreground">
                            {entity.campaignName}
                          </div>
                        )}
                      </td>
                      {previewFields.map((field) => {
                        const currentValue = entity[field.currentKey as keyof typeof entity] as
                          | number | string | undefined;
                        const newValue = changes[field.key];

                        return (
                          <td key={field.key} className="px-3 py-2 text-right">
                            <span className="text-muted-foreground">
                              {formatValue(currentValue, field.format)}
                            </span>
                            <span className="mx-1 text-muted-foreground">&rarr;</span>
                            <span className="font-medium">
                              {formatValue(newValue, field.format)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => { resetForm(); onOpenChange(false); }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!hasChanges || isLoading}
          >
            {createChangeSet.isPending && !exportChangeSet.isPending && !applyChangeSet.isPending
              ? 'Saving...'
              : 'Save Draft'}
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!hasChanges || isLoading}
          >
            {exportChangeSet.isPending ? 'Exporting...' : 'Export Bulksheet'}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!hasChanges || isLoading}
          >
            {applyChangeSet.isPending ? 'Applying...' : 'Apply Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
