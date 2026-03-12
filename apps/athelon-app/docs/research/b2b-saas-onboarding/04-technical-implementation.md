# B2B SaaS Onboarding: Technical Implementation, Tools & Architecture

**Research date:** 2026-03-12
**Focus:** Technical patterns, tooling decisions, and architecture choices for onboarding infrastructure

---

## 1. Onboarding Infrastructure Patterns

### Feature Flags for Onboarding States

Feature flags are the primary mechanism for controlling which onboarding experience a given user or organization sees. The pattern separates deployment from release: a new onboarding flow can be deployed to production but only activated for a specific cohort.

**Key patterns:**

- **Onboarding variant flags** — a single flag with multiple string variants (`"v1"`, `"v2"`, `"control"`) routes users to different flow implementations. The flag is evaluated at session start and the result stored in React context so downstream components can render accordingly without re-evaluating on every render.
- **Org-scoped vs. user-scoped flags** — B2B platforms typically evaluate flags at two levels. Organization-level flags control account-wide features (e.g., "show setup wizard"). User-level flags control individual experiences (e.g., "show role-selection screen"). Flags at the org level prevent split experiences within a shared workspace.
- **Progressive rollout flags** — onboarding changes are gated at 5%, 20%, 50%, 100% rollout percentages. Rollout is paused if error rates or activation drop in the cohort.
- **Permanent kill switches** — some flags are never removed; they stay as permanent circuit breakers for disabling broken onboarding steps without a deploy.

**Popular implementations:** LaunchDarkly, PostHog Feature Flags, GrowthBook (open source), Unleash (self-hosted), or a custom Convex-backed implementation for smaller teams.

**Convex-native pattern:** Store flag definitions in a `featureFlags` table keyed by `orgId` and `flagKey`. A `useQuery(api.featureFlags.getForOrg, { orgId })` hook resolves the flag set at the provider level; downstream components read from context rather than hitting the DB per component.

### User State Machines

Onboarding flows are inherently stateful. Modeling them as explicit state machines rather than booleans prevents impossible states (e.g., a user in both "email_verified" and "pending_verification" simultaneously).

**Recommended state machine structure for a B2B onboarding flow:**

```
STATES:
  not_started
  account_created         (user registered, org not yet configured)
  org_configured          (org name, industry, team size set)
  role_selected           (user's role within org confirmed)
  first_action_completed  (first meaningful product action taken)
  activated               (aha moment reached — definition varies by product)
  churned_during_onboarding

TRANSITIONS:
  not_started -> account_created          (on: signup_completed)
  account_created -> org_configured       (on: org_setup_submitted)
  org_configured -> role_selected         (on: role_confirmed)
  role_selected -> first_action_completed (on: activation_event_fired)
  first_action_completed -> activated     (on: secondary_activation_event_fired)
  any_state -> churned_during_onboarding  (on: 14_day_inactivity_timer)
```

**XState** is the most mature React-compatible state machine library. For simpler flows, a plain `useReducer` with a typed `OnboardingState` discriminated union achieves the same guarantees without the XState learning curve.

For Convex, the canonical approach is to store the current state string in the `organizations` or `users` table and perform transitions via mutations that validate the current state before writing the new one.

### Onboarding Progress Tracking in the Database

**Recommended schema (Convex-style):**

```typescript
// onboardingProgress table
{
  orgId: Id<"organizations">,
  userId: Id<"users">,
  currentStep: string,          // e.g. "role_selected"
  stepsCompleted: string[],     // append-only log
  checklistItems: {
    itemKey: string,
    completedAt: number | null
  }[],
  activationEventFiredAt: number | null,
  startedAt: number,
  lastActivityAt: number,
  onboardingVariant: string,    // for A/B testing
}
```

**Design principles:**

- Store `stepsCompleted` as an append-only array rather than overwriting `currentStep` — this enables funnel drop-off analysis even when users skip steps.
- Track `lastActivityAt` separately from step timestamps to support re-engagement triggers.
- Store `onboardingVariant` with the progress record so analytics can segment by experiment arm.
- For orgs with multiple users, maintain both an org-level and user-level progress record. Org-level tracks setup completion; user-level tracks each member's personal activation journey.

---

## 2. Event Tracking for Onboarding

### Critical Events to Instrument

Every meaningful step should fire a named event. The goal is to be able to answer: "At which step do users stop making progress?"

**Acquisition/Signup:**
- `signup_started` — user opens signup form
- `signup_completed` — account created, user confirmed
- `email_verified` — email verification link clicked

