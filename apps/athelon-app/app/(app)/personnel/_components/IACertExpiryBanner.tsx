// ─── IACertExpiryBanner ─────────────────────────────────────────────────────
// FEAT-018: IA Certificate Expiry Banner extracted from Personnel page.

import { ShieldAlert, AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface IACertExpiryBannerProps {
  expiringCerts: Array<{
    technician: { _id: string; legalName: string } | null;
    cert: {
      _id: string;
      iaExpiryDate?: number;
      certificateNumber?: string;
    };
  }>;
}

export function IACertExpiryBanner({ expiringCerts }: IACertExpiryBannerProps) {
  if (expiringCerts.length === 0) return null;

  const hasExpired = expiringCerts.some(
    (e) =>
      e.cert.iaExpiryDate !== undefined && e.cert.iaExpiryDate < Date.now(),
  );
  const hasCritical = expiringCerts.some(
    (e) =>
      e.cert.iaExpiryDate !== undefined &&
      Math.ceil(
        (e.cert.iaExpiryDate - Date.now()) / (1000 * 60 * 60 * 24),
      ) <= 14,
  );

  const isSevere = hasExpired || hasCritical;
  const bannerClass = isSevere
    ? "border-red-500/40 bg-red-500/8"
    : "border-amber-500/40 bg-amber-500/8";
  const iconClass = isSevere
    ? "text-red-600 dark:text-red-400"
    : "text-amber-600 dark:text-amber-400";
  const titleClass = isSevere
    ? "text-red-600 dark:text-red-400"
    : "text-amber-600 dark:text-amber-400";

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${bannerClass}`}
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${iconClass}`} />
        <span className={`text-sm font-semibold ${titleClass}`}>
          {hasExpired
            ? "IA Certificate Expired \u2014 Immediate Action Required"
            : "IA Certificate Expiry Alert"}
        </span>
      </div>

      <div className="space-y-2">
        {expiringCerts.map((e) => {
          const days =
            e.cert.iaExpiryDate !== undefined
              ? Math.ceil(
                  (e.cert.iaExpiryDate - Date.now()) / (1000 * 60 * 60 * 24),
                )
              : null;
          const isExp = days !== null && days <= 0;
          const isCrit = days !== null && days > 0 && days <= 14;
          const rowClass = isExp
            ? "text-red-600 dark:text-red-400"
            : isCrit
              ? "text-red-500 dark:text-red-300"
              : "text-amber-600 dark:text-amber-300";

          return (
            <div
              key={e.cert._id}
              className={`flex items-center justify-between gap-4 text-xs ${rowClass}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-medium truncate">
                  {e.technician?.legalName ?? "Unknown Technician"}
                </span>
                {e.cert.certificateNumber && (
                  <span className="font-mono text-[10px] opacity-80">
                    #{e.cert.certificateNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="font-semibold">
                  {days === null
                    ? "No expiry date"
                    : isExp
                      ? `Expired ${Math.abs(days)}d ago`
                      : `${days}d remaining`}
                </span>
                <Link
                  to="/settings/shop"
                  className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80 transition-opacity"
                >
                  Take Action
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground/70">
        Technicians with expired IA certificates may not perform inspection-level
        sign-offs. Per 14 CFR 65.93, renewal must be completed before the next
        inspection sign-off.
      </p>
    </div>
  );
}
