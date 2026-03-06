const STALE_WARNING_HOURS = 24;
const STALE_CRITICAL_HOURS = 72;

export function createHarnessState() {
  return {
    links: [],
    auditTrail: [],
  };
}

function nowIso(now = new Date()) {
  return now.toISOString();
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function pushAudit(state, entry) {
  state.auditTrail.push({
    ...entry,
    at: entry.at ?? nowIso(),
  });
}

export function findAmbiguousAircraftMatches({ aircraft, tailNumber, serialNumber }) {
  const normalizedTail = (tailNumber ?? "").trim().toUpperCase();
  const normalizedSerial = (serialNumber ?? "").trim().toUpperCase();

  return aircraft.filter((a) => {
    const tailMatch = normalizedTail && a.tailNumber?.trim().toUpperCase() === normalizedTail;
    const serialMatch = normalizedSerial && a.serialNumber?.trim().toUpperCase() === normalizedSerial;
    return Boolean(tailMatch || serialMatch);
  });
}

export function linkCampRecord(state, args) {
  const {
    orgId,
    campAircraftId,
    aircraftId,
    tailNumber,
    serialNumber,
    linkedBy,
    requireExplicitAmbiguousConfirm = true,
    explicitAmbiguousConfirm = false,
    aircraftCatalog = [],
    provenanceMetadata = {},
    historicalMaintenanceEvidenceRefs = [],
    at,
  } = args;

  if (!orgId || !campAircraftId || !aircraftId) {
    throw new Error("orgId, campAircraftId, and aircraftId are required");
  }

  const existingCamp = state.links.find((l) => l.orgId === orgId && l.campAircraftId === campAircraftId && l.active);
  if (existingCamp && existingCamp.aircraftId !== aircraftId) {
    throw new Error("Duplicate CAMP aircraft ID in org is not allowed");
  }

  const existingAircraft = state.links.find((l) => l.orgId === orgId && l.aircraftId === aircraftId && l.active);
  if (existingAircraft && existingAircraft.campAircraftId !== campAircraftId) {
    throw new Error("Aircraft already mapped to a different CAMP aircraft ID in this org");
  }

  const ambiguousMatches = findAmbiguousAircraftMatches({ aircraft: aircraftCatalog, tailNumber, serialNumber });
  if (requireExplicitAmbiguousConfirm && ambiguousMatches.length > 1 && !explicitAmbiguousConfirm) {
    throw new Error("Ambiguous tail/serial match requires explicit confirmation");
  }

  const existingInactive = state.links.find(
    (l) => l.orgId === orgId && l.campAircraftId === campAircraftId && l.aircraftId === aircraftId && !l.active,
  );

  if (existingInactive) {
    existingInactive.active = true;
    existingInactive.relinkedAt = at ?? nowIso();
    existingInactive.relinkedBy = linkedBy;
    existingInactive.provenanceMetadata = {
      ...existingInactive.provenanceMetadata,
      ...provenanceMetadata,
      relinkCount: (existingInactive.provenanceMetadata?.relinkCount ?? 0) + 1,
    };

    pushAudit(state, {
      action: "relink",
      orgId,
      campAircraftId,
      aircraftId,
      actor: linkedBy,
      details: {
        evidenceRefCount: existingInactive.historicalMaintenanceEvidenceRefs.length,
      },
      at,
    });

    return existingInactive;
  }

  const record = {
    orgId,
    campAircraftId,
    aircraftId,
    tailNumber,
    serialNumber,
    linkedBy,
    linkedAt: at ?? nowIso(),
    active: true,
    provenanceMetadata: {
      sourceSystem: "CAMP",
      ...provenanceMetadata,
      relinkCount: 0,
    },
    historicalMaintenanceEvidenceRefs: [...historicalMaintenanceEvidenceRefs],
  };

  state.links.push(record);
  pushAudit(state, {
    action: "link",
    orgId,
    campAircraftId,
    aircraftId,
    actor: linkedBy,
    details: {
      evidenceRefCount: historicalMaintenanceEvidenceRefs.length,
    },
    at,
  });

  return record;
}

export function unlinkCampRecord(state, { orgId, campAircraftId, unlinkedBy, at }) {
  const link = state.links.find((l) => l.orgId === orgId && l.campAircraftId === campAircraftId && l.active);
  if (!link) {
    throw new Error("Active CAMP linkage not found");
  }

  link.active = false;
  link.unlinkedAt = at ?? nowIso();
  link.unlinkedBy = unlinkedBy;

  pushAudit(state, {
    action: "unlink",
    orgId,
    campAircraftId,
    aircraftId: link.aircraftId,
    actor: unlinkedBy,
    details: {
      evidenceRefCount: link.historicalMaintenanceEvidenceRefs.length,
    },
    at,
  });

  return link;
}

export function computeSyncHealth({ lastSyncAt, now = new Date(), warningHours = STALE_WARNING_HOURS, criticalHours = STALE_CRITICAL_HOURS }) {
  if (!lastSyncAt) {
    return "critical";
  }

  const last = new Date(lastSyncAt);
  const elapsedHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);

  if (elapsedHours >= criticalHours) return "critical";
  if (elapsedHours >= warningHours) return "warning";
  return "healthy";
}

export function deriveFleetStatusBadge(link, { lastSyncAt, now }) {
  if (!link || !link.active) return { tone: "muted", label: "Unlinked" };

  const health = computeSyncHealth({ lastSyncAt, now });
  if (health === "critical") return { tone: "danger", label: "Sync stale" };
  if (health === "warning") return { tone: "warning", label: "Sync aging" };

  return { tone: "success", label: "Linked" };
}

export function getConflictStateForUi({ pendingLinkAircraftId, activeLinksByAircraftId }) {
  const conflict = activeLinksByAircraftId[pendingLinkAircraftId];
  if (!conflict) {
    return { hasConflict: false, blocking: false };
  }

  return {
    hasConflict: true,
    blocking: true,
    message: `Aircraft already linked to CAMP ${conflict.campAircraftId}`,
  };
}

export function beginUnlinkRelinkFlow({ requireConfirmation = true }) {
  return {
    step: requireConfirmation ? "confirm-unlink" : "ready-relink",
    requireConfirmation,
    blocked: requireConfirmation,
  };
}

export function confirmUnlinkRelinkFlow(flowState) {
  if (!flowState.requireConfirmation) return { ...flowState, step: "ready-relink", blocked: false };
  return { ...flowState, step: "ready-relink", blocked: false };
}

export function snapshotTraceability(link) {
  return clone({
    evidenceRefs: link.historicalMaintenanceEvidenceRefs,
    provenanceMetadata: link.provenanceMetadata,
  });
}
