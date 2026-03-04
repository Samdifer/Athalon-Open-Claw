# Phase 3 Test Import Path Fix
**Author:** Jonas Harker, DevOps / Platform
**For:** Cilla Oduya (QA), Devraj Anand (Backend)
**Date:** 2026-02-22
**Ref:** Phase 3 Gate Review, Blocker B-P3-03
**Priority:** HIGH — Zero tests pass until this is resolved

---

## Problem Statement

The Phase 3 gate review identified that **zero of the 43 test cases can currently execute**. The reason is a structural mismatch between the file paths the tests import from and the file paths where the mutations actually live.

### What the tests currently import

Cilla's test files import mutation handlers from a per-mutation file structure:

```typescript
// convex/workOrders.test.ts — current (BROKEN) imports
import { createWorkOrder } from "../../convex/mutations/workOrders/createWorkOrder";
import { openWorkOrder }   from "../../convex/mutations/workOrders/openWorkOrder";
import { closeWorkOrder }  from "../../convex/mutations/workOrders/closeWorkOrder";
import { voidWorkOrder }   from "../../convex/mutations/workOrders/voidWorkOrder";
import { listWorkOrders }  from "../../convex/queries/workOrders/listWorkOrders";
import { getWorkOrder }    from "../../convex/queries/workOrders/getWorkOrder";
```

```typescript
// convex/taskCards.test.ts — current (BROKEN) imports
import { createTaskCard }           from "../../convex/mutations/taskCards/createTaskCard";
import { completeStep }             from "../../convex/mutations/taskCards/completeStep";
import { signTaskCard }             from "../../convex/mutations/taskCards/signTaskCard";
import { listTaskCardsForWorkOrder } from "../../convex/queries/taskCards/listTaskCardsForWorkOrder";
```

```typescript
// convex/adCompliance.test.ts — current (BROKEN) imports  
import { createAdCompliance }    from "../../convex/mutations/adCompliance/createAdCompliance";
import { recordAdCompliance }    from "../../convex/mutations/adCompliance/recordAdCompliance";
import { markAdNotApplicable }   from "../../convex/mutations/adCompliance/markAdNotApplicable";
import { supersedAd }            from "../../convex/mutations/adCompliance/supersedAd";
import { checkAdDueForAircraft } from "../../convex/queries/adCompliance/checkAdDueForAircraft";
```

### What actually exists in the repository

Devraj implemented mutations as **inline exports within module files**, not as separate per-mutation files:

```
convex/
├── workOrders.ts          ← exports: createWorkOrder, openWorkOrder, closeWorkOrder,
│                                      voidWorkOrder, listWorkOrders, getWorkOrder, getCloseReadiness
├── taskCards.ts           ← exports: createTaskCard, completeStep, signTaskCard,
│                                      listTaskCardsForWorkOrder
├── schema.ts
├── lib/
│   ├── auth.ts
│   └── permissions.ts
└── _generated/
    └── api.ts             ← auto-generated, imports from workOrders.ts and taskCards.ts
```

The `convex/mutations/` and `convex/queries/` directories **do not exist**.

### Root cause

The separate-file structure was likely based on an earlier architectural plan or a spec document that was superseded. Devraj's implementation correctly uses the module-per-domain pattern (`workOrders.ts`, `taskCards.ts`) which is the Convex-recommended approach and aligns with the repo structure described in `vercel-deployment-architecture.md §1.1`. The tests were written against an older expected structure.

---

## Fix Options

There are two ways to resolve this. One is clearly correct. Choose Option A.

### ✅ Option A — Fix the test imports (RECOMMENDED)

Update the test imports to match the existing implementation files.

**Why this is correct:**
- The module-per-domain pattern (`workOrders.ts`) is what Convex generates and imports in `_generated/api.ts`. If we split mutations into per-file, the generated API object would need to change too — which would then break every frontend `api.workOrders.*` call.
- Devraj's implementation is complete and correct. Restructuring it to match a broken assumption in the tests would introduce regression risk.
- `convex-test` imports mutations via the `api` object, not direct file imports. The test imports should mirror how production code calls mutations.
- Less total work: updating 3 test files is faster than restructuring ~10 mutation implementations plus regenerating the API.

**Why not Option B (restructure the implementations):**
- Convex's code generation (`npx convex dev`) builds `_generated/api.ts` from the module files. Moving to per-file mutations would require matching the Convex expected file layout or modifying `convex.json` — neither of which is documented as required.
- The architecture doc (`vercel-deployment-architecture.md §1.1`) explicitly lists `workOrders.ts` (plural mutations per file) as the intended layout. Option B would diverge from the stated architecture.

