# WS23 — Sprint 3 Execution: 8130-3 OCR + Pilot Notification Log
**Sprint:** v1.2 Sprint 3  
**Target ship:** 2026-03-09  
**Owners:** Devraj Anand (backend) + Chloe Park (UI) + Jonas Harker (infra) + Marcus Webb (compliance)  
**Status: ✅ SHIPPED**

---

# FEATURE 1: 8130-3 OCR for Parts Receiving

**Requested by:** Teresa Varga, Parts Receiving, Skyline Aviation Services, Hickory NC  
**Regulatory surface:** FAA Form 8130-3 (Airworthiness Approval Tag) — the primary receiving document for FAA-approved parts

---

## Background

Teresa photographs every 8130-3 tag that comes in with a dock camera or her personal iPhone. Until now she photographs it, stores it in the photo attachment system, and then manually types the part number, serial number, description, and approval reference into the `receivePart` mutation fields. The tag is always in the record. The transcription is always manual. She asked: can the system just read it?

---

## Implementation

### OCR Service: Google Cloud Vision API

**API Contract:**

```typescript
// Endpoint: POST https://vision.googleapis.com/v1/images:annotate
// Auth: Bearer token (service account, stored in Convex environment secrets)
// Request:
{
  requests: [{
    image: { content: "<base64-encoded-image>" },
    features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }]
  }]
}

// Response (relevant fields):
{
  responses: [{
    fullTextAnnotation: {
      text: "<raw extracted text>",
      pages: [{
        blocks: [{
          paragraphs: [{
            words: [{
              symbols: [{ text: string, confidence: number }],
              confidence: number
            }]
          }],
          confidence: number
        }]
      }]
    }
  }]
}
```

**8130-3 Block Mapping:**

| Block | Field | Extraction Strategy |
|---|---|---|
| Block 1 | Part Number | Regex: `P/N[:\s]*([A-Z0-9\-]+)` + block proximity |
| Block 2 | Serial Number | Regex: `S/N[:\s]*([A-Z0-9\-]+)` + block proximity |
| Block 6 | Description | Text region below "Description" header label |
| Block 7 | Quantity | Numeric extraction near "Qty" label |
| Block 11 | Condition | Checkbox state detection + text: NEW / OVERHAULED / REPAIRED |
| Block 17 | Approval/Authorization Reference | Text below "Authorization/Approval Reference" — **highest scrutiny** |
| Block 14 | Date | Date-pattern extraction near "Date" label |
| Block 12 | Issuing Authority | Text in "Approved Design Data" or "Other Regulation" region |

### Convex Action: `convex/ocr.ts`

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

interface OcrField {
  value: string;
  confidence: number;
  flagged: boolean; // true if confidence < 0.85
}

interface Ocr8130Result {
  partNumber: OcrField;
  serialNumber: OcrField;
  description: OcrField;
  quantity: OcrField;
  condition: OcrField;
  approvalReference: OcrField;   // Block 17 — regulatory linchpin
  date: OcrField;
  issuingAuthority: OcrField;
  rawText: string;
  overallConfidence: number;
  block17Blocked: boolean;       // true if Block 17 confidence < 0.85
  forgeSuspicion: boolean;       // true if structural anomaly detected
}

export const extract8130 = action({
  args: {
    imageBase64: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args): Promise<Ocr8130Result> => {
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY!;
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image: { content: args.imageBase64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }]
          }]
        })
      }
    );

    const data = await response.json();
    const annotation = data.responses[0]?.fullTextAnnotation;
    
    if (!annotation) {
      throw new Error("OCR_NO_RESPONSE: Image could not be processed.");
    }

    // Field extraction with confidence scoring
    const fields = extract8130Fields(annotation);
    
    // Block 17 hard check
    const block17Blocked = fields.approvalReference.confidence < 0.85;
    
    // Forge suspicion: detect structural anomalies
    // (e.g., mismatched font regions, unusually clean text on a supposedly aged form)
    const forgeSuspicion = detectStructuralAnomalies(annotation);
    
    return {
      ...fields,
      rawText: annotation.text,
      overallConfidence: computeOverall(fields),
      block17Blocked,
      forgeSuspicion,
    };
  }
});

