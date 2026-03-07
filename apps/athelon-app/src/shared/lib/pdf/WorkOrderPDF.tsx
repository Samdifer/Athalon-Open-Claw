/**
 * lib/pdf/WorkOrderPDF.tsx — Work Order Summary PDF.
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

export interface WOTaskCardPDF {
  cardNumber: string;
  title: string;
  status: string;
  assignedTo?: string;
}

export interface WODiscrepancyPDF {
  description: string;
  status: string;
  raisedBy?: string;
}

export interface WOPartUsedPDF {
  partNumber: string;
  description: string;
  qty: number;
}

export interface WorkOrderPDFProps {
  orgName?: string;
  orgAddress?: string;
  workOrderNumber: string;
  status: string;
  type?: string;
  createdAt: number;
  promisedDeliveryDate?: number;
  aircraftRegistration?: string;
  aircraftType?: string;
  customerName?: string;
  taskCards: WOTaskCardPDF[];
  discrepancies?: WODiscrepancyPDF[];
  partsUsed?: WOPartUsedPDF[];
  laborHours?: number;
  costSummary?: {
    labor: number;
    parts: number;
    other: number;
    total: number;
  };
}

export function WorkOrderPDF(props: WorkOrderPDFProps) {
  const {
    orgName,
    orgAddress,
    workOrderNumber,
    status,
    type,
    createdAt,
    promisedDeliveryDate,
    aircraftRegistration,
    aircraftType,
    customerName,
    taskCards,
    discrepancies,
    partsUsed,
    laborHours,
    costSummary,
  } = props;

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PDFHeader title="WORK ORDER" orgName={orgName} orgAddress={orgAddress} />

        <InfoGrid
          items={[
            { label: "WO #", value: workOrderNumber },
            { label: "Status", value: status },
            ...(type ? [{ label: "Type", value: type }] : []),
            { label: "Created", value: formatPdfDate(createdAt) },
            ...(promisedDeliveryDate
              ? [{ label: "Promised Delivery", value: formatPdfDate(promisedDeliveryDate) }]
              : []),
            ...(aircraftRegistration ? [{ label: "Aircraft", value: aircraftRegistration }] : []),
            ...(aircraftType ? [{ label: "Aircraft Type", value: aircraftType }] : []),
            ...(customerName ? [{ label: "Customer", value: customerName }] : []),
          ]}
        />

        {/* Task Cards */}
        <Text style={baseStyles.sectionTitle}>Work Cards ({taskCards.length})</Text>
        <TableHeader
          columns={[
            { label: "Card #", width: "15%" },
            { label: "Title", width: "40%" },
            { label: "Status", width: "20%" },
            { label: "Assigned To", width: "25%" },
          ]}
        />
        {taskCards.map((card, i) => (
          <TableRow
            key={i}
            index={i}
            cells={[
              { value: card.cardNumber, width: "15%" },
              { value: card.title, width: "40%" },
              { value: card.status, width: "20%" },
              { value: card.assignedTo ?? "—", width: "25%" },
            ]}
          />
        ))}
        {taskCards.length === 0 && (
          <Text style={{ fontSize: 9, color: COLORS.textMuted, padding: 8 }}>No work cards.</Text>
        )}

        {/* Discrepancies */}
        {discrepancies && discrepancies.length > 0 && (
          <View>
            <Text style={baseStyles.sectionTitle}>Findings ({discrepancies.length})</Text>
            <TableHeader
              columns={[
                { label: "Description", width: "55%" },
                { label: "Status", width: "20%" },
                { label: "Raised By", width: "25%" },
              ]}
            />
            {discrepancies.map((d, i) => (
              <TableRow
                key={i}
                index={i}
                cells={[
                  { value: d.description, width: "55%" },
                  { value: d.status, width: "20%" },
                  { value: d.raisedBy ?? "—", width: "25%" },
                ]}
              />
            ))}
          </View>
        )}

        {/* Parts Used */}
        {partsUsed && partsUsed.length > 0 && (
          <View>
            <Text style={baseStyles.sectionTitle}>Parts Used ({partsUsed.length})</Text>
            <TableHeader
              columns={[
                { label: "Part #", width: "25%" },
                { label: "Description", width: "55%" },
                { label: "Qty", width: "20%", align: "right" },
              ]}
            />
            {partsUsed.map((p, i) => (
              <TableRow
                key={i}
                index={i}
                cells={[
                  { value: p.partNumber, width: "25%" },
                  { value: p.description, width: "55%" },
                  { value: String(p.qty), width: "20%", align: "right" },
                ]}
              />
            ))}
          </View>
        )}

        {/* Summary */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
          {laborHours != null && (
            <View>
              <Text style={baseStyles.label}>Total Labor Hours</Text>
              <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>{laborHours.toFixed(1)}</Text>
            </View>
          )}
          {costSummary && (
            <View style={{ width: 200 }}>
              <Text style={baseStyles.sectionTitle}>Cost Summary</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontSize: 9, color: COLORS.textMuted }}>Labor</Text>
                <Text style={{ fontSize: 9 }}>{formatCurrency(costSummary.labor)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Text style={{ fontSize: 9, color: COLORS.textMuted }}>Parts</Text>
                <Text style={{ fontSize: 9 }}>{formatCurrency(costSummary.parts)}</Text>
              </View>
              {costSummary.other > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                  <Text style={{ fontSize: 9, color: COLORS.textMuted }}>Other</Text>
                  <Text style={{ fontSize: 9 }}>{formatCurrency(costSummary.other)}</Text>
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
                <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>Total</Text>
                <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>
                  {formatCurrency(costSummary.total)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <PDFFooter text={`Work Order ${workOrderNumber} — Generated ${formatPdfDate(Date.now())}`} />
      </Page>
    </Document>
  );
}
