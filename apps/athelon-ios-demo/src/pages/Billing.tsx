import { useState } from "react";
import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSSegmentedControl } from "@/components/ios/IOSSegmentedControl";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import { IOSStatusBadge } from "@/components/ios/IOSStatusBadge";
import { ArrowUpRight, Circle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "invoices" | "quotes" | "customers" | "pos";

const tabSegments: Array<{ label: string; value: Tab }> = [
  { label: "Invoices", value: "invoices" },
  { label: "Quotes", value: "quotes" },
  { label: "Customers", value: "customers" },
  { label: "POs", value: "pos" },
];

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

interface Invoice {
  id: string;
  number: string;
  customer: string;
  amount: number;
  status: "paid" | "sent" | "overdue" | "draft";
  date: string;
}

const invoices: Invoice[] = [
  { id: "1", number: "INV-2026-001", customer: "Cessna Flight School", amount: 12500, status: "paid", date: "Feb 28" },
  { id: "2", number: "INV-2026-002", customer: "Pacific Air Charter", amount: 8750, status: "paid", date: "Feb 25" },
  { id: "3", number: "INV-2026-003", customer: "SkyWest Aviation", amount: 4200, status: "sent", date: "Mar 1" },
  { id: "4", number: "INV-2026-004", customer: "Mountain Air LLC", amount: 2450, status: "overdue", date: "Feb 15" },
  { id: "5", number: "INV-2026-005", customer: "Coast Guard Aux", amount: 15300, status: "paid", date: "Feb 20" },
  { id: "6", number: "INV-2026-006", customer: "Mesa Airlines", amount: 6800, status: "draft", date: "Mar 3" },
  { id: "7", number: "INV-2026-007", customer: "Regional Express", amount: 1800, status: "overdue", date: "Feb 10" },
  { id: "8", number: "INV-2026-008", customer: "Blue Sky Training", amount: 3200, status: "sent", date: "Mar 2" },
];

interface Quote {
  id: string;
  customer: string;
  description: string;
  amount: number;
  status: "pending" | "accepted" | "expired";
}

const quotes: Quote[] = [
  { id: "1", customer: "Cessna Flight School", description: "Annual inspection quote", amount: 14200, status: "accepted" },
  { id: "2", customer: "Pacific Air Charter", description: "Engine overhaul estimate", amount: 45000, status: "pending" },
  { id: "3", customer: "Mountain Air LLC", description: "Avionics upgrade proposal", amount: 22800, status: "pending" },
  { id: "4", customer: "Blue Sky Training", description: "Fleet maintenance contract", amount: 38500, status: "accepted" },
  { id: "5", customer: "Regional Express", description: "Landing gear inspection", amount: 5600, status: "expired" },
];

interface Customer {
  id: string;
  name: string;
  type: string;
  revenue: number;
}

const customers: Customer[] = [
  { id: "1", name: "Cessna Flight School", type: "Flight School", revenue: 87500 },
  { id: "2", name: "Pacific Air Charter", type: "Charter Operator", revenue: 64200 },
  { id: "3", name: "SkyWest Aviation", type: "Regional Airline", revenue: 52100 },
  { id: "4", name: "Coast Guard Aux", type: "Government", revenue: 43800 },
  { id: "5", name: "Mesa Airlines", type: "Regional Airline", revenue: 38400 },
  { id: "6", name: "Mountain Air LLC", type: "Private Owner", revenue: 21300 },
];

interface PurchaseOrder {
  id: string;
  vendor: string;
  poNumber: string;
  amount: number;
  status: "open" | "received" | "partial" | "closed";
}

const purchaseOrders: PurchaseOrder[] = [
  { id: "1", vendor: "Aircraft Spruce", poNumber: "PO-2026-041", amount: 3450, status: "open" },
  { id: "2", vendor: "Lycoming Parts Depot", poNumber: "PO-2026-039", amount: 12800, status: "partial" },
  { id: "3", vendor: "Garmin Avionics", poNumber: "PO-2026-037", amount: 8200, status: "received" },
  { id: "4", vendor: "McCauley Propellers", poNumber: "PO-2026-035", amount: 5600, status: "closed" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString();
}

function invoiceIconColor(status: Invoice["status"]): string {
  switch (status) {
    case "paid":
      return "text-ios-green";
    case "sent":
      return "text-ios-blue";
    case "overdue":
      return "text-ios-red";
    case "draft":
      return "text-ios-gray";
  }
}

function invoiceIconBg(status: Invoice["status"]): string {
  switch (status) {
    case "paid":
      return "bg-green-100";
    case "sent":
      return "bg-blue-100";
    case "overdue":
      return "bg-red-100";
    case "draft":
      return "bg-ios-gray5";
  }
}

// ---------------------------------------------------------------------------
// Bar chart data (Mon-Sun weekly revenue)
// ---------------------------------------------------------------------------

const barData = [
  { day: "Mon", height: "h-8", value: 4200 },
  { day: "Tue", height: "h-12", value: 6800 },
  { day: "Wed", height: "h-16", value: 9100 },
  { day: "Thu", height: "h-10", value: 5900 },
  { day: "Fri", height: "h-20", value: 11200 },
  { day: "Sat", height: "h-6", value: 3400 },
  { day: "Sun", height: "h-14", value: 7250 },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Billing() {
  const [tab, setTab] = useState<Tab>("invoices");

  return (
    <div>
      {/* Nav Bar */}
      <IOSNavBar title="Billing" largeTitle>
        <IOSSegmentedControl
          segments={tabSegments}
          selected={tab}
          onChange={(val) => setTab(val as Tab)}
        />
      </IOSNavBar>

      {/* Revenue Summary Card */}
      <div className="px-4 pt-3 pb-2">
        <div className="ios-card">
          <div className="text-[13px] text-ios-label-secondary font-medium">
            Monthly Revenue
          </div>
          <div className="text-[34px] font-bold leading-[41px] tracking-tight text-ios-label mt-0.5">
            $47,850
          </div>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-[14px] h-[14px] text-ios-green" strokeWidth={2.5} />
            <span className="text-[15px] font-medium text-ios-green">
              +12.3% vs last month
            </span>
          </div>

          {/* Mini bar chart */}
          <div className="flex items-end justify-between gap-2 mt-4 h-[80px]">
            {barData.map((bar) => (
              <div key={bar.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-[4px] bg-ios-blue/80 ${bar.height}`}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            {barData.map((bar) => (
              <div
                key={bar.day}
                className="flex-1 text-center text-[10px] text-ios-label-tertiary font-medium"
              >
                {bar.day}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Overdue Banner (only on Invoices tab) */}
      {tab === "invoices" && (
        <div className="px-4 pb-2">
          <div className="ios-card bg-red-50/60 border border-red-100">
            <div className="flex items-center gap-2">
              <div className="w-[8px] h-[8px] rounded-full bg-ios-red flex-shrink-0" />
              <div>
                <span className="text-[15px] font-semibold text-ios-red">
                  2 Overdue Invoices
                </span>
                <span className="text-[15px] text-ios-label-secondary">
                  {" "}&mdash; $4,250 outstanding
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="pb-6">
        {tab === "invoices" && <InvoicesTab />}
        {tab === "quotes" && <QuotesTab />}
        {tab === "customers" && <CustomersTab />}
        {tab === "pos" && <PurchaseOrdersTab />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invoices Tab
// ---------------------------------------------------------------------------

function InvoicesTab() {
  return (
    <IOSGroupedList
      sections={[
        {
          header: `${invoices.length} Invoices`,
          items: invoices.map((inv) => (
            <IOSListRow
              key={inv.id}
              title={inv.customer}
              subtitle={inv.number}
              icon={
                <Circle
                  className={`w-[14px] h-[14px] ${invoiceIconColor(inv.status)}`}
                  fill="currentColor"
                  strokeWidth={0}
                />
              }
              iconBg={invoiceIconBg(inv.status)}
              detail={
                <div className="text-right">
                  <div className="text-[15px] font-semibold text-ios-label">
                    {formatCurrency(inv.amount)}
                  </div>
                  <IOSStatusBadge status={inv.status} />
                </div>
              }
              accessory="disclosure"
              href={`/billing/invoices/${inv.id}`}
            >
              <div className="text-[12px] text-ios-label-tertiary mt-0.5">
                {inv.date}
              </div>
            </IOSListRow>
          )),
        },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Quotes Tab
// ---------------------------------------------------------------------------

function quoteStatusMapped(status: Quote["status"]): string {
  switch (status) {
    case "pending":
      return "on_hold";
    case "accepted":
      return "completed";
    case "expired":
      return "overdue";
  }
}

function QuotesTab() {
  return (
    <IOSGroupedList
      sections={[
        {
          header: `${quotes.length} Quotes`,
          items: quotes.map((q) => (
            <IOSListRow
              key={q.id}
              title={q.customer}
              subtitle={q.description}
              detail={
                <div className="text-right">
                  <div className="text-[15px] font-semibold text-ios-label">
                    {formatCurrency(q.amount)}
                  </div>
                  <IOSStatusBadge
                    status={quoteStatusMapped(q.status)}
                    label={q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                  />
                </div>
              }
              accessory="disclosure"
            />
          )),
        },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Customers Tab
// ---------------------------------------------------------------------------

function CustomersTab() {
  return (
    <IOSGroupedList
      sections={[
        {
          header: `${customers.length} Customers`,
          items: customers.map((c) => (
            <IOSListRow
              key={c.id}
              title={c.name}
              subtitle={c.type}
              detail={formatCurrency(c.revenue)}
              accessory="disclosure"
            />
          )),
        },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Purchase Orders Tab
// ---------------------------------------------------------------------------

function poStatusMapped(status: PurchaseOrder["status"]): string {
  switch (status) {
    case "open":
      return "in_progress";
    case "received":
      return "completed";
    case "partial":
      return "on_hold";
    case "closed":
      return "closed";
  }
}

function PurchaseOrdersTab() {
  return (
    <IOSGroupedList
      sections={[
        {
          header: `${purchaseOrders.length} Purchase Orders`,
          items: purchaseOrders.map((po) => (
            <IOSListRow
              key={po.id}
              title={po.vendor}
              subtitle={po.poNumber}
              detail={
                <div className="text-right">
                  <div className="text-[15px] font-semibold text-ios-label">
                    {formatCurrency(po.amount)}
                  </div>
                  <IOSStatusBadge
                    status={poStatusMapped(po.status)}
                    label={po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                  />
                </div>
              }
              accessory="disclosure"
            />
          )),
        },
      ]}
    />
  );
}
