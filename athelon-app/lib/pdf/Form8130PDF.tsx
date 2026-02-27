/**
 * lib/pdf/Form8130PDF.tsx — FAA Form 8130-3 Authorized Release Certificate PDF.
 */
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { COLORS, formatPdfDate } from "./shared";

const s = StyleSheet.create({
  page: { padding: 30, fontSize: 8, fontFamily: "Helvetica", color: "#000" },
  title: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  subtitle: { textAlign: "center", fontSize: 9, marginBottom: 8 },
  formNumber: { textAlign: "center", fontSize: 7, color: "#555", marginBottom: 12 },
  row: { flexDirection: "row" },
  block: {
    borderWidth: 0.5,
    borderColor: "#000",
    padding: 4,
    minHeight: 28,
  },
  blockLabel: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#333",
    marginBottom: 2,
    textTransform: "uppercase" as const,
  },
  blockValue: { fontSize: 8 },
  halfBlock: { width: "50%" },
  thirdBlock: { width: "33.33%" },
  quarterBlock: { width: "25%" },
  fullBlock: { width: "100%" },
  twoThirdBlock: { width: "66.67%" },
  threeQuarterBlock: { width: "75%" },
  sectionHeader: {
    backgroundColor: "#e5e7eb",
    padding: 3,
    borderWidth: 0.5,
    borderColor: "#000",
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 6,
    color: "#999",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 4,
  },
});

export interface Form8130PDFProps {
  // Block 1 — Approving authority
  approvingAuthority: string;
  repairStationCertNumber?: string;
  repairStationAddress?: string;

  // Block 2 — Org form tracking
  orgFormTrackingNumber?: string;

  // Block 3 — Form tracking number
  formTrackingNumber: string;

  // Block 4 — Organization name and address
  organizationName: string;
  organizationAddress?: string;

  // Block 5 — Work order number
  workOrderNumber?: string;

  // Block 6 — Item description
  partDescription: string;

  // Block 7 — Part number
  partNumber: string;

  // Block 8 — Quantity
  quantity: number;

  // Block 9 — Serial number
  serialNumber?: string;

  // Block 10 — Batch number
  batchNumber?: string;

  // Block 11 — Status/work performed
  statusWork: string;

  // Block 12 — Condition
  condition?: string;

  // Block 13 — Remarks
  remarks?: string;

  // Block 14 — Certification
  inspectorName: string;
  approvalNumber: string;
  signatureDate: number;
  certifyingStatement?: string;
}

