/**
 * lib/pdf/EASAForm1PDF.tsx — EASA Form 1 Authorized Release Certificate PDF.
 */
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatPdfDate } from "./shared";

const s = StyleSheet.create({
  page: { padding: 30, fontSize: 8, fontFamily: "Helvetica", color: "#000" },
  title: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  subtitle: { textAlign: "center", fontSize: 9, marginBottom: 4 },
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
  threeQuarterBlock: { width: "75%" },
  sectionHeader: {
    backgroundColor: "#dbeafe",
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

export interface EASAForm1PDFProps {
  // Block 1 — Approving authority
  approvingAuthority: string;
  approvalReference?: string;
  organizationAddress?: string;

  // Block 2 — EASA Form 1 tracking
  easaFormTrackingNumber?: string;

  // Block 3 — Form tracking number
  formTrackingNumber: string;

  // Block 4 — Organization
  organizationName: string;

  // Block 5 — Work order
  workOrderNumber?: string;

  // Block 6 — Item
  partDescription: string;

  // Block 7 — Part number
  partNumber: string;

  // Block 8 — Quantity
  quantity: number;

  // Block 9 — Serial number
  serialNumber?: string;

  // Block 10 — Batch number
  batchNumber?: string;

  // Block 11 — Status / work
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

export function EASAForm1PDF(props: EASAForm1PDFProps) {
  const certStatement =
    props.certifyingStatement ??
    "Certifies that the items identified above were maintained / manufactured in accordance with Part-145 / Part-21 and are considered ready for release to service.";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <Text style={s.title}>AUTHORIZED RELEASE CERTIFICATE</Text>
        <Text style={s.subtitle}>EASA Form 1</Text>
        <Text style={s.formNumber}>
          European Union Aviation Safety Agency — Regulation (EU) No 748/2012 &amp; No 1321/2014
        </Text>

        {/* Block 1-3 */}
        <View style={s.row}>
          <View style={[s.block, s.halfBlock]}>
            <Text style={s.blockLabel}>1. Approving Competent Authority / Country</Text>
            <Text style={s.blockValue}>
              {props.approvingAuthority}
              {props.approvalReference ? ` — Ref. ${props.approvalReference}` : ""}
            </Text>
            {props.organizationAddress && (
              <Text style={[s.blockValue, { marginTop: 2, fontSize: 7 }]}>
                {props.organizationAddress}
              </Text>
            )}
          </View>
          <View style={[s.block, s.quarterBlock]}>
            <Text style={s.blockLabel}>2. EASA Form 1 Header Ref.</Text>
            <Text style={s.blockValue}>{props.easaFormTrackingNumber ?? "N/A"}</Text>
          </View>
          <View style={[s.block, s.quarterBlock]}>
            <Text style={s.blockLabel}>3. Form Tracking Number</Text>
            <Text style={s.blockValue}>{props.formTrackingNumber}</Text>
          </View>
        </View>

        {/* Block 4-5 */}
        <View style={s.row}>
          <View style={[s.block, s.threeQuarterBlock]}>
            <Text style={s.blockLabel}>4. Organization Name and Address</Text>
            <Text style={s.blockValue}>{props.organizationName}</Text>
          </View>
          <View style={[s.block, s.quarterBlock]}>
            <Text style={s.blockLabel}>5. Work Order / Contract / Invoice</Text>
            <Text style={s.blockValue}>{props.workOrderNumber ?? "—"}</Text>
          </View>
        </View>

        {/* Item Identification */}
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

        {/* Remarks */}
        <View style={[s.block, s.fullBlock, { minHeight: 60 }]}>
          <Text style={s.blockLabel}>13. Remarks</Text>
          <Text style={s.blockValue}>{props.remarks ?? ""}</Text>
        </View>

        {/* Certification */}
        <View style={[s.sectionHeader]}>
          <Text>CERTIFICATION / APPROVAL STATEMENT</Text>
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
          <Text>EASA Form 1 — Authorized Release Certificate — Generated by Athelon MRO</Text>
        </View>
      </Page>
    </Document>
  );
}
