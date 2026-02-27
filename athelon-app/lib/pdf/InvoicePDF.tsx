/**
 * lib/pdf/InvoicePDF.tsx — Invoice PDF template using @react-pdf/renderer.
 */
import { Document, Page, View, Text } from "@react-pdf/renderer";
import {
  baseStyles,
  COLORS,
  PDFHeader,
  PDFFooter,
  InfoGrid,
  TableHeader,
  TableRow,
  formatCurrency,
  formatPdfDate,
} from "./shared";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InvoiceLineItemPDF {
  description: string;
  qty: number;
  unitPrice: number;
  discountPercent?: number;
  discountAmount?: number;
  total: number;
}

export interface InvoicePDFProps {
  orgName?: string;
  orgAddress?: string;
  invoiceNumber: string;
  createdAt: number;
  dueDate?: number;
  sentAt?: number;
  status: string;
  customerName?: string;
  customerAddress?: string;
  customerContact?: string;
  lineItems: InvoiceLineItemPDF[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  paymentTerms?: string;
  notes?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InvoicePDF(props: InvoicePDFProps) {
  const {
    orgName,
    orgAddress,
    invoiceNumber,
    createdAt,
    dueDate,
    status,
    customerName,
    customerAddress,
    customerContact,
    lineItems,
    subtotal,
    tax,
    total,
    amountPaid,
    balance,
    paymentTerms,
    notes,
  } = props;

  const cols = [
    { label: "Description", width: "40%" },
    { label: "Qty", width: "10%", align: "right" },
    { label: "Unit Price", width: "15%", align: "right" },
    { label: "Discount", width: "15%", align: "right" },
    { label: "Total", width: "20%", align: "right" },
  ];

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PDFHeader title="INVOICE" orgName={orgName} orgAddress={orgAddress} />

        {/* Invoice Info + Bill To */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
          <View>
            <InfoGrid
              items={[
                { label: "Invoice #", value: invoiceNumber },
                { label: "Date", value: formatPdfDate(createdAt) },
                ...(dueDate ? [{ label: "Due Date", value: formatPdfDate(dueDate) }] : []),
                { label: "Status", value: status },
              ]}
            />
          </View>
          <View style={{ maxWidth: 200 }}>
            <Text style={baseStyles.label}>Bill To</Text>
            {customerName && (
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
                {customerName}
              </Text>
            )}
            {customerAddress && <Text style={baseStyles.value}>{customerAddress}</Text>}
            {customerContact && (
              <Text style={{ ...baseStyles.value, marginTop: 2 }}>{customerContact}</Text>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <Text style={baseStyles.sectionTitle}>Line Items</Text>
        <TableHeader columns={cols} />
        {lineItems.map((item, i) => {
          const discount = item.discountPercent
            ? `${item.discountPercent}%`
            : item.discountAmount
              ? formatCurrency(item.discountAmount)
              : "—";
          return (
            <TableRow
              key={i}
              index={i}
              cells={[
                { value: item.description, width: "40%" },
                { value: String(item.qty), width: "10%", align: "right" },
                { value: formatCurrency(item.unitPrice), width: "15%", align: "right" },
                { value: discount, width: "15%", align: "right" },
                { value: formatCurrency(item.total), width: "20%", align: "right", bold: true },
              ]}
            />
          );
        })}

        {/* Totals */}
        <View style={{ alignItems: "flex-end", marginTop: 12 }}>
          <View style={{ width: 200 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={{ fontSize: 9, color: COLORS.textMuted }}>Subtotal</Text>
              <Text style={{ fontSize: 9 }}>{formatCurrency(subtotal)}</Text>
            </View>
            {tax > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontSize: 9, color: COLORS.textMuted }}>Tax</Text>
                <Text style={{ fontSize: 9 }}>{formatCurrency(tax)}</Text>
              </View>
            )}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
                paddingTop: 4,
                marginTop: 2,
                marginBottom: 3,
              }}
            >
              <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>Total</Text>
              <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>{formatCurrency(total)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={{ fontSize: 9, color: COLORS.green }}>Paid</Text>
              <Text style={{ fontSize: 9, color: COLORS.green }}>{formatCurrency(amountPaid)}</Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
                paddingTop: 4,
              }}
            >
              <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>Balance Due</Text>
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Helvetica-Bold",
                  color: balance > 0 ? COLORS.amber : COLORS.green,
                }}
              >
                {formatCurrency(balance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Terms / Notes */}
        {(paymentTerms || notes) && (
          <View style={{ marginTop: 20 }}>
            {paymentTerms && (
              <View style={{ marginBottom: 6 }}>
                <Text style={baseStyles.label}>Payment Terms</Text>
                <Text style={baseStyles.value}>{paymentTerms}</Text>
              </View>
            )}
            {notes && (
              <View>
                <Text style={baseStyles.label}>Notes</Text>
                <Text style={baseStyles.value}>{notes}</Text>
              </View>
            )}
          </View>
        )}

        <PDFFooter />
      </Page>
    </Document>
  );
}