**Setup/Configuration:**
- `org_setup_started` — user reaches org setup screen
- `org_setup_completed` — org configured (name, industry, etc.)
- `team_invitation_sent` — admin invited a colleague
- `role_selection_completed` — user confirmed their role

**First-Value / Activation:**
- `first_[core_action]_created` — user performs the primary action (e.g., `first_work_order_created`)
- `onboarding_checklist_opened`
- `onboarding_checklist_item_completed` (with `itemKey` property)
- `onboarding_checklist_dismissed`
- `product_tour_started`, `product_tour_step_viewed`, `product_tour_completed`, `product_tour_skipped`

**Re-engagement:**
- `re_engagement_email_opened`
- `re_engagement_cta_clicked`
- `session_started_after_inactivity` (with `days_inactive` property)

### Analytics Funnel Setup

Use an analytics platform (Amplitude, Mixpanel, PostHog) to build the canonical onboarding funnel as a saved report:

```
signup_completed
  -> org_setup_completed
    -> role_selection_completed
      -> first_[core_action]_created
        -> activation_event_fired
```

Measure:
- **Step conversion rates** — percentage of users who complete each transition
- **Time between steps** — median and 75th-percentile lag at each step
- **Drop-off by cohort** — segment by acquisition channel, plan tier, org size, role

**PostHog** and **Amplitude** both provide funnel visualization out of the box. Both also support retroactive funnel analysis when new events are added, which is essential during iterative onboarding work.

---

## 3. Onboarding Tools and Platforms

### Third-Party Tool Overview

| Tool | Best For | Starting Price | Key Limitations |
|---|---|---|---|
| **Userpilot** | All-in-one: in-app UX + analytics + NPS | $299/mo (2k MAU) | Pricier at scale |
| **Appcues** | No-code tours, easy setup | $300/mo | Analytics limited to flows only; no server-side event triggers |
| **Pendo** | Enterprise analytics depth | ~$48k/year median | Very expensive; individual features cost extra |
| **Intercom Product Tours** | Teams already using Intercom | $99/mo base | Linear tours only; styling requires code; per-message fees |
| **Chameleon** | Flexible, developer-friendly | $279/mo | Smaller ecosystem |
| **UserGuiding** | Budget no-code option | $89/mo | Less mature analytics |
| **Userflow** | Lightweight, logic-based tours | $240/mo | Narrower feature set |
| **WalkMe** | Large enterprise DAP | Custom ($40k+/year) | Over-engineered for most products |
| **Shepherd.js / Intro.js** | Self-hosted, open source | Free | Requires engineering investment; no analytics |

### Tool Selection Criteria

- **MAU pricing sensitivity** — Appcues, Userpilot, and Userflow all charge by monthly active users. At >10k MAUs the economics change significantly.
- **Event trigger capability** — some tools (Appcues) only trigger on client-side DOM events. If onboarding flows need to respond to server-side events (e.g., "file uploaded", "colleague accepted invite"), ensure the tool supports webhook or API-driven triggers.
- **Analytics integration depth** — tools with native analytics (Userpilot, Pendo) reduce the need for a separate analytics stack but may create data silos.
- **CSS customization** — Intercom Product Tours require coding to override styles. Most other tools have WYSIWYG theming.

---

## 4. Build vs. Buy Decision

### When to Buy a Third-Party Tool

- Team has fewer than 3 frontend engineers — the opportunity cost of building is too high
- Product is pre-product-market fit — onboarding will change every sprint; a no-code tool lets non-engineers iterate
- Need in-app tours in weeks, not months
- Budget allows >$300/month and MAU growth is predictable
- The product's visual language is close to generic enough that a third-party widget won't look jarring

### When to Build Native Onboarding

- The onboarding experience is a core product differentiator (e.g., a highly automated setup wizard that configures the product from existing data)
- The product has complex multi-tenant logic (org-level + user-level + role-level onboarding states) that third-party tools cannot model
- The app already has a robust state management layer where onboarding state fits naturally
- Engineering capacity exists and the team wants full control over analytics, A/B testing, and persistence
- Third-party scripts introduce unacceptable performance or security overhead (common in regulated industries)
- MAU volume makes third-party tool pricing prohibitive (>$2k/month)

### Hybrid Approach

A common pattern is to build the core onboarding flow natively (the checklist, setup wizard, activation tracking) while using a lightweight third-party tool for contextual tooltips and one-off feature announcements. This avoids the tool becoming the foundation of a complex state machine while still saving engineering time on low-stakes in-app guidance.

