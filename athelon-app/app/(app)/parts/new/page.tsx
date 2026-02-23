"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewPartPage() {
  const { organization } = useOrganization();
  const orgId = organization?.id as Id<"organizations"> | undefined;

  const createPart = useMutation(api.parts.createPart);

  const [partNumber, setPartNumber] = useState("");
  const [partName, setPartName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [supplier, setSupplier] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) {
      setError("Organization not loaded. Please try again.");
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      setError("Quantity must be a positive number.");
      return;
    }

    if (!partNumber.trim()) {
      setError("Part number is required.");
      return;
    }
    if (!partName.trim()) {
      setError("Part name is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const ids = await createPart({
        organizationId: orgId,
        partNumber: partNumber.trim(),
        partName: partName.trim(),
        description: description.trim() || undefined,
        quantity: qty,
        supplier: supplier.trim() || undefined,
      });
      setCreatedCount(ids.length);
      setSuccess(true);
      // Reset form
      setPartNumber("");
      setPartName("");
      setDescription("");
      setQuantity("1");
      setSupplier("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/parts/requests">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Parts Queue
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-muted-foreground" />
          Receive New Part
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Add a part to the parts queue. Full 8130-3 receiving requires a work
          order.
        </p>
      </div>

      {/* Success Banner */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-400">
              {createdCount} part record{createdCount !== 1 ? "s" : ""} created
            </p>
            <p className="text-[11px] text-green-400/70 mt-0.5">
              Parts are in &ldquo;Pending Inspection&rdquo; status and will
              appear in the Parts Queue.
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="ml-auto text-green-400 h-7 text-xs"
          >
            <Link href="/parts/requests">View Queue</Link>
          </Button>
        </div>
      )}

      {/* Form */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Part Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="partNumber" className="text-xs font-medium">
                  Part Number <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="partNumber"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g. 206-015-191-013"
                  className="font-mono text-sm h-9"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="partName" className="text-xs font-medium">
                  Part Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="partName"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="e.g. Main Rotor Blade Assembly"
                  className="text-sm h-9"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-medium">
                  Description
                </Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional additional details"
                  className="text-sm h-9"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Separator className="opacity-40" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quantity" className="text-xs font-medium">
                  Quantity <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="text-sm h-9"
                  disabled={isSubmitting}
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Creates one record per unit
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="supplier" className="text-xs font-medium">
                  Supplier
                </Label>
                <Input
                  id="supplier"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Aviall, Kellstrom"
                  className="text-sm h-9"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !orgId}
              >
                {isSubmitting ? "Creating..." : "Create Part Record"}
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/parts/requests">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Panel */}
      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-4">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Note:</span> This
            form creates a part record in &ldquo;Pending Inspection&rdquo;
            status. For full traceability (8130-3 tag, serial numbers,
            life-limited tracking), use the full receiving flow from within a
            Work Order.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
