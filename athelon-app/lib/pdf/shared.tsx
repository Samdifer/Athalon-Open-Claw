/**
 * lib/pdf/shared.tsx — Shared PDF components and styles for @react-pdf/renderer.
 */
import { StyleSheet, View, Text } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

// ─── Colors ──────────────────────────────────────────────────────────────────

export const COLORS = {
  primary: "#1a1a2e",
  primaryLight: "#16213e",
  accent: "#0f3460",
  text: "#1a1a1a",
  textMuted: "#6b7280",
  border: "#d1d5db",
  borderLight: "#e5e7eb",
  rowAlt: "#f9fafb",
  white: "#ffffff",
  green: "#059669",
  red: "#dc2626",
  amber: "#d97706",
} as const;

// ─── Shared Styles ───────────────────────────────────────────────────────────

export const baseStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: COLORS.text,
  },
  headerBar: {
    backgroundColor: COLORS.primary,
    padding: 20,
    marginBottom: 20,
    marginTop: -40,
    marginLeft: -40,
    marginRight: -40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
  },
  headerSubtitle: {
    color: "#cbd5e1",
    fontSize: 9,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: 6,
    marginTop: 14,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  label: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase" as const,
    marginBottom: 1,
  },
  value: {
    fontSize: 9,
    color: COLORS.text,
  },
  row: {
    flexDirection: "row" as const,
  },
  footer: {
    position: "absolute" as const,
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center" as const,
    fontSize: 8,
    color: COLORS.textMuted,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 8,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function formatPdfDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Common Components ───────────────────────────────────────────────────────

export function PDFHeader({
  title,
  orgName,
  orgAddress,
  rightContent,
}: {
  title: string;
  orgName?: string;
  orgAddress?: string;
  rightContent?: React.ReactNode;
}) {
  return (
    <View style={baseStyles.headerBar}>
      <View>
        {orgName && (
          <Text style={{ color: COLORS.white, fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 2 }}>
            {orgName}
          </Text>
        )}
        {orgAddress && <Text style={{ color: "#94a3b8", fontSize: 8 }}>{orgAddress}</Text>}
      </View>
      <View style={{ alignItems: "flex-end" as const }}>
        <Text style={baseStyles.headerTitle}>{title}</Text>
        {rightContent}
      </View>
    </View>
  );
}

export function PDFFooter({ text }: { text?: string }) {
  return (
    <View style={baseStyles.footer} fixed>
      <Text>{text ?? "Thank you for your business"}</Text>
    </View>
  );
}

export function InfoGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
      {items.map((item, i) => (
        <View key={i} style={{ minWidth: 100 }}>
          <Text style={baseStyles.label}>{item.label}</Text>
          <Text style={baseStyles.value}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function TableHeader({ columns }: { columns: { label: string; width: string | number; align?: string }[] }) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: COLORS.primaryLight,
        padding: 6,
        paddingHorizontal: 8,
      }}
    >
      {columns.map((col, i) => (
        <Text
          key={i}
          style={{
            width: col.width,
            color: COLORS.white,
            fontSize: 8,
            fontFamily: "Helvetica-Bold",
            textAlign: (col.align as Style["textAlign"]) ?? "left",
          }}
        >
          {col.label}
        </Text>
      ))}
    </View>
  );
}

export function TableRow({
  cells,
  index,
}: {
  cells: { value: string; width: string | number; align?: string; bold?: boolean }[];
  index: number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        padding: 5,
        paddingHorizontal: 8,
        backgroundColor: index % 2 === 1 ? COLORS.rowAlt : COLORS.white,
        borderBottomWidth: 0.5,
        borderBottomColor: COLORS.borderLight,
      }}
    >
      {cells.map((cell, i) => (
        <Text
          key={i}
          style={{
            width: cell.width,
            fontSize: 9,
            textAlign: (cell.align as Style["textAlign"]) ?? "left",
            fontFamily: cell.bold ? "Helvetica-Bold" : "Helvetica",
          }}
        >
          {cell.value}
        </Text>
      ))}
    </View>
  );
}

export function SignatureBlock({ label }: { label: string }) {
  return (
    <View style={{ marginTop: 20, width: 220 }}>
      <View style={{ borderBottomWidth: 1, borderBottomColor: COLORS.text, marginBottom: 4, height: 30 }} />
      <Text style={{ fontSize: 8, color: COLORS.textMuted }}>{label}</Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
        <View style={{ width: 130 }}>
          <View style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 2, height: 14 }} />
          <Text style={{ fontSize: 7, color: COLORS.textMuted }}>Printed Name</Text>
        </View>
        <View style={{ width: 70 }}>
          <View style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 2, height: 14 }} />
          <Text style={{ fontSize: 7, color: COLORS.textMuted }}>Date</Text>
        </View>
      </View>
    </View>
  );
}