**Rule of thumb:** Build state, buy presentation. The source of truth for "where is this user in onboarding" should always live in your own database. Third-party tools should read that state via user properties to personalize their widgets — they should not be the system of record.

---

## 5. In-App Messaging and Guidance

### UI Pattern Reference

**Tooltips** — hover-triggered text labels adjacent to UI elements. Best for labeling non-obvious controls. Should not substitute for clear UI copy. Keep to <80 characters.

**Hotspots / Beacons** — pulsing dot indicators on UI elements signaling that something is new or requires attention. Lower cognitive load than modals; good for feature discovery without interrupting flow.

**Modals** — full-focus overlays that dim the background. Reserve for high-stakes moments: first login, critical setup steps, important announcements. Modal fatigue sets in quickly if overused. One modal per session maximum during onboarding.

**Slideouts / Drawers** — partial-screen overlays from edge of screen. Less intrusive than modals; good for contextual help panels or multi-step micro-wizards that don't need to block the UI.

**Banners** — persistent top-of-page strips. Best for time-sensitive alerts or incomplete-action reminders (e.g., "You haven't verified your email — resend link"). Dismissible, with the dismissed state stored in the DB to prevent re-display.

**Checklists** — task lists shown in a sidebar widget or modal. The most consistently effective onboarding UI pattern across B2B SaaS. Completion percentage acts as a progress bar. Include 4–7 items maximum.

**Empty States** — the first view before any data exists. Should include a clear CTA, brief explanation of what the screen does, and optionally sample/demo data. Never show a blank table with no guidance.

### Implementation Approach (React/TypeScript)

```typescript
// Pattern: Onboarding context drives all in-app guidance
const OnboardingContext = createContext<OnboardingState | null>(null);

// Checklist item component reads completion from context
function ChecklistItem({ itemKey }: { itemKey: string }) {
  const { completedItems } = useOnboarding();
  return (
    <div className={completedItems.includes(itemKey) ? "completed" : "pending"}>
      ...
    </div>
  );
}

// Tooltip wrapper that auto-hides after first interaction
function OnboardingTooltip({ stepKey, children, content }) {
  const { hasCompletedStep } = useOnboarding();
  if (hasCompletedStep(stepKey)) return children;
  return <TooltipPrimitive content={content}>{children}</TooltipPrimitive>;
}
```

---

## 6. Email and Drip Sequences During Onboarding

### Sequence Architecture

B2B SaaS onboarding email sequences combine two types of emails that run concurrently:

**Time-based drip (scheduled from signup):**
- T+0h: Welcome email — confirms account, sets expectations, single CTA to "complete setup"
- T+1d: "Getting started" — 3 things to do first, links to key screens
- T+3d: Feature spotlight — one high-value feature with use case framing
- T+7d: Social proof — customer story relevant to their industry/role
- T+14d: Check-in / re-engagement — direct question, offer of human support

**Event-triggered (behavioral, asynchronous):**
- `org_setup_not_completed` after 24h → "Your account setup is incomplete" reminder
- `first_core_action_not_fired` after 48h → "Here's how to [core action]" tutorial email
- `team_invitation_not_sent` after 72h → "Invite your team" nudge
- `activation_event_fired` → "Congrats" confirmation + suggested next step
- `no_login_for_7d` → Re-engagement with personalized recap of what they haven't tried

**Technical setup:**
- Event-triggered emails require a webhook or API call from the app to the email platform (Customer.io, Klaviyo, Braze, or Intercom) when the triggering event occurs.
- Use Convex scheduled functions (`ctx.scheduler.runAt`) to implement time-based follow-ups that are cancelled if the user completes the action first — this prevents sending "you haven't done X" when the user just did X an hour ago.

### B2B-Specific Considerations

- Send onboarding emails to the account admin initially, not all members — admins own the setup process.
- Once the admin activates, trigger a separate "your team is ready" sequence to invited members.
- Consider sending from a named person (CEO, CS lead) rather than `noreply@` — reply rates and engagement are meaningfully higher.

---

## 7. Onboarding State Management

### Org-Level vs. User-Level State

B2B onboarding operates on two axes that must be tracked independently:

**Org-level onboarding state** — "Has this organization completed initial setup?" This is a singleton per org and gates the full product experience. Admin completes this; other users inherit the result.

**User-level activation state** — "Has this individual reached their personal aha moment?" Each user in the org has their own activation journey. A user who joins a fully-configured org still needs a first-login walkthrough.

### Handling Partial Completion and Resumability