---

## Exact Changes Required

### File: `convex/workOrders.test.ts`

**Remove** all direct mutation handler imports. **Replace** with the `convex-test` pattern using the generated `api` object.

The test file should NOT import mutation handler functions directly. With `convex-test`, mutations are invoked via `t.mutation(api.workOrders.createWorkOrder, args)`. This is the correct pattern — it goes through the full Convex function pipeline (validation, auth, type checking) rather than calling the handler in isolation.

**Current (broken):**
```typescript
// convex/workOrders.test.ts
import { createWorkOrder } from "../../convex/mutations/workOrders/createWorkOrder";
import { openWorkOrder }   from "../../convex/mutations/workOrders/openWorkOrder";
import { closeWorkOrder }  from "../../convex/mutations/workOrders/closeWorkOrder";
import { voidWorkOrder }   from "../../convex/mutations/workOrders/voidWorkOrder";
import { listWorkOrders }  from "../../convex/queries/workOrders/listWorkOrders";
import { getWorkOrder }    from "../../convex/queries/workOrders/getWorkOrder";
```

**Replace with:**
```typescript
// convex/workOrders.test.ts
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
```

And update every test invocation from:
```typescript
// BROKEN — calling handler directly bypasses Convex validation pipeline
const result = await createWorkOrder(ctx, args);
```

To the `convex-test` invocation pattern:
```typescript
// CORRECT — goes through full Convex mutation pipeline
const t = convexTest(schema);
const result = await t.mutation(api.workOrders.createWorkOrder, args);

// For authenticated calls:
const result = await t
  .withIdentity({ subject: "user_test123" })
  .mutation(api.workOrders.createWorkOrder, args);
```

---

### File: `convex/taskCards.test.ts`

**Current (broken):**
```typescript
import { createTaskCard }            from "../../convex/mutations/taskCards/createTaskCard";
import { completeStep }              from "../../convex/mutations/taskCards/completeStep";
import { signTaskCard }              from "../../convex/mutations/taskCards/signTaskCard";
import { listTaskCardsForWorkOrder } from "../../convex/queries/taskCards/listTaskCardsForWorkOrder";
```

**Replace with:**
```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
```

Update mutation calls from:
```typescript
// BROKEN
await completeStep(ctx, { taskCardStepId: stepId, ... });
```

To:
```typescript
// CORRECT
const t = convexTest(schema);
await t
  .withIdentity({ subject: "user_test_amt" })
  .mutation(api.taskCards.completeStep, {
    taskCardStepId: stepId,
    // ... rest of args
  });
```

---

### File: `convex/adCompliance.test.ts`

**Status:** These tests reference 5 mutations (`createAdCompliance`, `recordAdCompliance`, `markAdNotApplicable`, `supersedAd`, `checkAdDueForAircraft`) that are **not yet implemented** (Gate Review blocker B-P3-05). The import fix alone won't make these tests pass — they are blocked on Devraj's Phase 4 implementations.

However, fixing the imports NOW is still the right call because:
1. When Devraj delivers the implementations, the tests should work immediately
2. The incorrect imports mean the test file won't even compile, obscuring other errors

**Current (broken):**
```typescript
import { createAdCompliance }    from "../../convex/mutations/adCompliance/createAdCompliance";
import { recordAdCompliance }    from "../../convex/mutations/adCompliance/recordAdCompliance";
import { markAdNotApplicable }   from "../../convex/mutations/adCompliance/markAdNotApplicable";
import { supersedAd }            from "../../convex/mutations/adCompliance/supersedAd";
import { checkAdDueForAircraft } from "../../convex/queries/adCompliance/checkAdDueForAircraft";
```

**Replace with:**
```typescript
import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
```

The test bodies that call these mutations will remain compilation-broken until Devraj adds the mutations to `convex/workOrders.ts` or creates a `convex/adCompliance.ts`. Once he does, `_generated/api.ts` will include `api.adCompliance.*` and the tests will compile.

**Action for Devraj:** When implementing AD compliance mutations, add them to a new file `convex/adCompliance.ts` (matching the module-per-domain pattern). The test file should then reference `api.adCompliance.createAdCompliance`, etc.

---

## File to Create: `convex/vitest.config.ts`

