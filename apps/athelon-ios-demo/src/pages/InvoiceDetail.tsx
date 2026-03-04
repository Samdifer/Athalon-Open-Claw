import { useParams } from "react-router-dom";
import { IOSNavBar } from "@/components/ios/IOSNavBar";
import { IOSGroupedList } from "@/components/ios/IOSGroupedList";
import { IOSListRow } from "@/components/ios/IOSListRow";
import { IOSStatusBadge } from "@/components/ios/IOSStatusBadge";
import { IOSActionButton } from "@/components/ios/IOSActionButton";
import { Send, CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Demo data (same invoice set as Billing.tsx for consistency)
// ---------------------------------------------------------------------------

interface InvoiceData {
  id: string;
  number: string;
  customer: string;
  amount: number;
  status: "paid" | "sent" | "overdue" | "draft";
  date: string;
  dueDate: string;
}

const invoiceLookup: Record<string, InvoiceData> = {
  "1": { id: "1", number: "INV-2026-001", customer: "Cessna Flight School", amount: 12500, status: "paid", date: "Feb 28, 2026", dueDate: "Mar 30, 2026" },
  "2": { id: "2", number: "INV-2026-002", customer: "Pacific Air Charter", amount: 8750, status: "paid", date: "Feb 25, 2026", dueDate: "Mar 27, 2026" },
  "3": { id: "3", number: "INV-2026-003", customer: "SkyWest Aviation", amount: 4200, status: "sent", date: "Mar 1, 2026", dueDate: "Mar 31, 2026" },
  "4": { id: "4", number: "INV-2026-004", customer: "Mountain Air LLC", amount: 2450, status: "overdue", date: "Feb 15, 2026", dueDate: "Mar 17, 2026" },
  "5": { id: "5", number: "INV-2026-005", customer: "Coast Guard Aux", amount: 15300, status: "paid", date: "Feb 20, 2026", dueDate: "Mar 22, 2026" },
  "6": { id: "6", number: "INV-2026-006", customer: "Mesa Airlines", amount: 6800, status: "draft", date: "Mar 3, 2026", dueDate: "Apr 2, 2026" },
  "7": { id: "7", number: "INV-2026-007", customer: "Regional Express", amount: 1800, status: "overdue", date: "Feb 10, 2026", dueDate: "Mar 12, 2026" },
  "8": { id: "8", number: "INV-2026-008", customer: "Blue Sky Training", amount: 3200, status: "sent", date: "Mar 2, 2026", dueDate: "Apr 1, 2026" },
};

// Fallback invoice for unknown IDs
const fallbackInvoice: InvoiceData = {
  id: "0",
  number: "INV-2026-001",
  customer: "Cessna Flight School",
  amount: 12500,
  status: "paid",
  date: "Feb 28, 2026",
  dueDate: "Mar 30, 2026",
};

// ---------------------------------------------------------------------------
// Demo line items
// ---------------------------------------------------------------------------

interface LineItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

const lineItems: LineItem[] = [
  { id: "1", description: "A&P Labor - Annual Inspection (32 hrs @ $95/hr)", qty: 32, rate: 95, amount: 3040 },
  { id: "2", description: "IA Inspection & Signoff", qty: 1, rate: 450, amount: 450 },
  { id: "3", description: "Parts - Oil Filter, Spark Plugs, Gaskets", qty: 1, rate: 680, amount: 680 },
  { id: "4", description: "Shop Supplies & Consumables", qty: 1, rate: 125, amount: 125 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return "$" + amount.toLocaleString();
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const invoice = invoiceLookup[id ?? ""] ?? fallbackInvoice;

  // Scale line items to approximately match the invoice total
  const lineItemsTotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const scaleFactor = invoice.amount / lineItemsTotal;
  const scaledItems = lineItems.map((li) => ({
    ...li,
    amount: Math.round(li.amount * scaleFactor),
  }));
  const scaledTotal = scaledItems.reduce((sum, li) => sum + li.amount, 0);

  // Payment calculations
  const isPaid = invoice.status === "paid";
  const amountPaid = isPaid ? invoice.amount : 0;
  const balanceDue = invoice.amount - amountPaid;

  return (
    <div>
      {/* Nav Bar */}
      <IOSNavBar
        title={invoice.number}
        backHref="/billing"
        backLabel="Billing"
        largeTitle={false}
      />

      {/* Hero Card */}
      <div className="px-4 pt-2 pb-1">
        <div className="ios-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[34px] font-bold leading-[41px] tracking-tight text-ios-label">
                {formatCurrency(invoice.amount)}
              </div>
              <div className="text-[17px] text-ios-label-secondary mt-1">
                {invoice.customer}
              </div>
            </div>
            <IOSStatusBadge status={invoice.status} />
          </div>

          {/* Divider */}
          <div className="h-[0.5px] bg-ios-separator my-3" />

          {/* Due date */}
          <div className="flex items-center justify-between">
            <div className="text-[15px] text-ios-label-secondary">Due Date</div>
            <div
              className={`text-[15px] font-medium ${
                invoice.status === "overdue" ? "text-ios-red" : "text-ios-label"
              }`}
            >
              {invoice.dueDate}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <IOSGroupedList
        sections={[
          {
            header: "Line Items",
            items: scaledItems.map((li) => (
              <IOSListRow
                key={li.id}
                title={li.description}
                detail={
                  <span className="text-[15px] font-semibold text-ios-label">
                    {formatCurrency(li.amount)}
                  </span>
                }
                accessory={undefined}
              />
            )),
            footer: `Subtotal: ${formatCurrency(scaledTotal)}`,
          },
        ]}
      />

      {/* Details */}
      <IOSGroupedList
        sections={[
          {
            header: "Details",
            items: [
              <IOSListRow
                key="inv-date"
                title="Invoice Date"
                detail={invoice.date}
                accessory={undefined}
              />,
              <IOSListRow
                key="due-date"
                title="Due Date"
                detail={invoice.dueDate}
                accessory={undefined}
              />,
              <IOSListRow
                key="terms"
                title="Terms"
                detail="Net 30"
                accessory={undefined}
              />,
              <IOSListRow
                key="po-ref"
                title="PO Reference"
                detail={`PO-${invoice.number.replace("INV-", "")}`}
                accessory={undefined}
              />,
            ],
          },
        ]}
      />

      {/* Payment */}
      <IOSGroupedList
        sections={[
          {
            header: "Payment",
            items: [
              <IOSListRow
                key="pay-status"
                title="Payment Status"
                detail={<IOSStatusBadge status={invoice.status} />}
                accessory={undefined}
              />,
              <IOSListRow
                key="amount-paid"
                title="Amount Paid"
                detail={
                  <span className={isPaid ? "text-ios-green font-medium" : ""}>
                    {formatCurrency(amountPaid)}
                  </span>
                }
                accessory={undefined}
              />,
              <IOSListRow
                key="balance"
                title="Balance Due"
                detail={
                  <span
                    className={
                      balanceDue > 0
                        ? "text-ios-red font-semibold"
                        : "text-ios-green font-medium"
                    }
                  >
                    {formatCurrency(balanceDue)}
                  </span>
                }
                accessory={undefined}
              />,
            ],
          },
        ]}
      />

      {/* Action Buttons */}
      <div className="px-4 pt-4 pb-6 space-y-3">
        {invoice.status === "draft" || invoice.status === "overdue" ? (
          <IOSActionButton
            label="Send Invoice"
            variant="primary"
            icon={<Send className="w-[18px] h-[18px]" />}
            fullWidth
          />
        ) : invoice.status === "sent" ? (
          <>
            <IOSActionButton
              label="Mark as Paid"
              variant="primary"
              icon={<CheckCircle2 className="w-[18px] h-[18px]" />}
              fullWidth
            />
            <IOSActionButton
              label="Resend Invoice"
              variant="secondary"
              icon={<Send className="w-[18px] h-[18px]" />}
              fullWidth
            />
          </>
        ) : (
          <IOSActionButton
            label="Send Receipt"
            variant="secondary"
            icon={<Send className="w-[18px] h-[18px]" />}
            fullWidth
          />
        )}
      </div>
    </div>
  );
}