- Never clear progress on navigation — if a user abandons the setup wizard at step 3, step 3 should be pre-populated next time they open it.
- Store form values in the DB as the user types, not only on submit. Use Convex optimistic mutations to save intermediate state without blocking the UI.
- On session start, check the user's `currentStep` from the DB and deep-link them into the wizard at the correct step rather than restarting.
- Checklist items should be individually completable in any order. Track each with its own `completedAt` timestamp. Do not require sequential completion.

### Resumability Pattern (Convex + React Router)

```typescript
// On app load, resolve where user is in onboarding
function OnboardingGate({ children }) {
  const progress = useQuery(api.onboarding.getProgress);
  const navigate = useNavigate();

  useEffect(() => {
    if (progress && !progress.activationEventFiredAt) {
      const resumeStep = getResumeRoute(progress.currentStep);
      if (resumeStep) navigate(resumeStep, { replace: true });
    }
  }, [progress]);

  return children;
}
```

---

## 8. Role-Based Onboarding Routing

### Serving Different Paths by Role/Persona

In a B2B product with multiple personas (admin, manager, technician, read-only user, etc.), onboarding must diverge immediately after signup or role confirmation.

**Routing decision point:** Immediately after the user confirms their role, store it to the DB and redirect to a role-specific onboarding route.

**Common patterns:**

- **Admin path** — org configuration, team invitation, billing/plan selection, integration setup
- **Manager path** — team management, reporting setup, workflow configuration
- **End-user path** — personal workspace setup, core task tutorial, notification preferences

**Implementation approach:**

```typescript
function useOnboardingRoute(role: UserRole): string {
  const routes: Record<UserRole, string> = {
    admin: "/onboarding/setup/org",
    shop_manager: "/onboarding/setup/workflows",
    technician: "/onboarding/setup/first-task",
    read_only: "/onboarding/setup/explore",
  };
  return routes[role] ?? "/onboarding/setup/default";
}
```

Each role-specific route renders a different checklist, different tooltips, and a different set of activation events that define "done".

**Persona questionnaire alternative:** If role is not known at signup (e.g., anyone can sign up), use a 2–3 question persona survey at first login to infer the appropriate path. Store the response in user properties immediately so the routing is persistent across sessions.

---

## 9. A/B Testing Onboarding Flows

### Experiment Design Principles

- Test one variable at a time: do not simultaneously change copy, step order, and completion criteria.
- Define the primary metric before running the experiment (activation rate, not "engagement").
- Set a minimum sample size before analyzing results — underpowered tests produce false positives. For onboarding experiments, typically 200–500 activations per variant minimum.
- Avoid testing on the entire user base simultaneously — run at 50% exposure maximum to limit downside risk.

### Feature Flag Integration

Onboarding A/B tests are implemented as feature flags with variants:

```typescript
// Evaluate variant at session start, store in onboarding progress record
const variant = await getFeatureFlagVariant("onboarding_v2_test", {
  orgId,
  userId,
});
// Variants: "control" | "shorter_checklist" | "video_welcome"

// Store variant with progress so analytics can segment
await createOnboardingProgress({ orgId, userId, onboardingVariant: variant });
```

**Critical:** The variant assignment must be made once per user and persisted. Do not re-evaluate on every page load — this causes users to flip between experiences.

### Guardrail Metrics

Always monitor secondary metrics alongside the primary:
- Error rates on onboarding screens
- Support ticket volume from new users
- Time to first support contact
- Day-7 retention

If any guardrail metric degrades in the test arm, pause the experiment regardless of the primary metric result.

---

## 10. Webhook and Integration Patterns

### Triggering External Systems from Onboarding Progress

B2B onboarding events should trigger downstream CRM and customer success tooling to create visibility for the sales and CS teams.

**Common webhook trigger points:**
- `org_setup_completed` → create/update company record in HubSpot/Salesforce with setup status
- `activation_event_fired` → move deal to "Activated" stage in CRM; assign CS owner
- `first_team_invitation_sent` → log collaboration signal
- `day_7_not_activated` → create task for CS rep to reach out
- `onboarding_checklist_completed` → trigger success email from CS rep

**Implementation (Convex Actions):**

