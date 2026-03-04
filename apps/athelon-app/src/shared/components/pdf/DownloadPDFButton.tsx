"use client";

import type { ReactElement } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DownloadPDFButtonProps {
  document: ReactElement<DocumentProps>;
  fileName: string;
  label?: string;
}

export function DownloadPDFButton({ document, fileName, label = "Download PDF" }: DownloadPDFButtonProps) {
  return (
    <PDFDownloadLink document={document} fileName={fileName}>
      {({ loading }) => (
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" disabled={loading}>
          <Download className="w-3.5 h-3.5" />
          {loading ? "Generating..." : label}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
