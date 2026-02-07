'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, RefreshCw, CheckCircle, XCircle, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { useSyncCampaigns } from '@/hooks/use-campaigns';
import { useUploadReport, useReportHistory } from '@/hooks/use-reports';

export default function SettingsPage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['amazon-profile'],
    queryFn: async () => {
      const { data } = await axios.get('/api/amazon/profile');
      return data.profile;
    },
  });

  const syncMutation = useSyncCampaigns();
  const uploadMutation = useUploadReport();
  const { data: uploads, isLoading: uploadsLoading } = useReportHistory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File) {
    if (!file.name.endsWith('.xlsx')) {
      alert('Only .xlsx files are supported');
      return;
    }
    uploadMutation.mutate(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your Amazon account connection and preferences
        </p>
      </div>

      {/* Amazon Connection */}
      <Card>
        <CardHeader>
          <CardTitle>Amazon Advertising Connection</CardTitle>
          <CardDescription>
            Connect your Amazon Advertising account to sync campaign data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-32" />
            </div>
          ) : profile ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Connected</span>
                <Badge variant="secondary">{profile.accountType}</Badge>
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profile ID</span>
                  <span className="font-mono">{profile.profileId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Country</span>
                  <span>{profile.countryCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency</span>
                  <span>{profile.currencyCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sync Status</span>
                  <Badge
                    variant={
                      profile.syncStatus === 'completed'
                        ? 'default'
                        : profile.syncStatus === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {profile.syncStatus}
                  </Badge>
                </div>
                {profile.lastSyncAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Synced</span>
                    <span>{formatRelativeTime(profile.lastSyncAt)}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
                  />
                  {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/api/amazon/oauth/authorize">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reconnect
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium">Not Connected</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Connect your Amazon Advertising account to start tracking your
                PPC campaigns.
              </p>
              <Button asChild>
                <a href="/api/amazon/oauth/authorize">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect Amazon Account
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Report Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Report Import
          </CardTitle>
          <CardDescription>
            Upload your Amazon SP bulk report (.xlsx) to import campaign data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            } ${uploadMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />
            {uploadMutation.isPending ? (
              <div className="space-y-2">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary" />
                <p className="text-sm font-medium">Processing report...</p>
                <p className="text-xs text-muted-foreground">This may take a minute for large files</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">Drop your .xlsx file here or click to browse</p>
                <p className="text-xs text-muted-foreground">Supports Amazon SP bulk reports up to 50MB</p>
              </div>
            )}
          </div>

          {/* Success/Error messages */}
          {uploadMutation.isSuccess && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>
                Report imported successfully!{' '}
                {uploadMutation.data?.upload && (
                  <>
                    {uploadMutation.data.upload.campaignCount} campaigns,{' '}
                    {uploadMutation.data.upload.keywordCount} keywords,{' '}
                    {uploadMutation.data.upload.searchTermCount} search terms
                  </>
                )}
              </span>
            </div>
          )}

          {uploadMutation.isError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {(uploadMutation.error as any)?.response?.data?.error || 'Failed to upload report'}
              </span>
            </div>
          )}

          {/* Upload History */}
          {uploadsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : uploads && uploads.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium mb-2">Upload History</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2 font-medium">File</th>
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-right p-2 font-medium">Campaigns</th>
                      <th className="text-right p-2 font-medium">Keywords</th>
                      <th className="text-right p-2 font-medium">Search Terms</th>
                      <th className="text-left p-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploads.map((upload) => (
                      <tr key={upload.id} className="border-t">
                        <td className="p-2 max-w-[200px] truncate">{upload.fileName}</td>
                        <td className="p-2 text-muted-foreground whitespace-nowrap">
                          {new Date(upload.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-2 text-right">{upload.campaignCount}</td>
                        <td className="p-2 text-right">{upload.keywordCount}</td>
                        <td className="p-2 text-right">{upload.searchTermCount}</td>
                        <td className="p-2">
                          <Badge
                            variant={
                              upload.status === 'COMPLETED'
                                ? 'default'
                                : upload.status === 'FAILED'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {upload.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Data Sync</CardTitle>
          <CardDescription>
            Your campaign data is automatically synced daily. You can also
            trigger a manual sync.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Automatic sync runs daily at 2:00 AM to fetch the latest campaign
              data from Amazon.
            </p>
            <p>
              Manual sync fetches the last 30 days of performance data for all
              campaigns.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