function extract8130Fields(annotation: any): Omit<Ocr8130Result, 'rawText' | 'overallConfidence' | 'block17Blocked' | 'forgeSuspicion'> {
  const text = annotation.text;
  
  const extractWithConfidence = (pattern: RegExp, fallbackLabel: string): OcrField => {
    const match = text.match(pattern);
    if (!match) return { value: "", confidence: 0, flagged: true };
    
    // Confidence derived from Vision API word-level confidence in matched region
    const confidence = computeRegionConfidence(annotation, match.index!, match[0].length);
    return {
      value: match[1]?.trim() ?? "",
      confidence,
      flagged: confidence < 0.85
    };
  };

  return {
    partNumber: extractWithConfidence(/P\/N[:\s]*([A-Z0-9\-]+)/i, "Part Number"),
    serialNumber: extractWithConfidence(/S\/N[:\s]*([A-Z0-9\-]+)/i, "Serial Number"),
    description: extractWithConfidence(/Description[:\s]*\n?([^\n]{3,80})/i, "Description"),
    quantity: extractWithConfidence(/Qty[:\s]*(\d+)/i, "Quantity"),
    condition: extractConditionBlock(annotation),
    approvalReference: extractWithConfidence(/Authorization[^:]*:[:\s]*([^\n]{5,120})/i, "Block 17"),
    date: extractWithConfidence(/Date[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i, "Date"),
    issuingAuthority: extractWithConfidence(/Approved Design Data[:\s]*([^\n]{3,80})/i, "Issuing Authority"),
  };
}

function detectStructuralAnomalies(annotation: any): boolean {
  // Heuristic: flag if block confidence variance exceeds threshold
  // (different segments of the form rendered at inconsistent confidence levels
  // can indicate digital compositing / forgery)
  const blocks = annotation.pages?.[0]?.blocks ?? [];
  if (blocks.length < 3) return false;
  const confidences = blocks.map((b: any) => b.confidence ?? 0);
  const avg = confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length;
  const variance = confidences.reduce((sum: number, c: number) => sum + Math.pow(c - avg, 2), 0) / confidences.length;
  return variance > 0.04; // Empirically tuned threshold
}
```

### Schema Addition: `convex/schema.ts`

```typescript
// convex/schema.ts — additions
export const partOcrResults = defineTable({
  storageId: v.string(),
  extractedAt: v.number(),
  partNumber: v.object({ value: v.string(), confidence: v.number(), flagged: v.boolean() }),
  serialNumber: v.object({ value: v.string(), confidence: v.number(), flagged: v.boolean() }),
  description: v.object({ value: v.string(), confidence: v.number(), flagged: v.boolean() }),
  quantity: v.object({ value: v.string(), confidence: v.number(), flagged: v.boolean() }),
  condition: v.object({ value: v.string(), confidence: v.number(), flagged: v.boolean() }),
  approvalReference: v.object({ value: v.string(), confidence: v.number(), flagged: v.boolean() }),
  date: v.object({ value: v.string(), confidence: v.number(), flagged: v.boolean() }),
  issuingAuthority: v.object({ value: v.string(), confidence: v.number(), flagged: v.boolean() }),
  overallConfidence: v.number(),
  block17Blocked: v.boolean(),
  forgeSuspicion: v.boolean(),
  rawText: v.string(),
  reviewedBy: v.optional(v.id("users")),
  reviewedAt: v.optional(v.number()),
  confirmedValues: v.optional(v.any()), // Final values after tech review
}).index("by_storage", ["storageId"]);
```

### Component: `<OcrReceivingForm>`

```tsx
// components/OcrReceivingForm.tsx

interface OcrReceivingFormProps {
  ocrResult: Ocr8130Result;
  onConfirm: (confirmedValues: ReceivePartInput) => void;
  onCancel: () => void;
}

export function OcrReceivingForm({ ocrResult, onConfirm, onCancel }: OcrReceivingFormProps) {
  const [values, setValues] = useState(initializeFromOcr(ocrResult));

  // Each field shows:
  // - Extracted value (pre-filled, editable)
  // - Confidence badge (green ≥0.85, amber 0.70–0.84, red <0.70)
  // - Flagged indicator if confidence < 0.85
  // - "Verify" label on flagged fields

  // Block 17 special treatment: if blocked, field shows red banner
  // "OCR confidence insufficient — Block 17 must be entered manually before receiving."
  // Form cannot be submitted until Block 17 has a manually confirmed value.

  return (
    <form onSubmit={handleSubmit}>
      <div className="ocr-form-header">
        <span>8130-3 OCR Results — Review and Confirm</span>
        <OverallConfidenceBadge confidence={ocrResult.overallConfidence} />
        {ocrResult.forgeSuspicion && (
          <Alert variant="warning">
            Structural anomaly detected in this document. Verify physical tag before receiving.
          </Alert>
        )}
      </div>

      {Object.entries(FIELD_CONFIG).map(([key, config]) => (
        <OcrField
          key={key}
          label={config.label}
          extracted={ocrResult[key as keyof Ocr8130Result] as OcrField}
          value={values[key]}
          onChange={(v) => setValues(prev => ({ ...prev, [key]: v }))}
          blocked={key === 'approvalReference' && ocrResult.block17Blocked}
          required={config.required}
        />
      ))}

      <div className="ocr-form-footer">
        <p className="ocr-assist-notice">
          OCR is an assist, not a record. You are confirming these values. 
          The confirming technician and timestamp are recorded.
        </p>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button 
          type="submit"
          disabled={ocrResult.block17Blocked && !values.approvalReference}
        >
          Confirm and Receive Part
        </Button>
      </div>
    </form>
  );
}
```

---

## Marcus: Block 17 Is the Linchpin

> "Block 17 on an 8130-3 is the approval authorization reference. It's the traceability chain to the approving authority — the DAR, the PAH, the repair station. If you receive a part and the approval reference is wrong, you've received a part you cannot legally install. There is no 'we'll sort it out later' on this field. If OCR can't read Block 17 with high confidence, the form must block and require manual entry. It does not guess. It does not fill in something that looks close. It blocks. That's the only acceptable behavior."

Block 17 confidence < 0.85 → form blocks submission until manual value is entered. This is enforced at the mutation level, not just the UI level:

```typescript
// convex/parts.ts
export const receivePart = mutation({
  args: {
    /* ... */
    approvalReference: v.string(),
    approvalReferenceConfirmedManually: v.boolean(),
    block17WasOcrBlocked: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.block17WasOcrBlocked && !args.approvalReferenceConfirmedManually) {
      throw new Error("Block 17 approval reference must be manually confirmed when OCR confidence is insufficient.");
    }
    // ... proceed with receiving
  }
});
```

---

## Teresa's UAT: Three Real 8130-3 Scenarios

Teresa ran all three scenarios on the receiving dock at Skyline on 2026-03-08, the day before sprint ship.

### Scenario 1: Clean Domestic Tag (Avco Lycoming OH-6 cylinder assembly)
- Source: domestic manufacturer, laser-printed tag, clear and unambiguous
- OCR result: all 8 fields extracted at ≥0.92 confidence, Block 17 at 0.94
- Form pre-filled completely. Teresa reviewed, confirmed one minor date format difference (MM/DD/YY → MM/DD/YYYY — she edited the year, confirmed)
- **Teresa accepts.** "That's faster than typing. I didn't even have to look up the part number."

### Scenario 2: Faded International Tag (Airbus seal kit, European EASA Form 1 equivalent accepted as 8130-3)
- Source: overhauled component, re-exported from EU repair station, tag printed on dot-matrix with fading at bottom third
- OCR result: Part Number 0.91, Serial Number 0.88, Description 0.73 (flagged), Condition 0.79 (flagged), Block 17 0.68 (BLOCKED)
- Form showed two amber fields and a red Block 17 block. Manual entry required for Block 17. Description and Condition flagged for verification.
- Teresa entered Block 17 manually from the physical tag, confirmed the two flagged fields by visual check
- **Teresa accepts with one flag:** "The system was right to stop me on Block 17. I actually had to squint at the original to read it. That's exactly when it should make me type it in."

### Scenario 3: Handwritten Supplement (Field-overhauled component with handwritten additions to a printed tag)
- Source: part returned from a field repair, printed 8130-3 base with handwritten Block 17 annotation and serial number correction
- OCR result: Part Number 0.88, Serial Number 0.43 (flagged, handwritten correction not resolved), Description 0.85, Condition 0.91, Block 17 0.31 (BLOCKED — handwritten text below threshold)
- Form showed multiple red and amber fields. Block 17 blocked. S/N flagged at 0.43.
- **Teresa flags:** "The serial number correction is the real problem. The old printed number and the handwritten correction are both there, and the system read the old one. I want a way to mark a field as 'handwritten — verify against physical tag' so the record shows the tech looked at it specifically, not just that they clicked through." → Feature request logged: `FR-023-handwritten-annotation-flag`. Deferred to v1.3.
- Teresa confirmed all values manually and completed receiving. **Accepts the flow; flags the enhancement.**

---

## Cilla's Test Plan: 4 Cases

**TC-OCR-01: Happy Path — high-confidence tag**
- Input: Synthetic 8130-3 image, all blocks legible, confidence ≥0.90
- Expected: All fields pre-filled, no flags, form submittable without manual intervention
- Pass criteria: `receivePart` mutation completes, `partOcrResults` record created with `block17Blocked: false`

**TC-OCR-02: Low Confidence Flag — amber fields**
- Input: Synthetic image with intentional blur on Description and Condition blocks (target confidence 0.70–0.84)
- Expected: Description and Condition flagged with amber badges, form allows submission after tech confirms flagged fields
- Pass criteria: `flagged: true` on both fields in `partOcrResults`, tech confirmation recorded in `confirmedValues`

**TC-OCR-03: Handwritten Block 17 Rejection**
- Input: Synthetic image with printed base tag + handwritten Block 17 (target confidence <0.60)
- Expected: Block 17 shows RED block banner, submit button disabled until manual entry, `block17Blocked: true` in result
- Pass criteria: Mutation rejects if `approvalReferenceConfirmedManually: false`; accepts after manual entry with confirmed flag

**TC-OCR-04: Forged Tag Detection Pattern**
- Input: Synthetic image constructed from two different documents (high confidence variance between blocks)
- Expected: `forgeSuspicion: true`, yellow structural anomaly warning displayed, form proceeds but warning is logged
- Pass criteria: `forgeSuspicion: true` in `partOcrResults`, warning rendered in UI, tech can still complete receiving (warning, not block — forgery determination is human judgment, not system judgment)

**Cilla sign-off:** All 4 cases PASS. FR-023 (handwritten annotation flag) logged as v1.3 enhancement — not a blocker.

---
---

# FEATURE 2: Pilot Notification Log (§135.65 Compliance)

**Requested by:** Priya Sharma, High Desert Charter Services, Scottsdale AZ  
**Confirmed regulatory requirement by:** Marcus Webb, Chief Compliance Officer  
**Regulatory surface:** 14 CFR §135.65 — Reporting mechanical irregularities

---

## Background

§135.65 requires that Part 135 certificate holders maintain a record of mechanical irregularities affecting airworthiness and that the pilot in command is notified of any defect or irregularity found during maintenance. For solo shops like Priya's, this notification has historically been a phone call or a text message. The regulation requires a record of the notification. The text message thread is not a record that will survive an FSDO audit.

Priya's existing process: text the chief pilot, get a thumbs-up, file nothing. When the FSDO asks to see the maintenance irregularity notification log, Priya produces a folder of paper note cards. This is technically compliant but operationally fragile.

---

## Implementation

### Schema: `convex/schema.ts`

```typescript
export const pilotNotificationLog = defineTable({
  workOrderId: v.id("workOrders"),
  pilotName: v.string(),
  pilotCertNumber: v.string(),             // ATP or Commercial cert number
  notificationMethod: v.union(
    v.literal("phone"),
    v.literal("in_person"),
    v.literal("text_message"),
    v.literal("email"),
    v.literal("platform_message")          // Future: in-app messaging
  ),
  notificationTimestamp: v.number(),       // Unix timestamp, required
  maintenanceDescription: v.string(),      // Free text: what was found and what was done
  notifiedBy: v.id("users"),              // The IA who made the notification
  acknowledgmentTimestamp: v.optional(v.number()),
  acknowledgmentMethod: v.optional(v.union(
    v.literal("verbal"),
    v.literal("written"),
    v.literal("platform_ack")
  )),
  workOrderOperatorType: v.literal("part_135"), // Enforced: only Part 135 WOs
}).index("by_workorder", ["workOrderId"])
  .index("by_pilot", ["pilotName", "pilotCertNumber"]);
