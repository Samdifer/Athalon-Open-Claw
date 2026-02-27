/**
 * lib/pdf/QuotePDF.tsx — Quote / Estimate PDF template.
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
  SignatureBlock,
  formatCurrency,
  formatPdfDate,
} from "./shared";

export interface QuoteLineItemPDF {
  description: string;
  type: string;
  qty: number;
  unitPrice: number;
  discountPercent?: number;
  total: number;
}

export interface QuoteDepartmentPDF {
  name: string;
  lineItems: QuoteLineItemPDF[];
  subtotal: number;
}

export interface QuotePDFProps {
  orgName?: string;
  orgAddress?: string;
  quoteNumber: string;
  createdAt: number;
  expiresAt?: number;
  status: string;
  validityDays?: number;
  customerName?: string;
  customerAddress?: string;
  customerContact?: string;
  departments?: QuoteDepartmentPDF[];
  lineItems: QuoteLineItemPDF[];
  subtotal: number;
  tax: number;
  total: number;
  termsAndConditions?: string;
  notes?: string;
}

export function QuotePDF(props: QuotePDFProps) {
  const {
    orgName,
    orgAddress,
    quoteNumber,
    createdAt,
    expiresAt,
    status,
    validityDays,
    customerName,
    customerAddress,
    customerContact,
    departments,
    lineItems,
    subtotal,
    tax,
    total,
    termsAndConditions,
    notes,
  } = props;

  const cols = [
    { label: "Description", width: "40%" },
    { label: "Type", width: "12%" },
    { label: "Qty", width: "10%", align: "right" },
    { label: "Unit Price", width: "18%", align: "right" },
    { label: "Total", width: "20%", align: "right" },
  ];

  const renderLineItems = (items: QuoteLineItemPDF[]) =>
    items.map((item, i) => (
      <TableRow
        key={i}
        index={i}
        cells={[
          { value: item.description, width: "40%" },
          { value: item.type, width: "12%" },
          { value: String(item.qty), width: "10%", align: "right" },
          { value: formatCurrency(item.unitPrice), width: "18%", align: "right" },
          { value: formatCurrency(item.total), width: "20%", align: "right", bold: true },
        ]}
      />
    ));

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PDFHeader title="QUOTE" orgName={orgName} orgAddress={orgAddress} />

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
          <InfoGrid
            items={[
              { label: "Quote #", value: quoteNumber },
              { label: "Date", value: formatPdfDate(createdAt) },
              ...(expiresAt ? [{ label: "Expires", value: formatPdfDate(expiresAt) }] : []),
              { label: "Status", value: status },
            ]}
          />
          <View style={{ maxWidth: 200 }}>
            <Text style={baseStyles.label}>Prepared For</Text>
            {customerName && (
              <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
                {customerName}
              </Text>
            )}
            {customerAddress && <Text style={baseStyles.value}>{customerAddress}</Text>}
            {customerContact && <Text style={{ ...baseStyles.value, marginTop: 2 }}>{customerContact}</Text>}
          </View>
        </View>

        {/* Departments or flat line items */}
        {departments && departments.length > 0 ? (
          departments.map((dept, di) => (
            <View key={di}>
              <Text style={baseStyles.sectionTitle}>{dept.name}</Text>
              <TableHeader columns={cols} />
              {renderLineItems(dept.lineItems)}
              <View style={{ alignItems: "flex-end", marginTop: 4, marginBottom: 8 }}>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold" }}>
                  Section Subtotal: {formatCurrency(dept.subtotal)}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View>
            <Text style={baseStyles.sectionTitle}>Line Items</Text>
            <TableHeader columns={cols} />
            {renderLineItems(lineItems)}
          </View>
        )}

        {/* Totals */}
        <View style={{ alignItems: "flex-end", marginTop: 12 }}>
          <View style={{ width: 200 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
              <Text style={{ fontSize: 9, color: COLORS.textMuted }}>Subtotal</Text>
              <Text style={{ fontSize: 9 }}>{formatCurrency(subtotal)}</Text>
            </View>
            {tax > 0 && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontSize: 9, color: COLORS.textMuted }}>Estimated Tax</Text>
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
              }}
            >
              <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold" }}>Total</Text>
              <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold" }}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {/* Validity */}
        {validityDays && (
          <View style={{ marginTop: 16, padding: 8, backgroundColor: COLORS.rowAlt, borderRadius: 3 }}>
            <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: COLORS.accent }}>
              This quote is valid for {validityDays} days from the date of issue.
            </Text>
          </View>
        )}

        {/* Terms */}
        {termsAndConditions && (
          <View style={{ marginTop: 14 }}>
            <Text style={baseStyles.sectionTitle}>Terms &amp; Conditions</Text>
            <Text style={{ fontSize: 8, color: COLORS.textMuted, lineHeight: 1.5 }}>
              {termsAndConditions}
            </Text>
          </View>
        )}

        {notes && (
          <View style={{ marginTop: 10 }}>
            <Text style={baseStyles.label}>Notes</Text>
            <Text style={baseStyles.value}>{notes}</Text>
          </View>
        )}

        {/* Customer Acceptance */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 30 }}>
          <SignatureBlock label="Customer Signature (Acceptance)" />
          <SignatureBlock label="Authorized Representative" />
        </View>

        <PDFFooter text="Thank you for considering our services" />
      </Page>
    </Document>
  );
}
