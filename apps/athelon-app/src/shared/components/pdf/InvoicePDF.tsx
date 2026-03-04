import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrency, formatDateUTC } from "@/lib/format";

interface InvoiceLike {
  invoiceNumber: string;
  createdAt: number;
  dueDate?: number;
  paymentTerms?: string;
  subtotal: number;
  tax: number;
  total: number;
}

interface InvoiceLineItemLike {
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface CustomerLike {
  name: string;
  address?: string;
  email?: string;
  phone?: string;
  companyName?: string;
}

interface InvoicePDFProps {
  invoice: InvoiceLike;
  lineItems: InvoiceLineItemLike[];
  customer?: CustomerLike | null;
  orgName: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 12,
  },
  orgName: {
    fontSize: 18,
    fontWeight: 700,
  },
  logoPlaceholder: {
    marginTop: 6,
    fontSize: 9,
    color: "#6b7280",
  },
  invoiceTitle: {
    fontSize: 22,
    fontWeight: 700,
    textAlign: "right",
  },
  muted: {
    color: "#6b7280",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
    textTransform: "uppercase",
    color: "#374151",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colDesc: { width: "46%" },
  colQty: { width: "14%", textAlign: "right" },
  colUnit: { width: "20%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right" },
  totalsWrap: {
    marginTop: 12,
    marginLeft: "auto",
    width: 220,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalFinal: {
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    paddingTop: 6,
    marginTop: 2,
    fontWeight: 700,
    fontSize: 12,
  },
  footer: {
    position: "absolute",
    left: 32,
    right: 32,
    bottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
    fontSize: 9,
    color: "#6b7280",
    textAlign: "center",
  },
});

export function InvoicePDF({ invoice, lineItems, customer, orgName }: InvoicePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.row, styles.header]}>
          <View>
            <Text style={styles.orgName}>{orgName}</Text>
            <Text style={styles.logoPlaceholder}>[Company Logo]</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text>Invoice #: {invoice.invoiceNumber}</Text>
            <Text style={styles.muted}>Date: {formatDateUTC(invoice.createdAt)}</Text>
            <Text style={styles.muted}>
              Due: {invoice.dueDate ? formatDateUTC(invoice.dueDate) : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text>{customer?.companyName || customer?.name || "Customer"}</Text>
          {customer?.address ? <Text style={styles.muted}>{customer.address}</Text> : null}
          {customer?.email ? <Text style={styles.muted}>{customer.email}</Text> : null}
          {customer?.phone ? <Text style={styles.muted}>{customer.phone}</Text> : null}
        </View>

        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesc}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colUnit}>Unit Price</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>

          {lineItems.map((item, idx) => (
            <View key={`${item.description}-${idx}`} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.qty}</Text>
              <Text style={styles.colUnit}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsWrap}>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Tax</Text>
            <Text>{formatCurrency(invoice.tax)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text>Total</Text>
            <Text>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Terms / Notes</Text>
          <Text style={styles.muted}>{invoice.paymentTerms || "Payment due upon receipt unless otherwise agreed."}</Text>
        </View>

        <Text style={styles.footer}>Thank you for your business</Text>
      </Page>
    </Document>
  );
}