```

### Mutation: `convex/pilotNotifications.ts`

```typescript
export const recordPilotNotification = mutation({
  args: {
    workOrderId: v.id("workOrders"),
    pilotName: v.string(),
    pilotCertNumber: v.string(),
    notificationMethod: v.union(
      v.literal("phone"),
      v.literal("in_person"),
      v.literal("text_message"),
      v.literal("email"),
      v.literal("platform_message")
    ),
    notificationTimestamp: v.number(),
    maintenanceDescription: v.string(),
    acknowledgmentTimestamp: v.optional(v.number()),
    acknowledgmentMethod: v.optional(v.union(
      v.literal("verbal"),
      v.literal("written"),
      v.literal("platform_ack")
    )),
  },
  handler: async (ctx, args) => {
    // Guard: only available for Part 135 work orders
    const wo = await ctx.db.get(args.workOrderId);
    if (!wo || wo.operatorType !== "part_135") {
      throw new Error("Pilot notification log is only available for Part 135 work orders.");
    }

    // Guard: WO must not already have RTS authorized
    if (wo.rtsAuthorizedAt) {
      throw new Error("Cannot add pilot notification after RTS has been authorized.");
    }

    const notifiedBy = await getCurrentUser(ctx);
    
    return await ctx.db.insert("pilotNotificationLog", {
      workOrderId: args.workOrderId,
      pilotName: args.pilotName,
      pilotCertNumber: args.pilotCertNumber,
      notificationMethod: args.notificationMethod,
      notificationTimestamp: args.notificationTimestamp,
      maintenanceDescription: args.maintenanceDescription,
      notifiedBy: notifiedBy._id,
      acknowledgmentTimestamp: args.acknowledgmentTimestamp,
      acknowledgmentMethod: args.acknowledgmentMethod,
      workOrderOperatorType: "part_135",
    });
  }
});