This file may be missing, which would prevent `pnpm run test:convex` from finding the test files. Verify it exists. If it doesn't:

```typescript
// convex/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    // convex-test requires edge-runtime environment for Convex's WASM modules
    server: {
      deps: {
        // Allow convex-test to import Convex's bundled WASM
        inline: ["convex-test", "convex"],
      },
    },
    // Test files in the convex directory
    include: ["**/*.test.ts"],
    // Exclude generated files — they should not contain tests
    exclude: ["_generated/**", "node_modules/**"],
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "workOrders.ts",
        "taskCards.ts",
        "lib/**/*.ts",
        "webhooks/**/*.ts",
      ],
      exclude: [
        "_generated/**",
        "**/*.test.ts",
        "vitest.config.ts",
      ],
      // Thresholds — these must pass or CI fails
      thresholds: {
        statements: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

---

## Root `package.json` Script

Verify that the root `package.json` or the `convex` workspace `package.json` has the `test:convex` script:

```json
// convex/package.json (workspace package)
{
  "name": "convex",
  "private": true,
  "scripts": {
    "test:convex": "vitest run --config vitest.config.ts",
    "test:convex:watch": "vitest --config vitest.config.ts",
    "test:convex:coverage": "vitest run --config vitest.config.ts --coverage"
  },
  "devDependencies": {
    "convex-test": "^0.0.29",
    "vitest": "^1.6.0",
    "@edge-runtime/vm": "^4.0.0"
  }
}
```

The root `package.json` should have a script that delegates to this:
```json
// root package.json
{
  "scripts": {
    "test:convex": "pnpm --filter convex run test:convex"
  }
}
```

This is what the CI workflow calls in the `test` job (`pnpm --filter convex run test:convex`).

---

## Verification Steps (for Cilla to run after applying the fix)

```bash
# 1. From repo root — install deps if not already done
pnpm install --frozen-lockfile

# 2. Run only the Convex tests
pnpm --filter convex run test:convex

# Expected output after fix:
# ✓ convex/workOrders.test.ts (16 tests)
# ✓ convex/taskCards.test.ts (11 tests — some may fail until Devraj fills test helpers)
# ✗ convex/adCompliance.test.ts — COMPILE ERROR until mutations are implemented
#
# Total: 27+ tests compilable and runnable immediately after import fix.
# The 16 AD compliance tests remain blocked on Devraj's implementations.

# 3. Check that CI would pass for the fixed subset
pnpm --filter convex run test:convex --reporter=verbose

# 4. After Devraj delivers remaining mutations, run full suite
pnpm --filter convex run test:convex:coverage
# Target: ≥80% statement coverage (35 of 43 tests passing)
```

---

## Summary Table

| File | Action | Will Compile After Fix? | Will Pass After Fix? |
|---|---|---|---|
| `convex/workOrders.test.ts` | Fix 6 import paths | ✅ Yes | ✅ Yes (16/16) |
| `convex/taskCards.test.ts` | Fix 4 import paths | ✅ Yes | 🟡 Most (11, some need helper setup) |
| `convex/adCompliance.test.ts` | Fix 5 import paths | ❌ No — blocked on missing implementations | ❌ No — blocked on B-P3-05 |
| `convex/vitest.config.ts` | Create if missing | ✅ Required | ✅ Required |
| `convex/package.json` | Verify scripts exist | ✅ Required | ✅ Required |

**Net unblock from this fix:** 27+ tests become runnable on Day 1. AD compliance tests (16) remain blocked until Devraj delivers the mutations (Day 3-4 per gate review timeline).

---

## Who Does What

| Person | Action | Timeline |
|---|---|---|
| **Cilla** | Apply import fixes to `workOrders.test.ts` and `taskCards.test.ts`. Create `vitest.config.ts` if missing. Verify `package.json` scripts. Run test suite to confirm 16 work order tests pass. | Day 1 |
| **Devraj** | Fix any test helper gaps that emerge after the import fix. Implement remaining mutations (`createAdCompliance`, `recordAdCompliance`, etc.) in `convex/adCompliance.ts`. | Day 2-4 |
| **Cilla + Devraj** | Once AD compliance mutations are implemented, fix the `adCompliance.test.ts` imports and verify the 16 AD tests pass. | Day 4 |

---

*Jonas Harker — 2026-02-22*
*This is a wiring fix, not a logic fix. The test logic is correct — the tests just can't reach the code they're testing. Two hours of import refactoring unlocks 27 tests immediately. Do it first.*
