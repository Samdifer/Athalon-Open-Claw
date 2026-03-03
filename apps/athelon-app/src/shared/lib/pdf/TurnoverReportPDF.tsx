import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  baseStyles,
  COLORS,
  PDFHeader,
  PDFFooter,
  InfoGrid,
  TableHeader,
  TableRow,
  formatPdfDate,
} from "./shared";

export interface TurnoverPersonRowPDF {
  name: string;
  hours: number;
  notes?: string;
}

export interface TurnoverTeamRowPDF {
  teamName: string;
  hours: number;
  notes?: string;
}

export interface TurnoverWorkOrderRowPDF {
  workOrderNumber: string;
  notes?: string;
}

export interface TurnoverReportPDFProps {
  orgName?: string;
  reportDate: string;
  generatedAt: number;
  status: "draft" | "submitted";
  leadName: string;
  totalHours: number;
  workOrderHours: number;
  aiDraftSummary?: string;
  summaryText?: string;
  leadNotes?: string;
  upcomingDeadlinesNotes?: string;
  partsOrderedSummary?: string;
  partsReceivedSummary?: string;
  personBreakdown: TurnoverPersonRowPDF[];
  teamBreakdown: TurnoverTeamRowPDF[];
  workOrderNotes: TurnoverWorkOrderRowPDF[];
}

function hours(value: number): string {
  return `${value.toFixed(2)}h`;
}

export function TurnoverReportPDF(props: TurnoverReportPDFProps) {
  const personColumns = [
    { label: "Technician", width: "45%" },
    { label: "Hours", width: "15%", align: "right" },
    { label: "Notes", width: "40%" },
  ];

  const teamColumns = [
    { label: "Team", width: "45%" },
    { label: "Hours", width: "15%", align: "right" },
    { label: "Notes", width: "40%" },
  ];

  const woColumns = [
    { label: "Work Order", width: "25%" },
    { label: "Notes", width: "75%" },
  ];

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <PDFHeader
          title="TURNOVER REPORT"
          orgName={props.orgName}
          rightContent={
            <Text style={baseStyles.headerSubtitle}>
              {props.status === "submitted" ? "Submitted" : "Draft"}
            </Text>
          }
        />

        <InfoGrid
          items={[
            { label: "Report Date", value: props.reportDate },
            { label: "Generated", value: formatPdfDate(props.generatedAt) },
            { label: "Lead", value: props.leadName },
            { label: "Total Hours", value: hours(props.totalHours) },
            { label: "WO Hours", value: hours(props.workOrderHours) },
          ]}
        />

        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 6,
          }}
        >
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: COLORS.borderLight,
              borderRadius: 4,
              padding: 8,
            }}
          >
            <Text style={baseStyles.label}>AI Draft Summary</Text>
            <Text style={baseStyles.value}>{props.aiDraftSummary ?? "—"}</Text>
          </View>
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: COLORS.borderLight,
              borderRadius: 4,
              padding: 8,
            }}
          >
            <Text style={baseStyles.label}>Lead Final Summary</Text>
            <Text style={baseStyles.value}>{props.summaryText ?? "—"}</Text>
          </View>
        </View>

        <Text style={baseStyles.sectionTitle}>Technician Breakdown</Text>
        <TableHeader columns={personColumns} />
        {(props.personBreakdown.length > 0 ? props.personBreakdown : [{ name: "No entries", hours: 0 }]).map(
          (row, idx) => (
            <TableRow
              key={`${row.name}-${idx}`}
              index={idx}
              cells={[
                { value: row.name, width: "45%" },
                { value: hours(row.hours), width: "15%", align: "right" },
                { value: row.notes ?? "—", width: "40%" },
              ]}
            />
          ),
        )}

        <Text style={baseStyles.sectionTitle}>Team Breakdown</Text>
        <TableHeader columns={teamColumns} />
        {(props.teamBreakdown.length > 0 ? props.teamBreakdown : [{ teamName: "Unassigned", hours: 0 }]).map(
          (row, idx) => (
            <TableRow
              key={`${row.teamName}-${idx}`}
              index={idx}
              cells={[
                { value: row.teamName, width: "45%" },
                { value: hours(row.hours), width: "15%", align: "right" },
                { value: row.notes ?? "—", width: "40%" },
              ]}
            />
          ),
        )}

        <Text style={baseStyles.sectionTitle}>Work Order Notes</Text>
        <TableHeader columns={woColumns} />
        {(props.workOrderNotes.length > 0
          ? props.workOrderNotes
          : [{ workOrderNumber: "—", notes: "No work orders selected" }]
        ).map((row, idx) => (
          <TableRow
            key={`${row.workOrderNumber}-${idx}`}
            index={idx}
            cells={[
              { value: row.workOrderNumber, width: "25%" },
              { value: row.notes ?? "—", width: "75%" },
            ]}
          />
        ))}

        <View style={{ marginTop: 10 }}>
          <Text style={baseStyles.label}>Upcoming Deadlines</Text>
          <Text style={baseStyles.value}>{props.upcomingDeadlinesNotes ?? "—"}</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={baseStyles.label}>Parts Ordered</Text>
          <Text style={baseStyles.value}>{props.partsOrderedSummary ?? "—"}</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={baseStyles.label}>Parts Received</Text>
          <Text style={baseStyles.value}>{props.partsReceivedSummary ?? "—"}</Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={baseStyles.label}>Lead Notes</Text>
          <Text style={baseStyles.value}>{props.leadNotes ?? "—"}</Text>
        </View>

        <PDFFooter text="Athelon shift turnover report" />
      </Page>
    </Document>
  );
}
