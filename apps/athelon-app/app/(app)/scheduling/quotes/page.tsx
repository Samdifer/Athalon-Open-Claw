"use client";

import { QuoteWorkspaceShell } from "@/components/quote-workspace/QuoteWorkspaceShell";
import { SchedulingSubNav } from "../_components/SchedulingSubNav";

export default function SchedulingQuotesPage() {
  return (
    <div className="space-y-4">
      <SchedulingSubNav />
      <QuoteWorkspaceShell surface="scheduling" />
    </div>
  );
}
