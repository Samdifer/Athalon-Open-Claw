"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  CheckCircle,
  XCircle,
  RefreshCw,
  Receipt,
  FileDown,
  Printer,
  MoreHorizontal,
  ExternalLink,
  Trash2,
} from "lucide-react";

type QuoteStatus = "DRAFT" | "SENT" | "APPROVED" | "CONVERTED" | "DECLINED";

export interface QuoteActionBarProps {
  status: QuoteStatus;
  convertibleLineCount: number;
  convertedToWorkOrderId?: string;
  isLoading: string | null;
  onSend: () => void;
  onApprove: () => void;
  onDecline: () => void;
  onCreateRevision: () => void;
  onConvertToWO: () => void;
  onCreateInvoice: () => void;
  onDownloadPDF: React.ReactNode;
  onPrint: React.ReactNode;
}

export function QuoteActionBar({
  status,
  convertibleLineCount,
  convertedToWorkOrderId,
  isLoading,
  onSend,
  onApprove,
  onDecline,
  onCreateRevision,
  onConvertToWO,
  onCreateInvoice,
  onDownloadPDF,
  onPrint,
}: QuoteActionBarProps) {
  const canSend = status === "DRAFT";
  const canApprove = status === "SENT";
  const canDecline = status === "SENT";
  const canConvert = status === "APPROVED" && convertibleLineCount > 0;
  const canRevise = status === "SENT" || status === "DECLINED";
  const canCreateInvoice = status === "APPROVED";

  return (
    <div className="flex items-center gap-2">
      {/* Primary CTA based on status */}
      {canSend && (
        <Button
          size="sm"
          onClick={onSend}
          disabled={isLoading === "send"}
          className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"
        >
          <Send className="w-3.5 h-3.5" />
          {isLoading === "send" ? "Sending..." : "Send to Customer"}
        </Button>
      )}

      {canApprove && (
        <Button
          size="sm"
          onClick={onApprove}
          disabled={isLoading === "approve"}
          className="h-8 gap-1.5 text-xs bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          {isLoading === "approve" ? "Approving..." : "Approve"}
        </Button>
      )}

      {canConvert && (
        <Button
          size="sm"
          onClick={onConvertToWO}
          className="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Convert to Work Order
        </Button>
      )}

      {status === "DECLINED" && (
        <Button
          size="sm"
          variant="outline"
          onClick={onCreateRevision}
          disabled={isLoading === "revision"}
          className="h-8 gap-1.5 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {isLoading === "revision" ? "Creating..." : "Create Revision"}
        </Button>
      )}

      {status === "CONVERTED" && convertedToWorkOrderId && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          asChild
        >
          <a href={`/work-orders/${convertedToWorkOrderId}`}>
            <ExternalLink className="w-3.5 h-3.5" />
            View Work Order
          </a>
        </Button>
      )}

      {/* Secondary actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* PDF/Print — always available */}
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              {onDownloadPDF}
            </div>
          </div>
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              {onPrint}
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Status-specific secondary actions */}
          {canDecline && (
            <DropdownMenuItem
              onClick={onDecline}
              className="text-red-600 dark:text-red-400 focus:text-red-600"
            >
              <XCircle className="w-3.5 h-3.5 mr-2" />
              Decline
            </DropdownMenuItem>
          )}

          {canRevise && status === "SENT" && (
            <DropdownMenuItem
              onClick={onCreateRevision}
              disabled={isLoading === "revision"}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Create Revision
            </DropdownMenuItem>
          )}

          {canCreateInvoice && (
            <DropdownMenuItem onClick={onCreateInvoice}>
              <Receipt className="w-3.5 h-3.5 mr-2" />
              Create Invoice
            </DropdownMenuItem>
          )}

          {canConvert && status === "APPROVED" && (
            <DropdownMenuItem onClick={onCreateRevision}>
              <RefreshCw className="w-3.5 h-3.5 mr-2" />
              Create Revision
            </DropdownMenuItem>
          )}

          {status === "CONVERTED" && (
            <DropdownMenuItem onClick={onCreateInvoice}>
              <Receipt className="w-3.5 h-3.5 mr-2" />
              Create Invoice
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
