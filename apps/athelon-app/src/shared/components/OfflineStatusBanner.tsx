import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Wifi, WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/src/shared/hooks/useNetworkStatus";

export function OfflineStatusBanner() {
  const { isOnline } = useNetworkStatus();
  const wasOnline = useRef(isOnline);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (wasOnline.current && !isOnline) {
      toast.warning("You are offline. Read-only screens may show cached data.");
    }

    if (!wasOnline.current && isOnline) {
      toast.success("Connection restored. Live data is syncing.");
      setShowBackOnline(true);
      const timer = window.setTimeout(() => setShowBackOnline(false), 4000);
      return () => window.clearTimeout(timer);
    }

    wasOnline.current = isOnline;
  }, [isOnline]);

  if (isOnline && !showBackOnline) return null;

  if (!isOnline) {
    return (
      <div className="mx-2 sm:mx-4 md:mx-6 mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
        <div className="flex items-start gap-2">
          <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <div className="font-medium">Offline mode</div>
            <div className="text-amber-200/90">
              Critical read screens can use cached snapshots. Write actions require connectivity and are not queued offline.
            </div>
          </div>
          <AlertTriangle className="mt-0.5 ml-auto h-3.5 w-3.5 shrink-0 opacity-70" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-2 sm:mx-4 md:mx-6 mt-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
      <div className="flex items-center gap-2">
        <Wifi className="h-3.5 w-3.5" />
        <span className="font-medium">Back online — live updates resumed.</span>
      </div>
    </div>
  );
}
