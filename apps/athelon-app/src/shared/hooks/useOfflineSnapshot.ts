import { useEffect, useMemo, useState } from "react";
import { useNetworkStatus } from "@/src/shared/hooks/useNetworkStatus";

type WithUndefined<T> = T | undefined;

export function useOfflineSnapshot<T>(
  storageKey: string,
  liveValue: WithUndefined<T>,
): { value: WithUndefined<T>; fromCache: boolean } {
  const { isOnline } = useNetworkStatus();
  const [cachedValue, setCachedValue] = useState<WithUndefined<T>>(() => {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
      return undefined;
    }
  });

  useEffect(() => {
    if (liveValue === undefined) return;
    setCachedValue(liveValue);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(liveValue));
    } catch {
      // best-effort cache only
    }
  }, [liveValue, storageKey]);

  return useMemo(() => {
    if (liveValue !== undefined) return { value: liveValue, fromCache: false };
    if (!isOnline && cachedValue !== undefined) {
      return { value: cachedValue, fromCache: true };
    }
    return { value: liveValue, fromCache: false };
  }, [liveValue, isOnline, cachedValue]);
}
