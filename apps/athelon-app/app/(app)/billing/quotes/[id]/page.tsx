"use client";

import type { Id } from "@/convex/_generated/dataModel";
import { useParams } from "react-router-dom";
import { QuoteDocumentView } from "@/components/quote-workspace/QuoteDocumentView";

export default function QuoteDetailPage() {
  const params = useParams();
  const quoteId = params.id as Id<"quotes"> | undefined;

  return <QuoteDocumentView quoteId={quoteId} />;
}
