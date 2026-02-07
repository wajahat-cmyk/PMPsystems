'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useChangeSets,
  useExportChangeSet,
  useApplyChangeSet,
  useDeleteChangeSet,
} from '@/hooks/use-change-sets';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { Download, Play, Trash2 } from 'lucide-react';

const STATUS_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  EXPORTED: { label: 'Exported', variant: 'outline' },
  APPLIED: { label: 'Applied', variant: 'default' },
  FAILED: { label: 'Failed', variant: 'destructive' },
};

export default function ChangeSetsPage() {
  const { data: changeSets, isLoading } = useChangeSets();
  const exportChangeSet = useExportChangeSet();
  const applyChangeSet = useApplyChangeSet();
  const deleteChangeSet = useDeleteChangeSet();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleExport = async (id: string) => {
    try {
      const blob = await exportChangeSet.mutateAsync(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `change-set-${id}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // Error handled by React Query
    }
  };

  const handleApply = async (id: string) => {
    try {
      await applyChangeSet.mutateAsync(id);
    } catch {
      // Error handled by React Query
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteChangeSet.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Error handled by React Query
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = changeSets ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Change Sets</h1>
        <p className="text-muted-foreground">
          View and manage your saved change sets
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Change Sets ({data.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No change sets yet. Select campaigns or keywords and use the Bulk
              Actions button to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((cs: any) => {
                  const badge = STATUS_BADGES[cs.status] ?? STATUS_BADGES.DRAFT;
                  return (
                    <TableRow key={cs.id}>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {cs._count?.items ?? cs.itemCount ?? 0} items
                      </TableCell>
                      <TableCell>
                        {formatRelativeTime(cs.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Export Bulksheet"
                            onClick={() => handleExport(cs.id)}
                            disabled={exportChangeSet.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {cs.status === 'DRAFT' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Apply Changes"
                                onClick={() => handleApply(cs.id)}
                                disabled={applyChangeSet.isPending}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete"
                                onClick={() => setDeleteId(cs.id)}
                                disabled={deleteChangeSet.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Change Set</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this change set? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
