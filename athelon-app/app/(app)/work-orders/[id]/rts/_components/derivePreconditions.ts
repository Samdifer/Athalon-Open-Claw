import { type CloseReadinessReport } from "@/lib/mro-types";
import { type Precondition, type PreconditionStatus } from "./RtsChecklist";

export function derivePreconditions(
  report: CloseReadinessReport,
  rtsStatement: string,
  signatureAuthEventId: string,
  // BH-LT3-001: aircraftHoursAtRts must be passed in so PRE-3 can show
  // PENDING when the field is empty. Without this param, PRE-3 showed PASS
  // as soon as aircraftCurrentHours was on file — regardless of whether the
  // user had typed anything into the hours input. All 9 precondition cards
  // would show green ✓ but the Authorize button stayed grayed out with no
  // explanation. The user had no idea why they couldn't proceed.
  aircraftHoursAtRts?: string,
): Precondition[] {
  const getBlocker = (code: string) =>
    report.blockers.find(
      (b: { code: string; description: string }) => b.code === code,
    );

  // PRE-1: Signature auth event
  const pre1Blocker =
    getBlocker("RTS_AUTH_EVENT_NOT_FOUND") ??
    getBlocker("RTS_AUTH_EVENT_CONSUMED") ??
    getBlocker("RTS_AUTH_EVENT_EXPIRED") ??
    getBlocker("RTS_AUTH_EVENT_WRONG_TABLE");
  const pre1Status: PreconditionStatus = !signatureAuthEventId.trim()
    ? "PENDING"
    : pre1Blocker
      ? "FAIL"
      : "PASS";

  // PRE-2: Work order state
  const pre2Blocker = getBlocker("RTS_WRONG_WO_STATUS");
  const pre2Status: PreconditionStatus = pre2Blocker
    ? "FAIL"
    : report.workOrderStatus === "pending_signoff"
      ? "PASS"
      : "PENDING";

  // PRE-3: Aircraft total time consistent
  // BH-LT3-001: Must check both that (a) hours are on file AND (b) the user
  // has actually entered a value in the aircraft hours field. Previously only
  // checked (a), so PRE-3 showed PASS immediately when the aircraft had hours
  // on file, even with an empty field — but the Authorize button was still
  // disabled. All 9 green, button grey, zero explanation.
  const pre3Blocker =
    getBlocker("RTS_AIRCRAFT_TIME_MISMATCH") ??
    getBlocker("RTS_AIRCRAFT_TIME_DECREASED");
  const hoursEntered = aircraftHoursAtRts !== undefined && aircraftHoursAtRts.trim().length > 0;
  const pre3Status: PreconditionStatus = pre3Blocker
    ? "FAIL"
    : !hoursEntered
      ? "PENDING"
      : report.aircraftCurrentHours != null
        ? "PASS"
        : "PENDING";

  // PRE-4: All task cards complete
  const pre4Blocker =
    getBlocker("RTS_OPEN_TASK_CARDS") ??
    getBlocker("RTS_UNREVIEWED_NA_STEPS");
  const pre4Status: PreconditionStatus = pre4Blocker
    ? "FAIL"
    : report.taskCards.every((tc: { isBlocking: boolean }) => !tc.isBlocking)
      ? "PASS"
      : "PENDING";

  // PRE-5: All discrepancies dispositioned
  const pre5Blocker = getBlocker("RTS_OPEN_DISCREPANCIES");
  const pre5Status: PreconditionStatus = pre5Blocker
    ? "FAIL"
    : report.discrepancies.every((d: { isBlocking: boolean }) => !d.isBlocking)
      ? "PASS"
      : "PENDING";

  // PRE-6: Signing technician authorized
  const pre6Blocker =
    getBlocker("RTS_TECH_NOT_CERTIFICATED") ??
    getBlocker("RTS_TECH_NO_IA") ??
    getBlocker("RTS_TECH_IA_EXPIRED");
  const pre6Status: PreconditionStatus = pre6Blocker
    ? "FAIL"
    : signatureAuthEventId.trim()
      ? "PASS"
      : "PENDING";

  // PRE-7: AD compliance reviewed
  const pre7Blocker =
    getBlocker("RTS_AD_OVERDUE") ??
    getBlocker("RTS_AD_REVIEW_NOT_DOCUMENTED");
  const pre7Status: PreconditionStatus = pre7Blocker
    ? "FAIL"
    : report.adComplianceSummary === null
      ? "PASS"
      : report.adComplianceSummary.every(
            (ad: { isBlocking: boolean }) => !ad.isBlocking,
          ) && report.inspectionRecordSummary?.adComplianceReviewed !== false
        ? "PASS"
        : "PENDING";

  // PRE-8: Required signatures on maintenance records
  const pre8Blocker =
    getBlocker("RTS_UNSIGNED_RECORD") ??
    getBlocker("RTS_NO_MAINTENANCE_RECORDS");
  const pre8Status: PreconditionStatus = pre8Blocker
    ? "FAIL"
    : report.maintenanceRecords.length > 0 &&
        report.maintenanceRecords.every(
          (r: { isBlocking: boolean }) => !r.isBlocking,
        )
      ? "PASS"
      : "PENDING";

  // PRE-9: RTS statement provided (UI check)
  const pre9Status: PreconditionStatus =
    rtsStatement.trim().length === 0
      ? "PENDING"
      : rtsStatement.trim().length < 50
        ? "FAIL"
        : "PASS";

  return [
    {
      id: "pre-1",
      label: "Signature Auth Event",
      description:
        "A valid, unconsumed re-authentication event for return-to-service signing.",
      status: pre1Status,
      failureMessage:
        pre1Blocker?.description ??
        (pre1Status === "FAIL"
          ? "Auth event invalid or not provided."
          : undefined),
    },
    {
      id: "pre-2",
      label: "Work Order in Pending Sign-Off",
      description: `Work order must be in "pending_signoff" status. Current: "${report.workOrderStatus}".`,
      status: pre2Status,
      failureMessage: pre2Blocker?.description,
    },
    {
      id: "pre-3",
      label: "Aircraft Total Time Consistent",
      description: `Aircraft hours on file: ${report.aircraftCurrentHours?.toFixed(1) ?? "Unknown"} hr. Enter RTS hours above (must be ≥ recorded value).`,
      status: pre3Status,
      failureMessage: pre3Blocker?.description ?? (pre3Status === "PENDING" && !hoursEntered ? "Enter aircraft total time at RTS before authorizing." : undefined),
    },
    {
      id: "pre-4",
      label: "All Task Cards Complete",
      description: `${report.taskCards.filter((tc: { isBlocking: boolean }) => tc.isBlocking).length} of ${report.taskCards.length} task cards still require attention.`,
      status: pre4Status,
      failureMessage: pre4Blocker?.description,
    },
    {
      id: "pre-5",
      label: "All Discrepancies Dispositioned",
      description: `${report.discrepancies.filter((d: { isBlocking: boolean }) => d.isBlocking).length} of ${report.discrepancies.length} discrepancies require attention.`,
      status: pre5Status,
      failureMessage: pre5Blocker?.description,
    },
    {
      id: "pre-6",
      label: "Technician Authorized (IA Current)",
      description:
        "Signing technician must hold a current Inspection Authorization. Verified at signature time.",
      status: pre6Status,
      failureMessage: pre6Blocker?.description,
    },
    {
      id: "pre-7",
      label: "AD Compliance Reviewed",
      description:
        report.adComplianceSummary === null
          ? "Not required for this work order type."
          : `${report.adComplianceSummary.filter((ad: { isBlocking: boolean }) => ad.isBlocking).length} applicable AD(s) require attention.`,
      status: pre7Status,
      failureMessage: pre7Blocker?.description,
    },
    {
      id: "pre-8",
      label: "Maintenance Records Signed",
      description: `${report.maintenanceRecords.filter((r: { isBlocking: boolean }) => r.isBlocking).length} of ${report.maintenanceRecords.length} maintenance record(s) are not signed.`,
      status: pre8Status,
      failureMessage: pre8Blocker?.description,
    },
    {
      id: "pre-9",
      label: "RTS Statement Provided (≥ 50 chars)",
      description: `Return-to-service certification statement. Current length: ${rtsStatement.trim().length} characters.`,
      status: pre9Status,
      failureMessage:
        pre9Status === "FAIL"
          ? `Statement is ${rtsStatement.trim().length} characters. Minimum 50 required per 14 CFR 43.9.`
          : undefined,
    },
  ];
}
