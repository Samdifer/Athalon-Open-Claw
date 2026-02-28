"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  Receipt,
  Ban,
  Printer,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  partId?: Id<"parts">;
  description: string;
  partNumber?: string;
  quantity: number;
  unitPrice: number;
}

export default function OTCSalesPage() {
  const { orgId } = useCurrentOrg();
  const sales = useQuery(api.otcSales.listOTCSales, orgId ? { organizationId: orgId } : "skip");
  const parts = useQuery(api.parts.listParts, orgId ? { organizationId: orgId } : "skip");
  const taxRates = useQuery(api.billingV4.listTaxRates, orgId ? { orgId } : "skip");
  const createSale = useMutation(api.otcSales.createOTCSale);
  const voidSale = useMutation(api.otcSales.voidOTCSale);

  const [tab, setTab] = useState("pos");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "account" | "check">("cash");
  const [selectedTaxRateId, setSelectedTaxRateId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [partSearch, setPartSearch] = useState("");
  const [processing, setProcessing] = useState(false);
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<Id<"otcSales"> | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [voidDialog, setVoidDialog] = useState<Id<"otcSales"> | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);

  // Manual item entry
  const [manualDesc, setManualDesc] = useState("");
  const [manualPN, setManualPN] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualPrice, setManualPrice] = useState("");

  const filteredParts = useMemo(() => {
    if (!parts || !partSearch) return [];
    const q = partSearch.toLowerCase();
    return parts
      .filter(
        (p) =>
          p.location === "inventory" &&
          (p.partName.toLowerCase().includes(q) ||
            p.partNumber.toLowerCase().includes(q) ||
            (p.description ?? "").toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [parts, partSearch]);

  const selectedTaxRate = useMemo(() => {
    if (!taxRates || !selectedTaxRateId) return 0;
    const rate = taxRates.find((r) => r._id === selectedTaxRateId);
    return rate?.rate ?? 0;
  }, [taxRates, selectedTaxRateId]);

  const subtotal = cart.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
  const taxAmount = Math.round(subtotal * (selectedTaxRate / 100) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const addPartToCart = (part: NonNullable<typeof parts>[number]) => {
    setCart((prev) => [
      ...prev,
      {
        partId: part._id,
        description: part.partName,
        partNumber: part.partNumber,
        quantity: 1,
        unitPrice: 0,
      },
    ]);
    setPartSearch("");
  };

  const addManualItem = () => {
    if (!manualDesc || !manualPrice) return;
    setCart((prev) => [
      ...prev,
      {
        description: manualDesc,
        partNumber: manualPN || undefined,
        quantity: parseInt(manualQty) || 1,
        unitPrice: parseFloat(manualPrice) || 0,
      },
    ]);
    setManualDesc("");
    setManualPN("");
    setManualQty("1");
    setManualPrice("");
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCartItem = (index: number, field: keyof CartItem, value: string | number) => {
    setCart((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleCompleteSale = async () => {
    if (!orgId || cart.length === 0) return;
    setProcessing(true);
    try {
      const saleId = await createSale({
        organizationId: orgId,
        customerName: customerName || undefined,
        customerEmail: customerEmail || undefined,
        items: cart.map((item) => ({
          partId: item.partId,
          description: item.description,
          partNumber: item.partNumber,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        taxRateId: selectedTaxRateId ? (selectedTaxRateId as Id<"taxRates">) : undefined,
        paymentMethod,
        notes: notes || undefined,
      });
      setLastSaleId(saleId);
      setReceiptDialog(true);
      // Reset
      setCart([]);
      setCustomerName("");
      setCustomerEmail("");
      setNotes("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete sale — please try again");
    } finally {
      setProcessing(false);
    }
  };

  const handleVoid = async () => {
    if (!voidDialog || !voidReason) return;
    setIsVoiding(true);
    try {
      await voidSale({ id: voidDialog, reason: voidReason });
      toast.success("Sale voided successfully");
      setVoidDialog(null);
      setVoidReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void sale — please try again");
    } finally {
      setIsVoiding(false);
    }
  };

  const lastSale = useQuery(
    api.otcSales.getOTCSale,
    lastSaleId ? { id: lastSaleId } : "skip",
  );

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    if (!historySearch) return sales;
    const q = historySearch.toLowerCase();
    return sales.filter(
      (s) =>
        s.receiptNumber.toLowerCase().includes(q) ||
        (s.customerName ?? "").toLowerCase().includes(q),
    );
  }, [sales, historySearch]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Counter Sales</h1>
          <p className="text-muted-foreground">Over-the-counter point of sale</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pos">
            <ShoppingCart className="h-4 w-4 mr-2" />
            New Sale
          </TabsTrigger>
          <TabsTrigger value="history">
            <Receipt className="h-4 w-4 mr-2" />
            Sales History
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — Product search & cart */}
          <div className="lg:col-span-2 space-y-4">
            {/* Part search */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search parts inventory..."
                    value={partSearch}
                    onChange={(e) => setPartSearch(e.target.value)}
                  />
                </div>
                {filteredParts.length > 0 && (
                  <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                    {filteredParts.map((part) => (
                      <button
                        key={part._id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between"
                        onClick={() => addPartToCart(part)}
                      >
                        <span>
                          {part.partName}{" "}
                          <span className="text-muted-foreground">({part.partNumber})</span>
                        </span>
                        <Badge variant="outline" className="ml-2">{part.condition}</Badge>
                      </button>
                    ))}
                  </div>
                )}

                {/* Manual item entry */}
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-2">Or add manually:</p>
                  <div className="grid grid-cols-5 gap-2">
                    <Input placeholder="Description" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} className="col-span-2" />
                    <Input placeholder="P/N" value={manualPN} onChange={(e) => setManualPN(e.target.value)} />
                    <Input type="number" placeholder="Qty" min="1" value={manualQty} onChange={(e) => setManualQty(e.target.value)} />
                    <div className="flex gap-1">
                      <Input type="number" placeholder="Price" step="0.01" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} />
                      <Button size="icon" variant="outline" onClick={addManualItem} disabled={!manualDesc || !manualPrice}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cart */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Cart ({cart.length} item{cart.length !== 1 ? "s" : ""})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No items added yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-20">Qty</TableHead>
                        <TableHead className="w-28">Price</TableHead>
                        <TableHead className="w-24 text-right">Total</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.description}</p>
                              {item.partNumber && (
                                <p className="text-xs text-muted-foreground">{item.partNumber}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateCartItem(i, "quantity", parseInt(e.target.value) || 1)}
                              className="w-16 h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateCartItem(i, "unitPrice", parseFloat(e.target.value) || 0)}
                              className="w-24 h-8"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" onClick={() => removeFromCart(i)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right — Customer & payment */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Customer (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in customer" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="For receipt" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="account">On Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {taxRates && taxRates.length > 0 && (
                  <div>
                    <Label>Tax Rate</Label>
                    <Select value={selectedTaxRateId} onValueChange={setSelectedTaxRateId}>
                      <SelectTrigger><SelectValue placeholder="No tax" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No tax</SelectItem>
                        {taxRates.filter((r) => r.active).map((r) => (
                          <SelectItem key={r._id} value={r._id}>
                            {r.name} ({r.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {selectedTaxRate > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Tax ({selectedTaxRate}%)</span>
                      <span>${taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-1 border-t">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCompleteSale}
                  disabled={processing || cart.length === 0}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {processing ? "Processing..." : "Complete Sale"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "history" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <CardTitle className="text-base">Sales History</CardTitle>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by receipt # or customer..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!sales ? (
              <Skeleton className="h-32 w-full" />
            ) : filteredSales.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No sales found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell className="font-mono">{sale.receiptNumber}</TableCell>
                      <TableCell>{sale.customerName || "Walk-in"}</TableCell>
                      <TableCell className="capitalize">{sale.paymentMethod}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${sale.total.toFixed(2)}
                      </TableCell>
                      <TableCell>{new Date(sale.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={sale.status === "completed" ? "default" : "destructive"}>
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sale.status === "completed" && (
                          <Button size="icon" variant="ghost" onClick={() => setVoidDialog(sale._id)}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog} onOpenChange={setReceiptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sale Complete</DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-4">
              <div className="text-center border-b pb-4">
                <p className="text-2xl font-bold font-mono">{lastSale.receiptNumber}</p>
                <p className="text-muted-foreground">{new Date(lastSale.createdAt).toLocaleString()}</p>
              </div>
              {lastSale.customerName && (
                <p className="text-sm">Customer: {lastSale.customerName}</p>
              )}
              <div className="space-y-1">
                {lastSale.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.description}</span>
                    <span>${item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${lastSale.subtotal.toFixed(2)}</span>
                </div>
                {lastSale.taxAmount > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax</span>
                    <span>${lastSale.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${lastSale.total.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  Paid via {lastSale.paymentMethod}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => setReceiptDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Dialog */}
      <Dialog open={!!voidDialog} onOpenChange={(open) => !open && setVoidDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Sale</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Reason for voiding *</Label>
            <Textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setVoidDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleVoid} disabled={!voidReason || isVoiding}>
              {isVoiding ? "Voiding..." : "Void Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
