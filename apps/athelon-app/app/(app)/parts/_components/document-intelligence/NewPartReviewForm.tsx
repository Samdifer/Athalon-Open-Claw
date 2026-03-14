"use client";

import { useState } from "react";
import {
  Package,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExtractionFieldConfidenceBadge } from "./ExtractionFieldConfidenceBadge";
import type {
  ExtractedPartData,
  ConfidenceLevel,
  FieldConfidence,
} from "@/src/shared/lib/documentIntelligence";

type PartCondition = "new" | "serviceable" | "overhauled" | "repaired";

const CONDITION_OPTIONS: { value: PartCondition; label: string }[] = [
  { value: "new", label: "New" },
  { value: "serviceable", label: "Serviceable (used)" },
  { value: "overhauled", label: "Overhauled" },
  { value: "repaired", label: "Repaired" },
];

interface NearMatch {
  _id: string;
  partNumber: string;
  serialNumber?: string;
  partName: string;
}

export function NewPartReviewForm({
  extractedData,
  fieldConfidences,
  nearMatches,
  onCreatePart,
  onSkip,
  creating,
}: {
  extractedData: ExtractedPartData;
  fieldConfidences: Partial<Record<string, FieldConfidence>>;
  nearMatches: NearMatch[];
  onCreatePart: (data: ExtractedPartData) => void;
  onSkip: () => void;
  creating?: boolean;
}) {
  // Editable form state initialized from extraction
  const [partNumber, setPartNumber] = useState(extractedData.partNumber ?? "");
  const [partName, setPartName] = useState(extractedData.partName ?? "");
  const [description, setDescription] = useState(extractedData.description ?? "");
  const [serialNumber, setSerialNumber] = useState(extractedData.serialNumber ?? "");
  const [condition, setCondition] = useState<PartCondition>(extractedData.condition ?? "new");
  const [supplier, setSupplier] = useState(extractedData.supplier ?? "");
  const [poNumber, setPoNumber] = useState(extractedData.purchaseOrderNumber ?? "");
  const [quantity, setQuantity] = useState(extractedData.quantityOnHand ?? 1);

  // Life limits
  const [isLifeLimited, setIsLifeLimited] = useState(extractedData.isLifeLimited ?? false);
  const [lifeLimitHours, setLifeLimitHours] = useState(extractedData.lifeLimitHours ?? 0);
  const [lifeLimitCycles, setLifeLimitCycles] = useState(extractedData.lifeLimitCycles ?? 0);

  // Shelf life
  const [hasShelfLife, setHasShelfLife] = useState(extractedData.hasShelfLifeLimit ?? false);
  const [shelfLifeDate, setShelfLifeDate] = useState(extractedData.shelfLifeLimitDate ?? "");

  // Section visibility
  const [showLifeLimits, setShowLifeLimits] = useState(extractedData.isLifeLimited ?? false);
  const [showShelfLife, setShowShelfLife] = useState(extractedData.hasShelfLifeLimit ?? false);
  const [show8130, setShow8130] = useState(!!extractedData.eightOneThirty);

  const getConfidence = (field: string): ConfidenceLevel | undefined => {
    return fieldConfidences[field]?.confidence as ConfidenceLevel | undefined;
  };

  const fieldClass = (field: string) => {
    const conf = getConfidence(field);
    if (conf === "low") return "border-amber-300 bg-amber-50";
    return "";
  };

  const handleSubmit = () => {
    const data: ExtractedPartData = {
      partNumber,
      partName,
      description: description || undefined,
      serialNumber: serialNumber || undefined,
      condition,
      supplier: supplier || undefined,
      purchaseOrderNumber: poNumber || undefined,
      quantityOnHand: quantity,
      isLifeLimited,
      hasShelfLifeLimit: hasShelfLife,
    };

    if (isLifeLimited) {
      data.lifeLimitHours = lifeLimitHours || undefined;
      data.lifeLimitCycles = lifeLimitCycles || undefined;
    }

    if (hasShelfLife && shelfLifeDate) {
      data.shelfLifeLimitDate = shelfLifeDate;
    }

    if (extractedData.eightOneThirty) {
      data.eightOneThirty = extractedData.eightOneThirty;
    }

    onCreatePart(data);
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-600" />
          New Part — Review Extracted Data
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Review and edit the fields below before creating this part. Fields highlighted in amber
          have low confidence — please verify.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Near-match warning */}
        {nearMatches.length > 0 && (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription className="text-xs">
              <strong>Possible duplicates found:</strong>{" "}
              {nearMatches.map((m) => `${m.partNumber} (${m.partName})`).join(", ")}
              . Please verify this is a new, distinct part before creating.
            </AlertDescription>
          </Alert>
        )}

        {/* Core fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Part Number *</Label>
              {getConfidence("partNumber") && (
                <ExtractionFieldConfidenceBadge confidence={getConfidence("partNumber")!} />
              )}
            </div>
            <Input
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              className={`h-8 text-sm font-mono ${fieldClass("partNumber")}`}
              disabled={creating}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Part Name *</Label>
              {getConfidence("partName") && (
                <ExtractionFieldConfidenceBadge confidence={getConfidence("partName")!} />
              )}
            </div>
            <Input
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              className={`h-8 text-sm ${fieldClass("partName")}`}
              disabled={creating}
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`text-sm min-h-[60px] ${fieldClass("description")}`}
              disabled={creating}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Serial Number</Label>
              {getConfidence("serialNumber") && (
                <ExtractionFieldConfidenceBadge confidence={getConfidence("serialNumber")!} />
              )}
            </div>
            <Input
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className={`h-8 text-sm font-mono ${fieldClass("serialNumber")}`}
              disabled={creating}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Condition</Label>
            <Select
              value={condition}
              onValueChange={(v) => setCondition(v as PartCondition)}
              disabled={creating}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Supplier</Label>
              {getConfidence("supplier") && (
                <ExtractionFieldConfidenceBadge confidence={getConfidence("supplier")!} />
              )}
            </div>
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className={`h-8 text-sm ${fieldClass("supplier")}`}
              disabled={creating}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs">PO Number</Label>
              {getConfidence("purchaseOrderNumber") && (
                <ExtractionFieldConfidenceBadge confidence={getConfidence("purchaseOrderNumber")!} />
              )}
            </div>
            <Input
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className={`h-8 text-sm font-mono ${fieldClass("purchaseOrderNumber")}`}
              disabled={creating}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Quantity</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="h-8 text-sm"
              min={1}
              disabled={creating}
            />
          </div>
        </div>

        {/* Life Limits Section */}
        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowLifeLimits(!showLifeLimits)}
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            {showLifeLimits ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            Life-Limited Part (LLP)
          </button>
          {showLifeLimits && (
            <div className="mt-3 ml-6 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isLifeLimited}
                  onCheckedChange={(c) => setIsLifeLimited(!!c)}
                  disabled={creating}
                />
                <Label className="text-xs">This part is life-limited</Label>
              </div>
              {isLifeLimited && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Life Limit (Hours)</Label>
                    <Input
                      type="number"
                      value={lifeLimitHours || ""}
                      onChange={(e) => setLifeLimitHours(parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                      disabled={creating}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Life Limit (Cycles)</Label>
                    <Input
                      type="number"
                      value={lifeLimitCycles || ""}
                      onChange={(e) => setLifeLimitCycles(parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                      disabled={creating}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shelf Life Section */}
        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowShelfLife(!showShelfLife)}
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            {showShelfLife ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            Shelf Life / Expiry
          </button>
          {showShelfLife && (
            <div className="mt-3 ml-6 space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={hasShelfLife}
                  onCheckedChange={(c) => setHasShelfLife(!!c)}
                  disabled={creating}
                />
                <Label className="text-xs">This part has a shelf life limit</Label>
              </div>
              {hasShelfLife && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Expiry Date</Label>
                  <Input
                    type="date"
                    value={shelfLifeDate}
                    onChange={(e) => setShelfLifeDate(e.target.value)}
                    className="h-8 text-sm w-48"
                    disabled={creating}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 8130-3 Section */}
        {extractedData.eightOneThirty && (
          <div className="border-t pt-3">
            <button
              type="button"
              onClick={() => setShow8130(!show8130)}
              className="flex items-center gap-2 text-sm font-medium text-foreground"
            >
              {show8130 ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              FAA Form 8130-3 Data
            </button>
            {show8130 && (
              <div className="mt-3 ml-6 grid grid-cols-2 gap-3">
                {Object.entries(extractedData.eightOneThirty).map(([key, value]) => {
                  if (value === null || value === undefined) return null;
                  return (
                    <div key={key} className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </Label>
                      <p className="text-xs font-mono bg-muted/50 rounded px-2 py-1 truncate">
                        {String(value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="border-t pt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Part will be created in <span className="font-medium">Pending Inspection</span> status.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onSkip} disabled={creating}>
              Skip
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={creating || !partNumber.trim() || !partName.trim()}
            >
              {creating ? "Creating..." : "Create Part"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
