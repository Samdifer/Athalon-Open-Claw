/**
 * lib/pdf/RtsPDF.tsx — Return to Service / Maintenance Release PDF.
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
  formatPdfDate,
} from "./shared";

export interface RtsTaskCardPDF {
  cardNumber: string;
  title: string;
  ataChapter?: string;
  status: string;
  steps?: {
    description: string;
    signedBy?: string;
    signedAt?: number;
  }[];
}

export interface RtsDiscrepancyPDF {
  description: string;
  disposition: string;
  status: string;
}

export interface RtsPartInstalledPDF {
  partNumber: string;
  serialNumber?: string;
  description: string;
}

export interface RtsComplianceItemPDF {
  reference: string;
  type: string;
  description: string;
  status: string;
}

export interface RtsPDFProps {
  orgName?: string;
  orgAddress?: string;
  workOrderNumber: string;
  aircraftRegistration?: string;
  aircraftType?: string;
  aircraftSerial?: string;
  totalTime?: string;
  taskCards: RtsTaskCardPDF[];
  discrepancies?: RtsDiscrepancyPDF[];
  partsInstalled?: RtsPartInstalledPDF[];
  complianceItems?: RtsComplianceItemPDF[];
  rtsStatement?: string;
  inspectorName?: string;
  technicianName?: string;
  rtsDate?: number;
}

export function RtsPDF(props: RtsPDFProps) {
  const {
    orgName,
    orgAddress,
    workOrderNumber,
    aircraftRegistration,
    aircraftType,
    aircraftSerial,
    totalTime,
    taskCards,
    discrepancies,
    partsInstalled,
    complianceItems,
    rtsStatement,
    inspectorName,
    technicianName,
    rtsDate,
  } = props;

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PDFHeader
          title="MAINTENANCE RELEASE"
          orgName={orgName}
          orgAddress={orgAddress}
          rightContent={
            <Text style={baseStyles.headerSubtitle}>RETURN TO SERVICE</Text>
          }
        />

        {/* Aircraft Info */}
        <InfoGrid
          items={[
            { label: "Work Order", value: workOrderNumber },
            ...(aircraftRegistration ? [{ label: "Registration", value: aircraftRegistration }] : []),
            ...(aircraftType ? [{ label: "Aircraft Type", value: aircraftType }] : []),
            ...(aircraftSerial ? [{ label: "Serial #", value: aircraftSerial }] : []),
            ...(totalTime ? [{ label: "Total Time", value: totalTime }] : []),
            ...(rtsDate ? [{ label: "RTS Date", value: formatPdfDate(rtsDate) }] : []),
          ]}
        />

        {/* Task Cards */}
        <Text style={baseStyles.sectionTitle}>Completed Task Cards</Text>
        <TableHeader
          columns={[
            { label: "Card #", width: "15%" },
            { label: "Title", width: "35%" },
            { label: "ATA", width: "10%" },
            { label: "Status", width: "15%" },
            { label: "Steps", width: "25%", align: "right" },
          ]}
        />
        {taskCards.map((card, i) => (
          <TableRow
            key={i}
            index={i}
            cells={[
              { value: card.cardNumber, width: "15%" },
              { value: card.title, width: "35%" },
              { value: card.ataChapter ?? "—", width: "10%" },
              { value: card.status, width: "15%" },
              {
                value: card.steps ? `${card.steps.length} step(s)` : "—",
                width: "25%",
                align: "right",
              },
            ]}
          />
        ))}

        {/* Discrepancies */}
        {discrepancies && discrepancies.length > 0 && (
          <View>
            <Text style={baseStyles.sectionTitle}>Discrepancies</Text>
            <TableHeader
              columns={[
                { label: "Description", width: "45%" },
                { label: "Disposition", width: "35%" },
                { label: "Status", width: "20%" },
              ]}
            />
            {discrepancies.map((d, i) => (
              <TableRow
                key={i}
                index={i}
                cells={[
                  { value: d.description, width: "45%" },
                  { value: d.disposition, width: "35%" },
                  { value: d.status, width: "20%" },
                ]}
              />
            ))}
          </View>
        )}

        {/* Parts Installed */}
        {partsInstalled && partsInstalled.length > 0 && (
          <View>
            <Text style={baseStyles.sectionTitle}>Parts Installed</Text>
            <TableHeader
              columns={[
                { label: "Part Number", width: "30%" },
                { label: "Serial #", width: "25%" },
                { label: "Description", width: "45%" },
              ]}
            />
            {partsInstalled.map((p, i) => (
              <TableRow
                key={i}
                index={i}
                cells={[
                  { value: p.partNumber, width: "30%" },
                  { value: p.serialNumber ?? "N/A", width: "25%" },
                  { value: p.description, width: "45%" },
                ]}
              />
            ))}
          </View>
        )}

        {/* Compliance Items */}
        {complianceItems && complianceItems.length > 0 && (
          <View>
            <Text style={baseStyles.sectionTitle}>Compliance Items (ADs / SBs)</Text>
            <TableHeader
              columns={[
                { label: "Reference", width: "20%" },
                { label: "Type", width: "10%" },
                { label: "Description", width: "50%" },
                { label: "Status", width: "20%" },
              ]}
            />
            {complianceItems.map((c, i) => (
              <TableRow
                key={i}
                index={i}
                cells={[
                  { value: c.reference, width: "20%" },
                  { value: c.type, width: "10%" },
                  { value: c.description, width: "50%" },
                  { value: c.status, width: "20%" },
                ]}
              />
            ))}
          </View>
        )}

        {/* RTS Statement */}
        <View style={{ marginTop: 20, padding: 10, backgroundColor: COLORS.rowAlt, borderRadius: 3 }}>
          <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 4, color: COLORS.primary }}>
            Return to Service Statement
          </Text>
          <Text style={{ fontSize: 8, lineHeight: 1.5 }}>
            {rtsStatement ??
              "This aircraft has been inspected and returned to service in accordance with " +
                "applicable regulations. All work was performed in compliance with the approved " +
                "maintenance program and applicable Airworthiness Directives."}
          </Text>
          <Text style={{ fontSize: 7, color: COLORS.textMuted, marginTop: 6 }}>
            Reference: 14 CFR 43.9 — Content, form, and disposition of maintenance records
          </Text>
        </View>

        {/* Signatures */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
          <View>
            <SignatureBlock label="Inspector Signature &amp; Certificate #" />
            {inspectorName && (
              <Text style={{ fontSize: 8, marginTop: 2 }}>{inspectorName}</Text>
            )}
          </View>
          <View>
            <SignatureBlock label="Technician Signature &amp; Certificate #" />
            {technicianName && (
              <Text style={{ fontSize: 8, marginTop: 2 }}>{technicianName}</Text>
            )}
          </View>
        </View>

        <PDFFooter text="This document is a maintenance record per 14 CFR 43.9" />
      </Page>
    </Document>
  );
}
