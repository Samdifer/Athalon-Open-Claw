import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatDate } from "@/lib/format";

type WO = {
  workOrderNumber?: string;
  status?: string;
  openedAt?: number;
  closedAt?: number;
  description?: string;
  notes?: string;
  estimatedLaborHoursOverride?: number;
};

type Aircraft = { currentRegistration?: string; make?: string; model?: string; serialNumber?: string };
type Customer = { name?: string; companyName?: string };

type TaskCard = {
  _id?: string;
  taskCardNumber?: string;
  title?: string;
  status?: string;
  signedCertificateNumber?: string;
  inspectorCertificateNumber?: string;
  steps?: Array<{ _id?: string; description?: string; status?: string; partsInstalled?: Array<{ partNumber?: string; quantity?: number }> }>;
};

type Step = {
  taskCardId?: string;
  description?: string;
  status?: string;
  partsInstalled?: Array<{ partNumber?: string; quantity?: number }>;
};

type Discrepancy = { discrepancyNumber?: string; description?: string; status?: string; disposition?: string; correctiveAction?: string };
type TimeLog = { durationMinutes?: number };
type Attachment = { fileName?: string };

interface WorkOrderPDFProps {
  workOrder: WO;
  aircraft?: Aircraft | null;
  customer?: Customer | null;
  taskCards: TaskCard[];
  steps?: Step[];
  discrepancies: Discrepancy[];
  timeLogs?: TimeLog[];
  parts?: Array<{ partNumber?: string; partName?: string; serialNumber?: string; location?: string }>;
  attachments?: Attachment[];
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, color: "#111827" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 8, textTransform: "uppercase" },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginBottom: 4, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  lbl: { width: "30%", color: "#6b7280" },
  val: { width: "70%" },
  th: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f3f4f6",
    paddingVertical: 4,
    paddingHorizontal: 5,
    fontWeight: 700,
  },
  tr: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  muted: { color: "#6b7280" },
});

const fmt = (ms?: number) => (ms ? formatDate(ms) : "—");

export function WorkOrderPDF({
  workOrder,
  aircraft,
  customer,
  taskCards,
  steps = [],
  discrepancies,
  timeLogs = [],
  parts = [],
  attachments = [],
}: WorkOrderPDFProps) {
  const estimatedHours = workOrder.estimatedLaborHoursOverride ?? 0;
  const actualMinutes = timeLogs.reduce((acc, l) => acc + (l.durationMinutes ?? 0), 0);
  const actualHours = Math.round((actualMinutes / 60) * 100) / 100;

  const installedParts = parts.filter((p) => p.location === "installed");
  const removedParts = parts.filter((p) => p.location === "removed_pending_disposition");
  const consumedParts = parts.filter((p) => p.location === "scrapped" || p.location === "returned_to_vendor");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Work Order Documentation Package</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Header</Text>
          <View style={styles.row}><Text style={styles.lbl}>WO Number</Text><Text style={styles.val}>{workOrder.workOrderNumber ?? "—"}</Text></View>
          <View style={styles.row}><Text style={styles.lbl}>Aircraft</Text><Text style={styles.val}>{aircraft ? `${aircraft.currentRegistration ?? "—"} · ${aircraft.make ?? ""} ${aircraft.model ?? ""}` : "—"}</Text></View>
          <View style={styles.row}><Text style={styles.lbl}>Customer</Text><Text style={styles.val}>{customer?.companyName ?? customer?.name ?? "—"}</Text></View>
          <View style={styles.row}><Text style={styles.lbl}>Dates</Text><Text style={styles.val}>{`Opened ${fmt(workOrder.openedAt)} · Closed ${fmt(workOrder.closedAt)}`}</Text></View>
          <View style={styles.row}><Text style={styles.lbl}>Status</Text><Text style={styles.val}>{workOrder.status ?? "—"}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Cards & Completion Status</Text>
          <View style={styles.th}><Text style={{ width: "20%" }}>Card #</Text><Text style={{ width: "48%" }}>Title</Text><Text style={{ width: "14%" }}>Status</Text><Text style={{ width: "18%" }}>Sign-offs</Text></View>
          {taskCards.map((tc, idx) => (
            <View key={`${tc.taskCardNumber ?? "card"}-${idx}`}>
              <View style={styles.tr}>
                <Text style={{ width: "20%" }}>{tc.taskCardNumber ?? "—"}</Text>
                <Text style={{ width: "48%" }}>{tc.title ?? "—"}</Text>
                <Text style={{ width: "14%" }}>{tc.status ?? "—"}</Text>
                <Text style={{ width: "18%" }}>{tc.signedCertificateNumber ?? tc.inspectorCertificateNumber ?? "—"}</Text>
              </View>
              {(tc.steps ?? steps.filter((s) => s.taskCardId === tc._id)).slice(0, 8).map((s, sIdx) => (
                <View style={styles.tr} key={`${tc.taskCardNumber ?? "step"}-${sIdx}`}>
                  <Text style={{ width: "20%" }} />
                  <Text style={{ width: "48%", color: "#4b5563" }}>• {s.description ?? "—"}</Text>
                  <Text style={{ width: "14%" }}>{s.status ?? "—"}</Text>
                  <Text style={{ width: "18%" }}>{(s.partsInstalled?.map((p) => `${p.partNumber ?? "PN"} x${p.quantity ?? 1}`).join(", ") || "—")}</Text>
                </View>
              ))}
            </View>
          ))}
          {taskCards.length === 0 && <Text style={styles.muted}>No work cards.</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Findings & Corrective Actions</Text>
          <View style={styles.th}><Text style={{ width: "16%" }}>Number</Text><Text style={{ width: "38%" }}>Description</Text><Text style={{ width: "18%" }}>Status</Text><Text style={{ width: "28%" }}>Corrective Action</Text></View>
          {discrepancies.map((d, idx) => (
            <View style={styles.tr} key={`${d.discrepancyNumber ?? "disc"}-${idx}`}>
              <Text style={{ width: "16%" }}>{d.discrepancyNumber ?? "—"}</Text>
              <Text style={{ width: "38%" }}>{d.description ?? "—"}</Text>
              <Text style={{ width: "18%" }}>{d.status ?? d.disposition ?? "—"}</Text>
              <Text style={{ width: "28%" }}>{d.correctiveAction ?? d.disposition ?? "—"}</Text>
            </View>
          ))}
          {discrepancies.length === 0 && <Text style={styles.muted}>No findings.</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Summary (Estimated vs Actual)</Text>
          <Text>Estimated Hours: {estimatedHours}</Text>
          <Text>Actual Hours: {actualHours}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parts Summary</Text>
          <Text>Installed: {installedParts.length}</Text>
          <Text>Removed: {removedParts.length}</Text>
          <Text>Consumed: {consumedParts.length}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes & Attachments</Text>
          <Text>{workOrder.description ?? workOrder.notes ?? "—"}</Text>
          <Text style={[styles.muted, { marginTop: 3 }]}>Attachments: {attachments.length > 0 ? attachments.map((a) => a.fileName ?? "file").join(", ") : "None listed"}</Text>
        </View>
      </Page>
    </Document>
  );
}
