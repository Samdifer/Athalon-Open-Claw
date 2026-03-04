"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { pdf } from "@react-pdf/renderer";
import { Form8130PDF } from "@/lib/pdf/Form8130PDF";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Download8130ButtonProps {
  eightOneThirtyId: Id<"eightOneThirtyRecords">;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function Download8130Button({
  eightOneThirtyId,
  variant = "outline",
  size = "sm",
  className,
}: Download8130ButtonProps) {
  const data = useQuery(api.form8130.getForm8130Data, { recordId: eightOneThirtyId });
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    if (!data) {
      toast.error("8130-3 record data not available yet.");
      return;
    }

    setGenerating(true);
    try {
      const blob = await pdf(
        <Form8130PDF
          approvingAuthority={data.approvingAuthority}
          formTrackingNumber={data.formTrackingNumber}
          organizationName={data.organizationName ?? ""}
          workOrderNumber={data.workOrderReference}
          partDescription={data.partDescription}
          partNumber={data.partNumber}
          quantity={data.quantity}
          serialNumber={data.serialBatchNumber}
          statusWork={data.statusWork}
          remarks={data.remarks}
          inspectorName={data.authorizedSignatoryName}
          approvalNumber={data.approvalNumber}
          signatureDate={data.signatureDate}
          certifyingStatement={data.certifyingStatement}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `8130-3_${data.formTrackingNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("8130-3 PDF downloaded");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate 8130-3 PDF",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleDownload}
      disabled={generating || !data}
    >
      {generating ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <FileDown className="h-3.5 w-3.5 mr-1" />
      )}
      {generating ? "Generating..." : "8130-3 PDF"}
    </Button>
  );
}
