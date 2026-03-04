"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Eye, Upload, Archive } from "lucide-react";
import { formatDateTime } from "@/lib/format";

type DocumentCategory = "compliance" | "reference" | "photo" | "general";

type DocumentsPanelProps = {
  workOrderId: string;
};

function categoryForDocument(documentType: string): DocumentCategory {
  if (["ad_document", "parts_8130", "approved_data"].includes(documentType)) return "compliance";
  if (documentType === "photo") return "photo";
  if (["work_authorization", "vendor_invoice"].includes(documentType)) return "reference";
  return "general";
}

const CATEGORY_STYLES: Record<DocumentCategory, string> = {
  compliance: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  reference: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  photo: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  general: "bg-muted text-muted-foreground border-border/60",
};

export function DocumentsPanel({ workOrderId }: DocumentsPanelProps) {
  const [activeTab, setActiveTab] = useState<"all" | DocumentCategory>("all");

  const documents = useQuery(api.documents.listDocuments, {
    attachedToTable: "workOrders",
    attachedToId: workOrderId,
  });

  const docs = useMemo(() => {
    const list = (documents ?? []).map((doc) => ({
      ...doc,
      category: categoryForDocument(doc.documentType),
    }));
    if (activeTab === "all") return list;
    return list.filter((doc) => doc.category === activeTab);
  }, [documents, activeTab]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | DocumentCategory)}>
          {/* BUG-DOM-109: Documents categorized as "general" (work authorizations,
              misc uploads, etc.) were only visible under the "All" tab — there was no way
              to isolate them. A DOM reviewing WO documentation for an FAA audit needs to
              filter to general/uncategorized docs to verify nothing was misfiled. */}
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="reference">Reference</TabsTrigger>
            <TabsTrigger value="photo">Photos</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info("Upload coming soon — use drag & drop")}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info("Coming soon")}
          >
            <Archive className="w-3.5 h-3.5" />
            Bulk Download ZIP
          </Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {documents === undefined ? (
            <div className="p-4 text-sm text-muted-foreground">Loading documents…</div>
          ) : docs.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No documents in this category.</div>
          ) : (
            <div className="divide-y divide-border/40">
              {docs.map((doc) => (
                <DocumentRow key={doc._id} doc={doc} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentRow({
  doc,
}: {
  doc: {
    _id: Id<"documents">;
    storageId: Id<"_storage">;
    fileName: string;
    uploadedByUserId: string;
    uploadedAt: number;
    mimeType: string;
    category: DocumentCategory;
  };
}) {
  const url = useQuery(api.documents.getDocumentUrl, { storageId: doc.storageId });

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <FileText className="w-4 h-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
          <Badge variant="outline" className={`text-[10px] capitalize border ${CATEGORY_STYLES[doc.category]}`}>
            {doc.category}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Uploaded by {doc.uploadedByUserId} · {formatDateTime(doc.uploadedAt)}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {doc.mimeType === "application/pdf" && url && (
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <a href={url} target="_blank" rel="noreferrer">
              <Eye className="w-3.5 h-3.5" />
              View PDF
            </a>
          </Button>
        )}
        {url && (
          <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
            <a href={url} target="_blank" rel="noreferrer" download>
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
