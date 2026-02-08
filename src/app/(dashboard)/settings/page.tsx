'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Globe,
  Key,
  Pencil,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { useSyncCampaigns } from '@/hooks/use-campaigns';
import { useUploadReport, useReportHistory } from '@/hooks/use-reports';
import {
  useDataSource,
  useUpdateDataSource,
  useApiCredentials,
  useSaveApiCredentials,
} from '@/hooks/use-settings';

export default function SettingsPage() {
  const { data: dataSourceData, isLoading: dsLoading } = useDataSource();
  const updateDataSource = useUpdateDataSource();
  const { data: credentials, isLoading: credsLoading } = useApiCredentials();
  const saveCredentials = useSaveApiCredentials();
  const syncMutation = useSyncCampaigns();
  const uploadMutation = useUploadReport();
  const { data: uploads, isLoading: uploadsLoading } = useReportHistory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Credentials form state
  const [editing, setEditing] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [profileId, setProfileId] = useState('');
  const [region, setRegion] = useState('NA');
  const [accountType, setAccountType] = useState('SELLER');

  const serverSource = dataSourceData?.dataSource || 'BULK';
  const isConnected = credentials?.connected;

  // Local view mode controls which section is visible (independent of server state)
  const [viewMode, setViewMode] = useState<'API' | 'BULK'>(serverSource);

  // Sync viewMode when server data loads
  useEffect(() => {
    if (dataSourceData?.dataSource) {
      setViewMode(dataSourceData.dataSource);
    }
  }, [dataSourceData?.dataSource]);

  function handleSourceToggle(source: 'API' | 'BULK') {
    if (source === viewMode) return;
    setViewMode(source);

    if (source === 'API') {
      // Just show the API section locally — don't call server until credentials are saved
      if (!isConnected) {
        setEditing(true);
      }
    } else {
      // Switching to BULK is always allowed
      if (serverSource === 'API') {
        updateDataSource.mutate('BULK');
      }
    }
  }

  function handleSaveCredentials(e: React.FormEvent) {
    e.preventDefault();
    saveCredentials.mutate(
      { clientId, clientSecret, refreshToken, profileId, region, accountType },
      {
        onSuccess: () => {
          setEditing(false);
          setClientId('');
          setClientSecret('');
          setRefreshToken('');
        },
      }
    );
  }

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

  if (dsLoading || credsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your data source and preferences</p>
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your data source and preferences
        </p>
      </div>

      {/* Data Source Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Data Source</CardTitle>
          <CardDescription>
            Choose how campaign data is loaded into PMP Systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={viewMode === 'API' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleSourceToggle('API')}
              disabled={updateDataSource.isPending}
            >
              <Globe className="mr-2 h-4 w-4" />
              Amazon API
            </Button>
            <Button
              variant={viewMode === 'BULK' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleSourceToggle('BULK')}
              disabled={updateDataSource.isPending}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Bulk File Upload
            </Button>
          </div>
          {updateDataSource.isError && (
            <p className="mt-2 text-sm text-red-600">
              {(updateDataSource.error as any)?.response?.data?.error || 'Failed to switch data source'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* API Mode */}
      {viewMode === 'API' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Amazon API Credentials
            </CardTitle>
            <CardDescription>
              Enter your Login with Amazon (LWA) credentials to connect via API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connected status */}
            {isConnected && !editing && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Connected</span>
                  <Badge variant="secondary">{credentials.accountType}</Badge>
                </div>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client ID</span>
                    <span className="font-mono">{credentials.clientId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client Secret</span>
                    <span className="font-mono">**********</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profile ID</span>
                    <span className="font-mono">{credentials.profileId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Region</span>
                    <span>{credentials.region}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sync Status</span>
                    <Badge
                      variant={
                        credentials.syncStatus === 'completed'
                          ? 'default'
                          : credentials.syncStatus === 'failed'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {credentials.syncStatus}
                    </Badge>
                  </div>
                  {credentials.lastSyncAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Synced</span>
                      <span>{formatRelativeTime(credentials.lastSyncAt)}</span>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Credentials
                  </Button>
                </div>
              </div>
            )}

            {/* Credentials form */}
            {(editing || !isConnected) && (
              <form onSubmit={handleSaveCredentials} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client ID</label>
                  <Input
                    placeholder="amzn1.application-oa2-client.xxxxx"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client Secret</label>
                  <Input
                    type="password"
                    placeholder="Your LWA client secret"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Refresh Token</label>
                  <Input
                    type="password"
                    placeholder="Atzr|xxxxxxx"
                    value={refreshToken}
                    onChange={(e) => setRefreshToken(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Profile ID</label>
                  <Input
                    placeholder="1234567890"
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Region</label>
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NA">North America</SelectItem>
                        <SelectItem value="EU">Europe</SelectItem>
                        <SelectItem value="FE">Far East</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account Type</label>
                    <Select value={accountType} onValueChange={setAccountType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SELLER">Seller</SelectItem>
                        <SelectItem value="VENDOR">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {saveCredentials.isError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      {(saveCredentials.error as any)?.response?.data?.error || 'Failed to save credentials'}
                    </span>
                  </div>
                )}

                {saveCredentials.isSuccess && (
                  <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>Credentials saved and validated successfully!</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={saveCredentials.isPending}>
                    {saveCredentials.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      'Test & Save'
                    )}
                  </Button>
                  {isConnected && editing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bulk File Mode */}
      {viewMode === 'BULK' && (
        <>
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
                        {uploads.map((upload: any) => (
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

          {/* Data Sync Info */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sync</CardTitle>
              <CardDescription>
                Information about how your data is managed in Bulk File mode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  In Bulk File mode, upload your Amazon SP bulk reports (.xlsx) to keep your data up to date.
                </p>
                <p>
                  Switch to API mode to enable automatic syncing directly from Amazon Advertising API.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
