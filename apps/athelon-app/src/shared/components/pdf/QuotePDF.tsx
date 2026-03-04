import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency, formatDateUTC } from "@/lib/format";

type QuoteLineDecision = "approved" | "declined" | "deferred";

export interface QuotePDFQuote {
  quoteNumber: string;
  createdAt: number;
  expiresAt?: number;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currency?: string;
}

export interface QuotePDFLineItem {
  _id?: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
  departmentSection?: string;
  customerDecision?: QuoteLineDecision;
}

export interface QuotePDFDepartment {
  _id?: string;
  sectionName: string;
}

export interface QuotePDFCustomer {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface QuotePDFProps {
  quote: QuotePDFQuote;
  lineItems: QuotePDFLineItem[];
  departments: QuotePDFDepartment[];
  customer?: QuotePDFCustomer | null;
  orgName: string;
}

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 10, color: "#0f172a" },
  title: { fontSize: 18, fontWeight: 700 },
  muted: { color: "#64748b" },
  row: { display: "flex", flexDirection: "row" },
  between: { justifyContent: "space-between", alignItems: "flex-start" },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 10,
    marginTop: 10,
  },
  label: { fontSize: 8, color: "#64748b", textTransform: "uppercase" },
  value: { fontSize: 10, marginTop: 2 },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: 700,
    color: "#0f172a",
  },
  tableHeader: {
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 6,
  },
  tableRow: {
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
    paddingVertical: 6,
  },
  cDesc: { width: "40%" },
  cQty: { width: "10%", textAlign: "right" },
  cUnit: { width: "16%", textAlign: "right" },
  cAmt: { width: "16%", textAlign: "right" },
  cDecision: { width: "18%", textAlign: "right" },
  subtotal: { marginTop: 6, textAlign: "right", fontSize: 9, fontWeight: 700 },
  totalsWrap: {
    marginTop: 16,
    marginLeft: "auto",
    width: 220,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 10,
  },
  totalsLine: { display: "flex", flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  grand: { borderTopWidth: 1, borderColor: "#e2e8f0", marginTop: 4, paddingTop: 6, fontWeight: 700, fontSize: 12 },
  terms: { marginTop: 20, borderTopWidth: 1, borderColor: "#e2e8f0", paddingTop: 10 },
  signature: { marginTop: 28 },
  sigLine: { marginTop: 26, borderTopWidth: 1, borderColor: "#334155", width: 230 },
});

function decisionLabel(decision?: QuoteLineDecision): string {
  if (!decision) return "Pending";
  if (decision === "approved") return "Accepted";
  if (decision === "declined") return "Declined";
  return "Deferred";
}

export function QuotePDF({ quote, lineItems, departments, customer, orgName }: QuotePDFProps) {
  const currency = quote.currency ?? "USD";

  const groupedSections = (departments.length > 0
    ? departments.map((dept) => ({
        name: dept.sectionName,
        items: lineItems.filter((item) => item.departmentSection === dept.sectionName),
      }))
    : [])
    .filter((s) => s.items.length > 0);

  const unsectionedItems =
    groupedSections.length > 0
      ? lineItems.filter(
          (item) => !item.departmentSection || !departments.some((d) => d.sectionName === item.departmentSection),
        )
      : lineItems;

  if (unsectionedItems.length > 0) {
    groupedSections.push({
      name: groupedSections.length > 0 ? "Additional Items" : "Line Items",
      items: unsectionedItems,
    });
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={[styles.row, styles.between]}>
          <View>
            <Text style={styles.title}>{orgName}</Text>
            <Text style={styles.muted}>Customer Quote</Text>
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: 700 }}>QUOTE</Text>
            <Text style={styles.value}>#{quote.quoteNumber}</Text>
          </View>
        </View>

        <View style={[styles.row, { marginTop: 12 }]}> 
          <View style={[styles.card, { width: "56%", marginRight: 8 }]}> 
            <Text style={styles.label}>Customer</Text>
            <Text style={[styles.value, { fontWeight: 700 }]}>{customer?.companyName || customer?.name || "—"}</Text>
            {customer?.name && customer.companyName ? <Text style={styles.value}>Attn: {customer.name}</Text> : null}
            {customer?.email ? <Text style={styles.value}>{customer.email}</Text> : null}
            {customer?.phone ? <Text style={styles.value}>{customer.phone}</Text> : null}
            {customer?.address ? <Text style={styles.value}>{customer.address}</Text> : null}
          </View>
          <View style={[styles.card, { width: "44%" }]}> 
            <Text style={styles.label}>Quote Details</Text>
            <Text style={styles.value}>Date: {formatDateUTC(quote.createdAt)}</Text>
            <Text style={styles.value}>Valid Until: {quote.expiresAt ? formatDateUTC(quote.expiresAt) : "—"}</Text>
            <Text style={styles.value}>Status: {quote.status}</Text>
          </View>
        </View>

        {groupedSections.map((section) => {
          const sectionSubtotal = section.items.reduce((sum, item) => sum + item.total, 0);
          return (
            <View key={section.name}>
              <Text style={styles.sectionTitle}>{section.name}</Text>

              <View style={[styles.row, styles.tableHeader]}>
                <Text style={styles.cDesc}>Description</Text>
                <Text style={styles.cQty}>Qty</Text>
                <Text style={styles.cUnit}>Unit Price</Text>
                <Text style={styles.cAmt}>Amount</Text>
                <Text style={styles.cDecision}>Decision</Text>
              </View>

              {section.items.map((item, idx) => (
                <View key={`${section.name}-${item._id ?? idx}`} style={[styles.row, styles.tableRow]}>
                  <Text style={styles.cDesc}>{item.description}</Text>
                  <Text style={styles.cQty}>{item.qty}</Text>
                  <Text style={styles.cUnit}>{formatCurrency(item.unitPrice, currency)}</Text>
                  <Text style={styles.cAmt}>{formatCurrency(item.total, currency)}</Text>
                  <Text style={styles.cDecision}>{decisionLabel(item.customerDecision)}</Text>
                </View>
              ))}

              <Text style={styles.subtotal}>Section Subtotal: {formatCurrency(sectionSubtotal, currency)}</Text>
            </View>
          );
        })}

        <View style={styles.totalsWrap}>
          <View style={styles.totalsLine}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{formatCurrency(quote.subtotal, currency)}</Text>
          </View>
          <View style={styles.totalsLine}>
            <Text style={styles.muted}>Tax</Text>
            <Text>{formatCurrency(quote.tax, currency)}</Text>
          </View>
          <View style={[styles.totalsLine, styles.grand]}>
            <Text>Grand Total</Text>
            <Text>{formatCurrency(quote.total, currency)}</Text>
          </View>
        </View>

        <View style={styles.terms}>
          <Text style={{ fontWeight: 700, marginBottom: 4 }}>Terms & Conditions</Text>
          <Text style={{ fontSize: 9, color: "#334155", lineHeight: 1.4 }}>
            Pricing is based on the scope described above and valid through the quoted expiration date. Any
            additional findings or requested changes may require a revised quote. Work proceeds upon customer
            authorization and is subject to parts/material availability.
          </Text>
        </View>

        <View style={styles.signature}>
          <Text style={{ fontSize: 9, color: "#334155" }}>Customer Authorization Signature</Text>
          <View style={styles.sigLine} />
          <View style={[styles.row, { marginTop: 4 }]}> 
            <Text style={{ width: "50%", fontSize: 8, color: "#64748b" }}>Name / Signature</Text>
            <Text style={{ width: "50%", fontSize: 8, color: "#64748b", textAlign: "right" }}>Date</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
