"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import {
  Link2,
  Link2Off,
  RefreshCw,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";

const SYNC_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  synced: "bg-green-500/15 text-green-400 border-green-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  skipped: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const SYNC_STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  synced: <CheckCircle className="h-3.5 w-3.5" />,
  failed: <XCircle className="h-3.5 w-3.5" />,
  skipped: <AlertTriangle className="h-3.5 w-3.5" />,
};

export default function QuickBooksPage() {
  const { orgId } = useCurrentOrg();
  const settings = useQuery(api.quickbooks.getSettings, orgId ? { organizationId: orgId } : "skip");
  const syncStatus = useQuery(api.quickbooks.getSyncStatus, orgId ? { organizationId: orgId } : "skip");
  const syncLog = useQuery(api.quickbooks.listSyncLog, orgId ? { organizationId: orgId } : "skip");
  const updateSettings = useMutation(api.quickbooks.updateSettings);
  const testConnection = useAction(api.quickbooks.testConnection);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!orgId) return <div className="p-6"><Skeleton className="h-8 w-48" /></div>;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection({ organizationId: orgId });
      setTestResult(result.message);
    } catch {
      setTestResult("Connection test failed.");
    } finally {
      setTesting(false);
    }
  };

  const handleToggle = async (field: string, value: boolean) => {
    await updateSettings({ organizationId: orgId, [field]: value });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> QuickBooks Integration
        </h1>
        <p className="text-muted-foreground text-sm">Connect Athelon to QuickBooks Online for accounting sync</p>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {settings?.isConnected ? (
              <><Link2 className="h-5 w-5 text-green-400" /> Connected</>
            ) : (
              <><Link2Off className="h-5 w-5 text-muted-foreground" /> Not Connected</>
            )}
          </CardTitle>
          <CardDescription>
            {settings?.isConnected
              ? `Connected to ${"companyName" in settings ? settings.companyName ?? "QuickBooks" : "QuickBooks"} (Realm: ${"realmId" in settings ? settings.realmId ?? "—" : "—"})`
              : "Connect your QuickBooks Online account to enable automatic sync."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!settings?.isConnected && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm space-y-2">
              <p className="font-medium text-amber-400">Setup Required</p>
              <p className="text-muted-foreground">
                To connect QuickBooks Online, you&apos;ll need to provide your OAuth credentials.
                Contact your administrator to set up the QuickBooks integration with your company&apos;s
                Intuit Developer credentials.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
              <RefreshCw className={`h-4 w-4 mr-1 ${testing ? "animate-spin" : ""}`} />
              {testing ? "Testing…" : "Test Connection"}
            </Button>
          </div>
          {testResult && (
            <p className="text-sm text-muted-foreground">{testResult}</p>
          )}
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>Choose which data types to synchronize with QuickBooks</CardDescription>
        </CardHeader>
        <CardContent>
          {!settings ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (
            <div className="space-y-4">
              {([
                { key: "syncInvoices", label: "Invoices", desc: "Sync invoices to QuickBooks" },
                { key: "syncPayments", label: "Payments", desc: "Sync payment records" },
                { key: "syncCustomers", label: "Customers", desc: "Sync customer records" },
                { key: "syncVendors", label: "Vendors", desc: "Sync vendor records" },
                { key: "autoSync", label: "Auto Sync", desc: "Automatically sync new records when created" },
              ] as const).map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">{item.label}</Label>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={(settings as Record<string, unknown>)[item.key] as boolean}
                    onCheckedChange={(val) => handleToggle(item.key, val)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Status Summary */}
      {syncStatus && (
        <div className="grid grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Syncs</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{syncStatus.total}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-amber-400">{syncStatus.pending}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Synced</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-400">{syncStatus.synced}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Failed</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-400">{syncStatus.failed}</div></CardContent></Card>
        </div>
      )}

      {/* Sync Log */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Log</CardTitle>
          <CardDescription>Recent synchronization activity</CardDescription>
        </CardHeader>
        <CardContent>
          {!syncLog ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : syncLog.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No sync activity yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>QB ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLog.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell className="capitalize">{entry.entityType}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.entityId}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.qbId ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={SYNC_STATUS_STYLES[entry.syncStatus]}>
                        <span className="flex items-center gap-1">
                          {SYNC_STATUS_ICONS[entry.syncStatus]}
                          {entry.syncStatus}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>{entry.lastSyncAt ? formatDate(entry.lastSyncAt) : "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-red-400 text-xs">{entry.errorMessage ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
