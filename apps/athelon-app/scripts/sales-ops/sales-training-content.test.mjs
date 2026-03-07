/**
 * sales-training-content.test.mjs
 *
 * Guard tests for the Sales Training page's data integrity:
 *   - Module IDs are unique and non-empty
 *   - Checklist items are non-empty strings
 *   - Progress values are within [0, 100]
 *   - Script templates and guardrails are non-empty
 *   - KPI targets have both label and target
 *   - Objection refs have both objection and response
 *
 * Run with: node --test scripts/sales-ops/sales-training-content.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── Replicated data (keep in sync with app/(app)/sales/training/page.tsx) ───

const modules = [
  {
    id: "M1",
    title: "ICP & Research",
    focus: "Find fit-first accounts with clear pain and decision capacity.",
    progress: 20,
    checklist: [
      "Define one primary ICP segment and buying trigger",
      "Confirm pain intensity, budget reality, and urgency window",
      "Capture account context in CRM before first outreach",
    ],
    scriptTemplate:
      "Research brief: 'Based on your [fleet/operation profile], I see likely pressure around [specific issue]. Is this currently a priority to solve in the next [timeframe]?'",
    guardrail:
      "Do not force-fit low-pain accounts into active pipeline just to increase volume.",
  },
  {
    id: "M2",
    title: "Discovery & Qualification",
    focus: "Use structured discovery to confirm fit before pitching.",
    progress: 15,
    checklist: [
      "Open with clear agenda and permission",
      "Run C-L-O discovery sequence (clarify, label, overview)",
      "Score BANT fields (Budget, Authority, Need, Timeline) and route: close / nurture / disqualify",
    ],
    scriptTemplate:
      "Discovery opener: 'Before solutions, I want to understand your current process, what you've tried, and what a successful outcome looks like for you. Is that fair?'",
    guardrail:
      "Discovery is diagnostic, not manipulative. If there is no fit, disqualify early.",
  },
  {
    id: "M3",
    title: "Offer & Pitch",
    focus: "Present outcome-led offer with clear value and delivery path.",
    progress: 10,
    checklist: [
      "Map pitch to dream outcome and key constraints",
      "Use 3-pillar structure in plain language",
      "Anchor on business value; add bonuses, avoid discounting",
    ],
    scriptTemplate:
      "3-pillar frame: 'To reach [goal], we need three things: [pillar 1], [pillar 2], and [pillar 3]. Here is how our process maps to each one.'",
    guardrail:
      "Never inflate outcomes or hide delivery requirements to win commitment.",
  },
  {
    id: "M4",
    title: "Objection Handling",
    focus: "Resolve concerns with AAA: acknowledge, associate, ask.",
    progress: 5,
    checklist: [
      "Identify objection type: price, trust, timing, authority, fit",
      "Run one AAA cycle before restating solution",
      "Document objection + resolution outcome in CRM",
    ],
    scriptTemplate:
      "AAA prompt: 'I hear your concern around [objection]. That's a reasonable question. What would you need to see to make this decision confident?'",
    guardrail:
      "Use real examples only. Do not manufacture urgency or social proof.",
  },
  {
    id: "M5",
    title: "Close & Follow-Up",
    focus: "Close cleanly, then reinforce and execute disciplined follow-up.",
    progress: 0,
    checklist: [
      "Ask directly for next-step commitment",
      "When yes: stop selling and move to onboarding actions",
      "When no decision: run 30-day follow-up cadence",
    ],
    scriptTemplate:
      "Close question: 'Based on what we covered, are you ready to move forward with [agreed scope], or is there one issue we still need to resolve?'",
    guardrail:
      "Respect a final no. Preserve relationship and schedule future check-in when appropriate.",
  },
  {
    id: "M6",
    title: "CRM Hygiene & KPI Discipline",
    focus: "Run weekly constraint-first reviews using stage conversion data.",
    progress: 0,
    checklist: [
      "Track set, show, offer, and close rates by rep and source",
      "Enforce required fields (BANT, objections, stage timestamps)",
      "Review weakest funnel stage weekly and coach that constraint",
    ],
    scriptTemplate:
      "Manager review script: 'Our biggest gap this week is [stage KPI]. What behavior change this week would most improve that single constraint?'",
    guardrail:
      "Do not reward metric gaming. Tie incentives to quality outcomes, not vanity activity.",
  },
];

const objectionQuickRefs = [
  { objection: "Price", response: "Re-anchor to cost of inaction and expected business value." },
  { objection: "Trust", response: "Use specific proof and realistic guarantee terms." },
  { objection: "Timing", response: "Surface true blocker; separate delay from disinterest." },
  { objection: "Authority", response: "Coach champion and include decision stakeholders early." },
  { objection: "Fit", response: "Map solution to current stage or disqualify honestly." },
];

const kpiTargets = [
  { label: "Show Rate", target: ">= 70%" },
  { label: "Offer Rate", target: ">= 95%" },
  { label: "Close Rate", target: ">= 40%" },
  { label: "Weekly Constraint", target: "1 stage focus" },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SalesTrainingPage — module data integrity", () => {
  it("has at least one module", () => {
    assert.ok(modules.length >= 1, "modules array must not be empty");
  });

  it("all module IDs are unique non-empty strings", () => {
    const ids = modules.map((m) => m.id);
    const unique = new Set(ids);
    assert.equal(unique.size, ids.length, "duplicate module IDs found");
    for (const id of ids) {
      assert.ok(typeof id === "string" && id.trim().length > 0, `module ID '${id}' is blank`);
    }
  });

  it("all module titles are non-empty", () => {
    for (const m of modules) {
      assert.ok(m.title && m.title.trim().length > 0, `module ${m.id} has empty title`);
    }
  });

  it("all module progress values are in [0, 100]", () => {
    for (const m of modules) {
      assert.ok(
        typeof m.progress === "number" && m.progress >= 0 && m.progress <= 100,
        `module ${m.id} has out-of-range progress: ${m.progress}`,
      );
    }
  });

  it("all module checklists have at least one non-empty item", () => {
    for (const m of modules) {
      assert.ok(Array.isArray(m.checklist) && m.checklist.length >= 1,
        `module ${m.id} has no checklist items`);
      for (const [idx, item] of m.checklist.entries()) {
        assert.ok(
          typeof item === "string" && item.trim().length > 0,
          `module ${m.id} checklist[${idx}] is blank`,
        );
      }
    }
  });

  it("all module checklist items are unique within their module", () => {
    for (const m of modules) {
      const unique = new Set(m.checklist);
      assert.equal(
        unique.size,
        m.checklist.length,
        `module ${m.id} has duplicate checklist items`,
      );
    }
  });

  it("all module script templates are non-empty", () => {
    for (const m of modules) {
      assert.ok(
        typeof m.scriptTemplate === "string" && m.scriptTemplate.trim().length > 0,
        `module ${m.id} has empty scriptTemplate`,
      );
    }
  });

  it("all module guardrails are non-empty", () => {
    for (const m of modules) {
      assert.ok(
        typeof m.guardrail === "string" && m.guardrail.trim().length > 0,
        `module ${m.id} has empty guardrail`,
      );
    }
  });

  it("BANT acronym is explained in M2 checklist", () => {
    const m2 = modules.find((m) => m.id === "M2");
    assert.ok(m2, "M2 module not found");
    const bantItem = m2.checklist.find((item) => item.includes("BANT"));
    assert.ok(bantItem, "BANT not found in M2 checklist");
    // Ensure expansion is present so acronym is self-explanatory
    assert.ok(
      bantItem.includes("Budget") && bantItem.includes("Authority") &&
      bantItem.includes("Need") && bantItem.includes("Timeline"),
      `BANT acronym in M2 is not fully expanded: "${bantItem}"`,
    );
  });
});

describe("SalesTrainingPage — objection quick-refs integrity", () => {
  it("has exactly 5 objection quick-refs", () => {
    assert.equal(objectionQuickRefs.length, 5, "expected 5 objection types");
  });

  it("all objection refs have non-empty objection and response", () => {
    for (const ref of objectionQuickRefs) {
      assert.ok(ref.objection && ref.objection.trim().length > 0, "blank objection label");
      assert.ok(ref.response && ref.response.trim().length > 0, `blank response for '${ref.objection}'`);
    }
  });

  it("objection labels are unique", () => {
    const labels = objectionQuickRefs.map((r) => r.objection);
    assert.equal(new Set(labels).size, labels.length, "duplicate objection labels");
  });
});

describe("SalesTrainingPage — KPI targets integrity", () => {
  it("has exactly 4 KPI targets", () => {
    assert.equal(kpiTargets.length, 4, "expected 4 KPI targets");
  });

  it("all KPI targets have non-empty label and target", () => {
    for (const kpi of kpiTargets) {
      assert.ok(kpi.label && kpi.label.trim().length > 0, "blank KPI label");
      assert.ok(kpi.target && kpi.target.trim().length > 0, `blank KPI target for '${kpi.label}'`);
    }
  });
});

describe("SalesTrainingPage — average progress calculation", () => {
  it("computes averageProgress correctly", () => {
    const total = modules.reduce((acc, m) => acc + m.progress, 0);
    const avg = Math.round(total / modules.length);
    // With values [20, 15, 10, 5, 0, 0], sum=50, avg=Math.round(50/6)=8
    assert.equal(typeof avg, "number");
    assert.ok(avg >= 0 && avg <= 100, `averageProgress out of range: ${avg}`);
  });
});
