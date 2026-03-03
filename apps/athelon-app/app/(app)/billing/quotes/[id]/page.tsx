"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useParams } from "react-router-dom";
import { QuoteWorkspaceShell } from "@/components/quote-workspace/QuoteWorkspaceShell";

export default function QuoteDetailPage() {
  const params = useParams();
  const quoteId = params.id as Id<"quotes"> | undefined;

  return <QuoteWorkspaceShell surface="billing" forceQuoteId={quoteId} />;
}