// Query used by pre-RTS guard
export const getNotificationForWorkOrder = query({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pilotNotificationLog")
      .withIndex("by_workorder", q => q.eq("workOrderId", args.workOrderId))
      .first();
  }
});
```

### RTS Guard Integration

```typescript
// convex/workOrders.ts — authorizeRTS mutation (modification)
export const authorizeRTS = mutation({
  args: { workOrderId: v.id("workOrders") },
  handler: async (ctx, args) => {
    const wo = await ctx.db.get(args.workOrderId);
    
    if (wo.operatorType === "part_135") {
      const notification = await ctx.db
        .query("pilotNotificationLog")
        .withIndex("by_workorder", q => q.eq("workOrderId", args.workOrderId))
        .first();
      
      if (!notification) {
        throw new Error(
          "RTS cannot be authorized for Part 135 work orders until a pilot notification has been recorded. " +
          "Required by 14 CFR §135.65."
        );
      }
    }
    
    // ... proceed with RTS authorization
  }
});
```

### UI: WO Close Flow (Part 135 Only)

The pilot notification panel is inserted into the WO close flow between "Pre-close checklist complete" and "Authorize RTS." It is shown only when `workOrder.operatorType === "part_135"`.

```tsx
// components/PilotNotificationPanel.tsx
export function PilotNotificationPanel({ workOrderId }: { workOrderId: Id<"workOrders"> }) {
  const existing = useQuery(api.pilotNotifications.getNotificationForWorkOrder, { workOrderId });
  
  if (existing) {
    return <PilotNotificationRecord entry={existing} />;
  }
  
  return (
    <div className="pilot-notification-required">
      <h3>Pilot Notification Required — §135.65</h3>
      <p>
        This is a Part 135 work order. A pilot notification record is required 
        before Return to Service can be authorized.
      </p>
      <PilotNotificationForm workOrderId={workOrderId} />
    </div>
  );
}
```

---

## Priya's UAT: First Part 135 Work Order Through Athelon

**Work Order:** WO-HDS-004  
**Aircraft:** N3347K (PA-44-180 Seminole)  
**Discrepancy:** Left engine oil leak — found cracked oil sump gasket, replaced per CMM  
**Chief Pilot notified:** Captain Jack Delgado, ATP cert # 3847291, by phone at 14:32

Priya ran her first Part 135 work order through Athelon on 2026-03-09, Sprint 3 ship day.

She had been doing Part 91 WOs for two weeks. The form was familiar. When she reached the close step for WO-HDS-004, a new panel appeared:

> **Pilot Notification Required — §135.65**  
> This is a Part 135 work order. A pilot notification record is required before Return to Service can be authorized.

Priya filled in:
- Pilot: Jack Delgado / cert 3847291
- Method: Phone
- Timestamp: 2026-03-09T14:32:00
- Description: "Oil sump gasket found cracked, replaced per CMM Rev 7. Left engine oil system tested and confirmed serviceable. No further defects noted."
- Acknowledgment: Verbal, same call

She confirmed and the RTS button became active.

**Priya's reaction:**

> "I've been doing this in a notebook for six years. Not because it wasn't a requirement — because there was nowhere in any system I used to record it that made any sense. I used to photograph the note card and email it to myself. Now it's just... in the record. It's part of the work order. It's exactly where it should be. The FSDO asks for the maintenance irregularity notification log, I open the work order. Done."

Then: "Can I show this to Jack? He's been asking me for years why I have to text him from a maintenance system."

---

## Marcus Compliance Statement: §135.65 and the Road Map

### What This Satisfies

§135.65(a) requires Part 135 certificate holders to keep a record of mechanical irregularities that affect airworthiness. §135.65(b) requires that the pilot in command be given a copy of or access to those records before flight. The pilot notification log as implemented directly satisfies the recording obligation: it creates an immutable, timestamped, IA-attributed record of the notification with method, description, and acknowledgment. The record is linked to the work order, which is linked to the aircraft.

For an operator the size of High Desert Charter Services, with one IA and one chief pilot, the notification is typically verbal. The log records that it happened, when it happened, and who was told. This is what §135.65 requires of the record. **The pilot notification log satisfies the recording requirement of §135.65.**

### What's Still Missing for Full Part 135 Compliance (Road Map, Not a Blocker)

**1. Pilot Access to Records (§135.65(b))**  
The regulation requires the pilot to have access to the records before flight. Currently, the notification log is accessible to the IA in the maintenance record. The pilot cannot log into Athelon and see it. A read-only pilot portal (scoped to aircraft and work order records for the relevant certificate holder) is needed. **v2.0 scope.**

**2. MEL Integration (§135.179)**  
Part 135 operators with approved MELs need to record deferral decisions and MEL item tracking. This is a separate compliance surface from §135.65 but is adjacent to the WO close flow. **v2.0 scope.**

**3. Air Carrier Reporting (§135.415)**  
Large Part 135 operators may have ASAP or safety reporting obligations that tie to maintenance findings. Athelon has no mechanism for this. **Out of scope — not relevant to single-pilot charter operators at current scale.**

**4. Certificate Holder Record Separation**  
If Priya's shop grows to multiple IAs, the notification log needs to distinguish between the certificate holder's maintenance records and the individual IA's records. The current schema handles this correctly (notifiedBy links to the IA user) but the UI should make this more explicit. **v1.3 scope.**

---

## Cilla's Test Plan: 4 Cases

**TC-PNL-01: Part 91 — Log Absent and Correct**
- Scenario: WO with `operatorType: "part_91"`, RTS authorization attempted
- Expected: No pilot notification panel shown in close flow, RTS proceeds without notification record, `pilotNotificationLog` table has no entry for this WO
- Pass criteria: RTS mutation succeeds; `recordPilotNotification` mutation rejects with "only available for Part 135" error if called directly

**TC-PNL-02: Part 135 — Log Required and Blocks RTS**
- Scenario: WO with `operatorType: "part_135"`, RTS attempted before notification recorded
- Expected: Pilot notification panel shown in close flow, RTS button disabled, `authorizeRTS` mutation throws with §135.65 message if called directly
- Pass criteria: RTS mutation rejects; after notification recorded, RTS mutation succeeds

**TC-PNL-03: Notification Method Validation**
- Scenario: Attempt to record notification with invalid method value
- Expected: Mutation rejects at Convex validator level
- Pass criteria: Only `phone | in_person | text_message | email | platform_message` accepted; any other value throws validation error

**TC-PNL-04: Audit Trail Completeness**
- Scenario: Full Part 135 WO lifecycle — create, execute, record notification, authorize RTS
- Expected: `pilotNotificationLog` entry contains: workOrderId, pilotName, pilotCertNumber, notificationMethod, notificationTimestamp, maintenanceDescription, notifiedBy (linked to IA user), optional acknowledgment fields. `workOrders` record has `rtsAuthorizedAt` timestamp.
- Pass criteria: Exported PDF of WO includes pilot notification section. All fields populated. IA identity traceable to `users` table. Audit trail is complete without gap.

**Cilla sign-off:** All 4 cases PASS. Part 135 RTS block is hard — confirmed at mutation level, not only UI level. Marcus compliance clearance: GRANTED.

---

## Sprint 3 Completion Summary

| Feature | Owner | Status | UAT | Compliance |
|---|---|---|---|---|
| 8130-3 OCR for Parts Receiving | Devraj + Chloe | ✅ SHIPPED | Teresa: ACCEPTS (1 enhancement logged FR-023) | Marcus: Block 17 guard PASS |
| Pilot Notification Log (§135.65) | Devraj + Chloe | ✅ SHIPPED | Priya: ACCEPTS (first Part 135 WO complete) | Marcus: §135.65 recording requirement SATISFIED |

**Sprint 3: DONE. v1.2 is complete.**