export function Form8130PDF(props: Form8130PDFProps) {
  const certStatement =
    props.certifyingStatement ??
    "It is certified that the items identified above were manufactured in conformity to approved design data and are in a condition for safe operation.";

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <Text style={s.title}>AUTHORIZED RELEASE CERTIFICATE</Text>
        <Text style={s.subtitle}>FAA Form 8130-3</Text>
        <Text style={s.formNumber}>
          Airworthiness Approval Tag — 14 CFR Part 21, Part 43, Part 145
        </Text>

        {/* Section 1: Approving Authority / Organization */}
        <View style={s.row}>
          <View style={[s.block, s.halfBlock]}>
            <Text style={s.blockLabel}>1. Approving Civil Aviation Authority / Country</Text>
            <Text style={s.blockValue}>
              {props.approvingAuthority}
              {props.repairStationCertNumber ? ` — Cert. ${props.repairStationCertNumber}` : ""}
            </Text>
            {props.repairStationAddress && (
              <Text style={[s.blockValue, { marginTop: 2, fontSize: 7 }]}>
                {props.repairStationAddress}
              </Text>
            )}
          </View>
          <View style={[s.block, s.quarterBlock]}>
            <Text style={s.blockLabel}>2. Org Form Tracking No.</Text>
            <Text style={s.blockValue}>{props.orgFormTrackingNumber ?? "N/A"}</Text>
          </View>
          <View style={[s.block, s.quarterBlock]}>
            <Text style={s.blockLabel}>3. Form Tracking Number</Text>
            <Text style={s.blockValue}>{props.formTrackingNumber}</Text>
          </View>
        </View>

        {/* Section 2: Org Name + WO */}
        <View style={s.row}>
          <View style={[s.block, s.threeQuarterBlock]}>
            <Text style={s.blockLabel}>4. Organization Name and Address</Text>
            <Text style={s.blockValue}>{props.organizationName}</Text>
            {props.organizationAddress && (
              <Text style={[s.blockValue, { fontSize: 7 }]}>{props.organizationAddress}</Text>
            )}
          </View>
          <View style={[s.block, s.quarterBlock]}>
            <Text style={s.blockLabel}>5. Work Order / Contract / Invoice</Text>
            <Text style={s.blockValue}>{props.workOrderNumber ?? "—"}</Text>
          </View>
        </View>

        {/* Section 3: Item details */}
        <View style={[s.sectionHeader]}>
          <Text>ITEM IDENTIFICATION</Text>
        </View>

        <View style={s.row}>
          <View style={[s.block, s.halfBlock]}>
            <Text style={s.blockLabel}>6. Item Description</Text>
            <Text style={s.blockValue}>{props.partDescription}</Text>
          </View>
          <View style={[s.block, s.halfBlock]}>
            <Text style={s.blockLabel}>7. Part Number</Text>
            <Text style={s.blockValue}>{props.partNumber}</Text>
          </View>
        </View>

        <View style={s.row}>
          <View style={[s.block, s.quarterBlock]}>
            <Text style={s.blockLabel}>8. Quantity</Text>
            <Text style={s.blockValue}>{props.quantity}</Text>
          </View>
          <View style={[s.block, s.quarterBlock]}>
            <Text style={s.blockLabel}>9. Serial Number</Text>
            <Text style={s.blockValue}>{props.serialNumber ?? "N/A"}</Text>
          </View>
          <View style={[s.block, s.quarterBlock]}>
            <Text style={s.blockLabel}>10. Batch Number</Text>
            <Text style={s.blockValue}>{props.batchNumber ?? "N/A"}</Text>
          </View>
          <View style={[s.block, s.quarterBlock]}>
            <Text style={s.blockLabel}>11. Status / Work</Text>
            <Text style={s.blockValue}>{props.statusWork}</Text>
          </View>
        </View>

        <View style={s.row}>
          <View style={[s.block, s.fullBlock]}>
            <Text style={s.blockLabel}>12. Condition</Text>
            <Text style={s.blockValue}>{props.condition ?? "—"}</Text>
          </View>
        </View>

        {/* Section 4: Remarks */}
        <View style={[s.block, s.fullBlock, { minHeight: 60 }]}>
          <Text style={s.blockLabel}>13. Remarks</Text>
          <Text style={s.blockValue}>{props.remarks ?? ""}</Text>
        </View>

        {/* Section 5: Certification */}
        <View style={[s.sectionHeader]}>
          <Text>CERTIFICATION / APPROVAL</Text>
        </View>

        <View style={[s.block, s.fullBlock, { minHeight: 30 }]}>
          <Text style={[s.blockValue, { fontFamily: "Helvetica-Oblique", fontSize: 7.5 }]}>
            {certStatement}
          </Text>
        </View>

        <View style={s.row}>
          <View style={[s.block, s.thirdBlock, { minHeight: 36 }]}>
            <Text style={s.blockLabel}>14a. Signature of Authorized Person</Text>
            <Text style={[s.blockValue, { marginTop: 10 }]}>____________________________</Text>
          </View>
          <View style={[s.block, s.thirdBlock]}>
            <Text style={s.blockLabel}>14b. Approval / Certificate Number</Text>
            <Text style={s.blockValue}>{props.approvalNumber}</Text>
          </View>
          <View style={[s.block, s.thirdBlock]}>
            <Text style={s.blockLabel}>14c. Name (Print)</Text>
            <Text style={s.blockValue}>{props.inspectorName}</Text>
          </View>
        </View>

        <View style={s.row}>
          <View style={[s.block, s.halfBlock]}>
            <Text style={s.blockLabel}>14d. Date</Text>
            <Text style={s.blockValue}>{formatPdfDate(props.signatureDate)}</Text>
          </View>
          <View style={[s.block, s.halfBlock, { minHeight: 30 }]}>
            <Text style={s.blockLabel}>14e. Stamp / Seal</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>FAA Form 8130-3 — Authorized Release Certificate — Generated by Athelon MRO</Text>
        </View>
      </Page>
    </Document>
  );
}
