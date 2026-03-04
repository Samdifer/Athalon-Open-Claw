import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDate } from "@/lib/format";

type MinimalWorkOrder = {
  workOrderNumber?: string;
  _id?: string;
};

type MinimalAircraft = {
  currentRegistration?: string;
  make?: string;
  model?: string;
  serialNumber?: string;
  totalTimeAirframeHours?: number;
};

type MinimalTaskCard = {
  taskCardNumber?: string;
  title?: string;
  status?: string;
};

type MinimalDiscrepancy = {
  discrepancyNumber?: string;
  description?: string;
  status?: string;
  disposition?: string;
};

type MinimalPart = {
  partNumber?: string;
  serialNumber?: string;
  partName?: string;
  location?: string;
};

type SignoffPerson = {
  name?: string;
  certificateNumber?: string;
  date?: number;
};

interface RtsData {
  statement?: string;
  date?: number;
}

interface RtsDocumentPDFProps {
  workOrder: MinimalWorkOrder;
  aircraft?: MinimalAircraft | null;
  taskCards: MinimalTaskCard[];
  discrepancies: MinimalDiscrepancy[];
  parts?: MinimalPart[];
  rtsData?: RtsData;
  signingTech?: SignoffPerson;
  inspector?: SignoffPerson;
}

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, color: "#111827" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" },
  subtitle: { fontSize: 10, marginBottom: 12, color: "#4b5563" },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 4,
    textTransform: "uppercase",
    color: "#1f2937",
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  label: { color: "#6b7280", width: "35%" },
  value: { width: "65%" },
  tableHeader: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  statement: { borderWidth: 1, borderColor: "#d1d5db", padding: 8, lineHeight: 1.35 },
  signatureWrap: { flexDirection: "row", gap: 10, marginTop: 8 },
  signatureBox: { width: "48%", borderWidth: 1, borderColor: "#d1d5db", padding: 8 },
});

const fmt = (ms?: number) => (ms ? formatDate(ms) : "—");

export function RtsDocumentPDF({
  workOrder,
  aircraft,
  taskCards,
  discrepancies,
  parts = [],
  rtsData,
  signingTech,
  inspector,
}: RtsDocumentPDFProps) {
  const completedCards = taskCards.filter((c) => c.status === "complete");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Return to Service Document</Text>
        <Text style={styles.subtitle}>FAA Form 8610-2 style maintenance release summary</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aircraft Information</Text>
          <View style={styles.row}><Text style={styles.label}>Registration</Text><Text style={styles.value}>{aircraft?.currentRegistration ?? "—"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Make / Model</Text><Text style={styles.value}>{[aircraft?.make, aircraft?.model].filter(Boolean).join(" ") || "—"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Serial Number</Text><Text style={styles.value}>{aircraft?.serialNumber ?? "—"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Total Time</Text><Text style={styles.value}>{aircraft?.totalTimeAirframeHours ?? "—"}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Work Order Ref</Text><Text style={styles.value}>{workOrder.workOrderNumber ?? workOrder._id ?? "—"}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Performed (Completed Task Cards)</Text>
          <View style={styles.tableHeader}><Text style={{ width: "20%" }}>Card #</Text><Text style={{ width: "80%" }}>Title</Text></View>
          {completedCards.length === 0 ? (
            <View style={styles.tableRow}><Text>No completed task cards recorded.</Text></View>
          ) : (
            completedCards.map((card, idx) => (
              <View style={styles.tableRow} key={`${card.taskCardNumber ?? "tc"}-${idx}`}>
                <Text style={{ width: "20%" }}>{card.taskCardNumber ?? "—"}</Text>
                <Text style={{ width: "80%" }}>{card.title ?? "—"}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discrepancies Found & Resolved</Text>
          <View style={styles.tableHeader}><Text style={{ width: "18%" }}>Number</Text><Text style={{ width: "50%" }}>Description</Text><Text style={{ width: "32%" }}>Status / Disposition</Text></View>
          {discrepancies.length === 0 ? (
            <View style={styles.tableRow}><Text>No discrepancies recorded.</Text></View>
          ) : (
            discrepancies.map((d, idx) => (
              <View style={styles.tableRow} key={`${d.discrepancyNumber ?? "disc"}-${idx}`}>
                <Text style={{ width: "18%" }}>{d.discrepancyNumber ?? "—"}</Text>
                <Text style={{ width: "50%" }}>{d.description ?? "—"}</Text>
                <Text style={{ width: "32%" }}>{`${d.status ?? "—"}${d.disposition ? ` / ${d.disposition}` : ""}`}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parts Installed / Removed</Text>
          <View style={styles.tableHeader}><Text style={{ width: "26%" }}>Part Number</Text><Text style={{ width: "24%" }}>Serial</Text><Text style={{ width: "30%" }}>Description</Text><Text style={{ width: "20%" }}>Status</Text></View>
          {parts.length === 0 ? (
            <View style={styles.tableRow}><Text>No parts linked.</Text></View>
          ) : (
            parts.map((p, idx) => (
              <View style={styles.tableRow} key={`${p.partNumber ?? "part"}-${idx}`}>
                <Text style={{ width: "26%" }}>{p.partNumber ?? "—"}</Text>
                <Text style={{ width: "24%" }}>{p.serialNumber ?? "—"}</Text>
                <Text style={{ width: "30%" }}>{p.partName ?? "—"}</Text>
                <Text style={{ width: "20%" }}>{p.location ?? "—"}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RTS Statement</Text>
          <Text style={styles.statement}>
            {rtsData?.statement ??
              "I certify that the work described above has been performed in accordance with current regulations and approved data, and the aircraft is approved for return to service."}
          </Text>
        </View>

        <View style={styles.signatureWrap}>
          <View style={styles.signatureBox}>
            <Text style={styles.sectionTitle}>Signing Technician</Text>
            <Text>Name: {signingTech?.name ?? "—"}</Text>
            <Text>Certificate #: {signingTech?.certificateNumber ?? "—"}</Text>
            <Text>Date: {fmt(signingTech?.date ?? rtsData?.date)}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.sectionTitle}>Inspector Sign-Off</Text>
            <Text>Name: {inspector?.name ?? "—"}</Text>
            <Text>Certificate #: {inspector?.certificateNumber ?? "—"}</Text>
            <Text>Date: {fmt(inspector?.date ?? rtsData?.date)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
