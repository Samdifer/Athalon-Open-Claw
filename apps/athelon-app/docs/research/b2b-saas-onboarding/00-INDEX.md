# B2B SaaS Onboarding Research Corpus

**Date:** 2026-03-12
**Total corpus:** ~19,800 words across 5 research documents
**Purpose:** Comprehensive research on B2B SaaS onboarding best practices, pitfalls, and implementation strategies — with emphasis on vertical/industrial SaaS and Athelon's FAA Part 145 MRO context.

---

## Research Documents

| # | Document | Words | Focus |
|---|---|---|---|
| 01 | [Frameworks & Strategy](01-frameworks-and-strategy.md) | ~3,900 | Onboarding models (self-serve, high-touch, hybrid, PLG), TTV frameworks, "aha moment" identification, activation milestones, key metrics with benchmarks, top company examples (Slack, Notion, Figma, HubSpot, Salesforce), MRO-specific considerations |
| 02 | [UX Patterns & Design](02-ux-patterns-and-design.md) | ~4,050 | Welcome screens, setup wizards, checklists, tooltips, product tours, empty state design, progressive disclosure, personalization flows, multi-user invite UX, accessibility, anti-patterns, examples from Linear/Notion/Figma/Asana/Monday.com |
| 03 | [Pitfalls & Failure Modes](03-pitfalls-and-failure-modes.md) | ~3,990 | Why onboarding fails (40-60% never return), information overload, friction points, setup-vs-value trap, multi-stakeholder failures, data migration pitfalls, role-based complexity, onboarding debt, cultural resistance, case studies (EasyPark, Auth0, DashThis, HoneyBook), MRO-specific failure landscape |
| 04 | [Technical Implementation](04-technical-implementation.md) | ~3,455 | Onboarding state machines, feature flags, event tracking/analytics, tool comparison (Appcues/Pendo/Userpilot/etc.), build vs. buy decision, email drip sequences, role-based routing, A/B testing, data seeding, React/TypeScript/Convex-specific patterns |
| 05 | [Vertical & Enterprise Onboarding](05-vertical-and-enterprise-onboarding.md) | ~4,400 | Why vertical SaaS is harder (cold-start, regulatory, vocabulary, multi-role), aviation MRO landscape (CAMP/Quantum MX/ATP), phased rollouts, training/certification, customer success-driven onboarding, per-role activation milestones, case studies (Procore, Toast, ServiceTitan, Veeva), 8 synthesized principles for Athelon |

---

## Key Themes Across All Research

### 1. Time-to-Value Is Everything
Every document converges on the same core principle: onboarding is a race between friction and motivation. The product must deliver recognizable value before the user's motivation decays. For Athelon's MRO context, TTV is structurally long (60-180 days for full activation), making early "quick wins" critical to sustaining engagement.

### 2. The Cold-Start Problem Is Athelon's Central Challenge
Unlike horizontal SaaS where value is immediate, Athelon requires fleet data, customer records, parts inventory, and role assignments before the platform is useful. Every research stream identifies this as the #1 risk for vertical SaaS onboarding. Mitigations: sample/demo data, import-first flows, progressive value delivery, and minimum viable dataset definitions.

### 3. Multi-Role Onboarding Requires Sequenced Rollout
With 8 distinct roles (admin → shop_manager → qcm_inspector → technicians → parts_clerk → billing_manager), onboarding must cascade. Admin sets up org, then invites role-specific users who each get tailored onboarding paths. One non-adopting role can break entire workflows.

### 4. Regulatory Context Changes Everything
FAA Part 145 compliance means onboarding is not just a product event — it's a compliance event. The system must align with the shop's quality manual, training records, and FAA-approved procedures. This transforms onboarding from "try the product" to "qualify the system."

### 5. Build Native, Don't Buy
For a regulated MRO platform, third-party onboarding tools (Appcues, Pendo) add compliance risk and can't handle domain-specific state machines. The recommendation across documents: build onboarding state management natively in Convex, potentially use lightweight presentation tools for tooltips/tours only.

### 6. Paper-to-Digital Migration Is the Real Onboarding
Many target MRO shops are digitizing for the first time. They're not switching from a competitor — they're leaving paper. This requires change management, parallel running periods, champion identification, and paper-equivalent outputs (printable forms that mirror their existing paper processes).

### 7. Onboarding Anti-Patterns to Avoid
- Feature dumping on first login
- Mandatory video tours
- Generic flows that ignore user role
- Requiring full data entry before showing any value
- One-and-done onboarding with no re-engagement
- Treating onboarding as a one-time project rather than a maintained system

### 8. Activation Metrics Must Be Role-Specific
"Activated" means different things for different roles. An admin is activated when org setup is complete. A technician is activated when they've signed off their first task card. A QC inspector is activated when they've completed their first inspection approval. Define and track per-role activation milestones.

---

## Recommended Reading Order

1. Start with **01 (Frameworks)** for the strategic foundation
2. Read **05 (Vertical/Enterprise)** next for Athelon-specific context
3. Read **03 (Pitfalls)** to understand what to avoid
4. Read **02 (UX Patterns)** for design implementation guidance
5. Finish with **04 (Technical)** for architecture and tooling decisions
