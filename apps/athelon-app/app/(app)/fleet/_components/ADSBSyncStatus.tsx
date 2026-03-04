import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type SyncState = "active" | "paused" | "error";

interface ADSBSyncStatusProps {
  status: SyncState;
  lastSyncAt: number | null;
  icaoHex: string;
  errorMessage?: string | null;
}

function getStatusClass(status: SyncState) {
  if (status === "active") return "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30";
  if (status === "paused") return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
  return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
}

export function ADSBSyncStatus({
  status,
  lastSyncAt,
  icaoHex,
  errorMessage,
}: ADSBSyncStatusProps) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">ADS-B Sync Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant="outline" className={`text-[11px] border ${getStatusClass(status)}`}>
            {status}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">ICAO Hex</span>
          <span className="font-mono text-sm text-foreground">{icaoHex || "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Last Sync</span>
          <span className="text-sm text-foreground">
            {lastSyncAt
              ? new Date(lastSyncAt).toLocaleString("en-US", { timeZone: "UTC" }) + " UTC"
              : "Never"}
          </span>
        </div>

        {status === "error" && errorMessage ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2">
            <p className="text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