```typescript
// convex/webhooks.ts
export const notifyCrmOnActivation = internalAction({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const org = await ctx.runQuery(api.organizations.get, { orgId });
    await fetch("https://api.hubspot.com/crm/v3/...", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}` },
      body: JSON.stringify({ properties: { onboarding_status: "activated" } }),
    });
  },
});
```

Call `internalAction` from within onboarding mutations when state transitions occur.

---

## 11. Data Seeding and Sample Data

### Empty States vs. Pre-populated Demo Data

**The empty state problem:** A new user who sees an empty dashboard immediately faces decision paralysis. The product looks broken or incomplete. This is especially damaging in B2B apps where the value proposition requires seeing data in context.

**Two strategies:**

**Strategy A: Inline empty state guidance**
- Each empty screen has a clear illustration, a one-sentence explanation of what belongs here, and a primary CTA
- Low implementation cost; works well when the first action is simple and the reward is immediate
- Recommended for: simple products, product-led growth, self-service

**Strategy B: Pre-populated sample data**
- On org creation, run a seeding function that populates the account with realistic but fake data
- Users can explore the product with real UI patterns before committing to data entry
- Recommended for: complex products, high setup cost, enterprise
- Requires a "clear sample data" mechanism and clear labeling so users know what is demo vs. real

**Convex seed pattern:**

```typescript
// convex/onboarding.ts
export const seedDemoData = internalMutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    // Insert sample records with isDemoData: true flag
    await ctx.db.insert("workOrders", {
      orgId,
      title: "Sample: Engine inspection - N12345",
      isDemoData: true,
      // ...
    });
  },
});
```

Filter `isDemoData: true` records out of production views once the user creates real data, or provide a toggle to show/hide demo data.

---

## 12. React/TypeScript/Convex Stack Patterns

### Patterns Well-Suited to This Stack

**Convex real-time for live checklist completion:**
Because Convex queries are reactive, a checklist component can subscribe to onboarding progress with `useQuery` and update in real time — if a background action completes a step (e.g., an API call finishes), the checklist reflects it without a manual refresh. This makes it trivially easy to build "complete this step from anywhere in the app" checklist mechanics.

**Convex scheduled functions for time-based follow-ups:**
```typescript
// Schedule re-engagement check 7 days after signup
await ctx.scheduler.runAfter(
  7 * 24 * 60 * 60 * 1000,
  internal.onboarding.checkActivationStatus,
  { orgId, userId }
);
```
Cancel the scheduled job when the user activates to prevent sending stale emails.

**React compound components for onboarding UI:**
Build the onboarding wizard as composable pieces sharing implicit context. `OnboardingFlow` manages the current step index; each `OnboardingStep` renders conditionally. This pattern (from Kent C. Dodds' inversion of control) makes it easy to add, remove, or reorder steps without touching a monolithic wizard component.

**Role-gated checklist items:**
```typescript
function useOnboardingChecklist(role: UserRole): ChecklistItem[] {
  const allItems = useQuery(api.onboarding.getChecklistItems);
  return allItems?.filter(item =>
    item.requiredRoles.includes(role) || item.requiredRoles.length === 0
  ) ?? [];
}
```

**Clerk `publicMetadata` for lightweight onboarding flags:**
Clerk's `publicMetadata` on the user object is accessible client-side without a DB query. Store lightweight onboarding state here (e.g., `{ onboardingCompleted: true, variant: "v2" }`) for fast client-side routing decisions. For complex state, use Convex as the source of truth and sync key fields to Clerk metadata via a Convex action after state transitions.

---

## Summary: Decision Framework

| Dimension | Build | Buy |
|---|---|---|
| Team size | 4+ frontend engineers | <3 frontend engineers |
| Onboarding complexity | Multi-tenant, multi-role, server-side triggers | Simple linear tour |
| Iteration speed needed | Quarterly | Weekly |
| Budget | <$500/mo | $500–$2k/mo available |
| Analytics | Existing stack | Want out-of-the-box funnel analysis |
| Data sovereignty | Regulated industry (FAA, HIPAA, etc.) | General SaaS |

For a regulated MRO platform (FAA Part 145), building native onboarding is strongly preferred: the complexity of role-based routing (8 distinct roles), org-level vs. user-level activation, and the need to not introduce third-party JavaScript that could compromise audit logging or security posture all point toward a custom implementation backed by Convex with React compound components.

---

## Sources

- Userpilot blog — tool comparison and pricing data (userpilot.com/blog/saas-onboarding-tools/)
- Intercom blog — in-app guidance pattern taxonomy (intercom.com/blog/product-tours/)
- UserGuiding blog — platform overview and setup patterns (userguiding.com)
- Kent C. Dodds — inversion of control and compound component patterns (kentcdodds.com/blog/inversion-of-control)
- Convex documentation — mutation/query/scheduler architecture (docs.convex.dev)
- Chameleon blog — segmentation and A/B variation concepts (chameleon.io/blog)
- Customer.io — lifecycle automation and journey tooling (customer.io)
