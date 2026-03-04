"use client";

import { Link } from "react-router-dom";
import { Package, ShoppingCart, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReceivingInspection } from "../_components/ReceivingInspection";

export default function PartsReceivingPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-muted-foreground" />
          Parts Receiving Inspection
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Complete checklist-driven receiving inspections before parts enter inventory.
        </p>
      </div>

      {/* PO Receiving Banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Receive Against Purchase Order</p>
              <p className="text-xs text-muted-foreground">
                Receive parts from a submitted PO and create inventory records automatically.
              </p>
            </div>
          </div>
          <Button size="sm" asChild>
            <Link to="/parts/receiving/po">
              Receive Against PO
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <ReceivingInspection />
    </div>
  );
}
