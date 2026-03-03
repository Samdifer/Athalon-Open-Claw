# Athelon MRO — Design System & Style Guide
**Version**: 1.0 · **Updated**: 2026-02-28
**Audience**: All developers, designers, and AI agents working on the Athelon platform

---

## 1. Design Philosophy

Athelon is **mission-critical B2B SaaS for aviation maintenance**. A technician at 2 AM pulling an engine needs to trust what they see on screen. A billing manager needs numbers that are unambiguous. An FAA inspector needs clean records.

### Design Principles
1. **Clarity over cleverness** — Every element communicates one thing clearly
2. **Information density without clutter** — MRO users manage complex operations; show data, don't hide it
3. **Trust through consistency** — Same patterns everywhere, no surprises
4. **Accessibility is non-negotiable** — WCAG 2.1 AA minimum, because hangars are dark and screens are small
5. **Dark mode is primary** — Shops run 24/7, dark mode reduces eye strain during night shifts

### Tone: Industrial Utilitarian
- Clean, functional, data-dense
- No decorative elements without purpose
- Professional — not flashy, not boring
- Aviation precision: tabular numbers, monospace for P/Ns and S/Ns

---

## 2. Color System

### 2.1 Core Palette (OKLCH)

All colors use OKLCH color space for perceptual uniformity. Defined as CSS custom properties in `app/globals.css`.

#### Light Mode
| Token | Value | Hex Approx | Usage |
|-------|-------|------------|-------|
| `--background` | `oklch(0.985 0 0)` | `#FAFAFA` | Page background |
| `--foreground` | `oklch(0.145 0 0)` | `#1A1A1A` | Primary text |
| `--card` | `oklch(0.985 0 0)` | `#FAFAFA` | Card surfaces |
| `--card-foreground` | `oklch(0.145 0 0)` | `#1A1A1A` | Card text |
| `--primary` | `oklch(0.68 0.195 214)` | `#0EA5E9` | Sky blue — buttons, links, active states |
| `--primary-foreground` | `oklch(0.985 0 0)` | `#FAFAFA` | Text on primary |
| `--secondary` | `oklch(0.97 0 0)` | `#F5F5F5` | Secondary surfaces |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `#2A2A2A` | Secondary text |
| `--muted` | `oklch(0.97 0 0)` | `#F5F5F5` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.556 0 0)` | `#808080` | Subdued text, labels |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#DC2626` | Danger, delete |
| `--border` | `oklch(0.922 0 0)` | `#E5E5E5` | Borders, dividers |
| `--input` | `oklch(0.922 0 0)` | `#E5E5E5` | Input borders |
| `--ring` | `oklch(0.68 0.195 214)` | `#0EA5E9` | Focus rings |

#### Dark Mode (Primary)
| Token | Value | Hex Approx | Usage |
|-------|-------|------------|-------|
| `--background` | `oklch(0.092 0.023 262)` | `#0A0E1A` | Deep navy page bg |
| `--foreground` | `oklch(0.91 0.01 252)` | `#E2E4EA` | Primary text |
| `--card` | `oklch(0.138 0.022 262)` | `#111827` | Card surfaces (slate) |
| `--primary` | `oklch(0.68 0.195 214)` | `#0EA5E9` | Sky blue (same both modes) |
| `--secondary` | `oklch(0.22 0.025 262)` | `#1E2433` | Secondary surfaces |
| `--muted` | `oklch(0.185 0.02 262)` | `#1A1F2E` | Muted backgrounds |
| `--muted-foreground` | `oklch(0.65 0.03 252)` | `#9CA3AF` | Subdued text |
| `--destructive` | `oklch(0.63 0.24 27)` | `#EF4444` | Danger |
| `--border` | `oklch(1 0 0 / 9%)` | `rgba(255,255,255,0.09)` | Subtle borders |
| `--input` | `oklch(1 0 0 / 12%)` | `rgba(255,255,255,0.12)` | Input borders |

### 2.2 Aviation Semantic Colors

These are domain-specific colors used across the platform for aviation status indicators:

| Token | Value | Hex Approx | Usage |
|-------|-------|------------|-------|
| `--aviation-sky` | `oklch(0.68 0.195 214)` | `#0EA5E9` | Active, in-progress, primary actions |
| `--aviation-success` | `oklch(0.72 0.22 148)` | `#22C55E` | Complete, signed, approved, serviceable |
| `--aviation-warning` | `oklch(0.762 0.184 76)` | `#F59E0B` | Attention needed, approaching limits, deferred |
| `--aviation-critical` | `oklch(0.63 0.24 27)` | `#EF4444` | AOG, overdue, critical discrepancy, unserviceable |

### 2.3 Chart Colors

For recharts and data visualization, use in order:

| Token | Color | Usage |
|-------|-------|-------|
| `--chart-1` | Sky blue | Primary data series |
| `--chart-2` | Green | Secondary / positive |
| `--chart-3` | Amber | Tertiary / warning |
| `--chart-4` | Purple | Quaternary |
| `--chart-5` | Red | Quinary / negative |

### 2.4 Status Badge System

Use the utility classes defined in `globals.css`:

```tsx
// Active / In Progress
<Badge className="status-active">In Progress</Badge>

// Signed / Complete / Approved
<Badge className="status-signed">Complete</Badge>

// Warning / Deferred / Approaching Limit
<Badge className="status-warning">Deferred</Badge>

// Critical / AOG / Overdue / Unserviceable
<Badge className="status-critical">AOG</Badge>

// Draft / Inactive / Muted
<Badge className="status-muted">Draft</Badge>
```

#### WO Priority Badges
```tsx
const priorityBadge = {
  aog:     "status-critical",     // Red — Aircraft on Ground
  urgent:  "status-warning",      // Amber — Urgent
  routine: "status-active",       // Blue — Routine
  deferred: "status-muted",       // Gray — Deferred
};
```

#### WO Status Badges
```tsx
const statusBadge = {
  draft:              "status-muted",
  open:               "status-active",
  in_progress:        "status-active",
  on_hold:            "status-warning",
  pending_inspection: "status-warning",
  pending_signoff:    "status-warning",
  closed:             "status-signed",
  cancelled:          "status-muted",
  voided:             "status-critical",
};
```

#### Part Condition Badges
```tsx
const conditionBadge = {
  new:            "status-signed",
  serviceable:    "status-signed",
  overhauled:     "status-active",
  repaired:       "status-active",
  unserviceable:  "status-critical",
  quarantine:     "status-critical",
  scrapped:       "status-muted",
};
```

### 2.5 Color Usage Rules

1. **Never use raw Tailwind colors** (`text-red-500`) — always use semantic tokens (`text-destructive`, `status-critical`)
2. **AOG is always red** — the #1 priority in any MRO shop. Red left border on AOG cards: `.aog-indicator`
3. **Green = approved/signed/complete** — never use green for "in progress"
4. **Amber = needs attention** — not red (which means broken), not green (which means done)
5. **Maintain 4.5:1 contrast ratio** for all text. 3:1 for UI elements

---

## 3. Typography

### 3.1 Font Stack

| Use | Font | Fallback | CSS Variable |
|-----|------|----------|-------------|
| **UI text** | Geist | system sans-serif | `--font-sans` |
| **Code / P/Ns / S/Ns** | Geist Mono | system monospace | `--font-mono` |

> **Why Geist?** It's designed for developer/B2B interfaces. Excellent tabular numbers, clean at small sizes, distinct characters (0 vs O, 1 vs l vs I).

### 3.2 Type Scale

| Level | Tailwind | Size | Weight | Usage |
|-------|----------|------|--------|-------|
| **Page Title** | `text-2xl font-bold` | 24px | 700 | Page headers (e.g., "Work Orders") |
| **Section Title** | `text-lg font-semibold` | 18px | 600 | Card headers, section titles |
| **Subsection** | `text-base font-medium` | 16px | 500 | Sub-headers, dialog titles |
| **Body** | `text-sm` | 14px | 400 | Primary body text, table cells |
| **Caption** | `text-xs text-muted-foreground` | 12px | 400 | Labels, timestamps, secondary info |
| **Overline** | `text-xs font-medium uppercase tracking-wider text-muted-foreground` | 12px | 500 | Category labels, section dividers |

### 3.3 Technical Typography

Aviation data has specific formatting requirements:

```tsx
// Part numbers — always monospace, tight tracking
<span className="font-mono-pn">HC-B4TN-5GL/F8468A</span>

// Serial numbers — monospace
<span className="font-mono text-sm">S/N: PCE-RB0418</span>

// Work order numbers — monospace, slightly larger
<span className="font-mono font-medium">WO-GA-2026-001</span>

// Currency — tabular numbers for alignment
<span className="tabular-nums font-medium">${amount.toLocaleString()}</span>

// Hours / Cycles — always with unit
<span className="tabular-nums">8,200.4 hrs</span>
<span className="tabular-nums">3,800 cyc</span>

// Dates — consistent ISO or locale format
<span className="text-sm text-muted-foreground">2026-02-28</span>
```

### 3.4 Typography Rules

1. **Page titles**: One per page, top-left, `text-2xl font-bold`
2. **Never use h1-h6 for visual styling** — use semantic headings with Tailwind classes
3. **Part numbers and serial numbers are ALWAYS monospace** — `font-mono-pn` utility class
4. **Numbers in tables are tabular** — `tabular-nums` for column alignment
5. **No text larger than 24px** in the app (it's B2B, not a landing page)
6. **Truncate with ellipsis** for long descriptions, never wrap text in table cells

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

Use Tailwind's 4px base scale. Standard spacing:

| Context | Spacing | Tailwind |
|---------|---------|----------|
| **Page padding** | 24px | `p-6` |
| **Card padding** | 16-24px | `p-4` to `p-6` |
| **Between sections** | 24-32px | `space-y-6` to `space-y-8` |
| **Between cards** | 16px | `gap-4` |
| **Between form fields** | 16px | `space-y-4` |
| **Between inline items** | 8px | `gap-2` |
| **Between icon + text** | 8px | `gap-2` |
| **Table cell padding** | 12px horizontal, 8px vertical | `px-3 py-2` |

### 4.2 Page Layout Structure

Every page follows this structure:

```tsx
export default function PageName() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Page Title</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Brief description of what this page does
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Secondary</Button>
          <Button size="sm"><Plus className="size-4" /> Primary</Button>
        </div>
      </div>

      {/* Filters / Tabs (optional) */}
      <div className="flex items-center gap-4">
        <Input placeholder="Search..." className="max-w-sm" />
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-0">
          {/* Table or content */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.3 Grid Patterns

```tsx
// KPI Cards row
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card>...</Card>
</div>

// Two-column detail layout
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <div className="lg:col-span-2">Main content</div>
  <div>Sidebar / Summary</div>
</div>

// Form layout
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label>Field 1</Label>
    <Input />
  </div>
  <div className="space-y-2">
    <Label>Field 2</Label>
    <Input />
  </div>
</div>
```

### 4.4 Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | `<768px` | Single column, stacked cards, hamburger nav |
| Tablet | `768-1024px` | 2-column grids, collapsible sidebar |
| Desktop | `1024-1440px` | Full layout, sidebar always visible |
| Wide | `>1440px` | Max-width container, centered |

---

## 5. Components

### 5.1 Buttons

| Variant | Usage | Example |
|---------|-------|---------|
| `default` (primary) | Primary actions: Create, Save, Submit | `<Button>Create Work Order</Button>` |
| `destructive` | Dangerous actions: Delete, Void, Cancel | `<Button variant="destructive">Void Invoice</Button>` |
| `outline` | Secondary actions: Filter, Export, Edit | `<Button variant="outline">Export CSV</Button>` |
| `secondary` | Tertiary actions: Less important | `<Button variant="secondary">View Details</Button>` |
| `ghost` | Minimal actions: Table row actions, icon buttons | `<Button variant="ghost" size="icon-sm">` |
| `link` | Inline text links | `<Button variant="link">View all</Button>` |

#### Button Sizes
| Size | Height | Usage |
|------|--------|-------|
| `xs` | 24px | Inline badges, tag actions |
| `sm` | 32px | **Default for most actions** — table rows, card actions |
| `default` | 36px | Primary page actions |
| `lg` | 40px | Hero CTAs, prominent actions |
| `icon` / `icon-sm` / `icon-xs` | Square | Icon-only buttons |

#### Button Rules
1. **One primary button per view** — the main action
2. **Destructive actions need confirmation** — always use a Dialog
3. **Loading state**: Disable + show spinner, never remove the button
4. **Icon + text**: Icon left, text right. Icon size `size-4`
5. **Button groups**: Use `gap-2` between buttons

### 5.2 Cards

```tsx
// Standard data card
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-lg">Section Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// KPI card
<Card>
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Active Work Orders
        </p>
        <p className="text-2xl font-bold mt-1">24</p>
      </div>
      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Wrench className="size-5 text-primary" />
      </div>
    </div>
  </CardContent>
</Card>

// AOG card (red left border)
<Card className="aog-indicator">
  <CardContent className="p-4">
    {/* AOG work order content */}
  </CardContent>
</Card>
```

### 5.3 Tables

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead className="w-[120px]">WO Number</TableHead>
      <TableHead>Aircraft</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Total</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell className="font-mono-pn font-medium">
        WO-2026-001
      </TableCell>
      <TableCell>N842GA</TableCell>
      <TableCell><Badge className="status-active">In Progress</Badge></TableCell>
      <TableCell className="text-right tabular-nums">$12,450.00</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### Table Rules
1. **Always wrap in a Card** — `<Card><CardContent className="p-0"><Table>...`
2. **Monospace for identifiers** — WO numbers, P/Ns, S/Ns, invoice numbers
3. **Right-align numbers** — currency, quantities, hours
4. **Status badges in their own column** — never inline with text
5. **Clickable rows**: `cursor-pointer hover:bg-muted/50` + navigate on click
6. **Empty state**: Show illustration + message, never an empty table

### 5.4 Forms

```tsx
<div className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="partNumber">Part Number <span className="text-destructive">*</span></Label>
    <Input
      id="partNumber"
      placeholder="e.g., HC-B4TN-5GL"
      className="font-mono"
      aria-required="true"
    />
    <p className="text-xs text-muted-foreground">
      Enter the manufacturer part number
    </p>
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="condition">Condition</Label>
    <Select>
      <SelectTrigger id="condition">
        <SelectValue placeholder="Select condition" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="new">New</SelectItem>
        <SelectItem value="serviceable">Serviceable</SelectItem>
        <SelectItem value="overhauled">Overhauled</SelectItem>
      </SelectContent>
    </Select>
  </div>
</div>
```

#### Form Rules
1. **Required fields**: Red asterisk after label text
2. **Labels always visible** — never placeholder-only
3. **Help text below input** in `text-xs text-muted-foreground`
4. **Error text below input** in `text-xs text-destructive`
5. **All inputs need `id` + matching `htmlFor`** on Label
6. **Submit buttons right-aligned** in a flex row

### 5.5 Dialogs

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button size="sm"><Plus className="size-4" /> Add Item</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Add Part to Inventory</DialogTitle>
      <DialogDescription>
        Enter the part details. Required fields are marked with *.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      {/* Form fields */}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={close}>Cancel</Button>
      <Button onClick={submit}>Add Part</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Dialog Sizes
| Width | Usage |
|-------|-------|
| `sm:max-w-[425px]` | Simple confirmations, single field |
| `sm:max-w-[500px]` | Standard forms (3-5 fields) |
| `sm:max-w-[650px]` | Complex forms, multi-column |
| `sm:max-w-[900px]` | Data-heavy dialogs, preview panels |

### 5.6 Empty States

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="size-12 rounded-lg bg-muted flex items-center justify-center mb-4">
    <Package className="size-6 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-medium">No parts found</h3>
  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
    Your inventory is empty. Add parts to start tracking.
  </p>
  <Button className="mt-4" size="sm">
    <Plus className="size-4" /> Add First Part
  </Button>
</div>
```

### 5.7 Loading States

```tsx
// Skeleton for table rows
<TableRow>
  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
  <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
</TableRow>

// Skeleton for KPI cards
<Card>
  <CardContent className="p-4 space-y-2">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-8 w-16" />
  </CardContent>
</Card>
```

### 5.8 Toasts (Sonner)

```tsx
import { toast } from "sonner";

// Success
toast.success("Part received", {
  description: "P/N HC-B4TN-5GL added to inventory"
});

// Error
toast.error("Failed to save", {
  description: "Check your connection and try again"
});

// Warning
toast.warning("Calibration due", {
  description: "Torque wrench GA-TW-001 due in 7 days"
});

// Loading → Success pattern
const toastId = toast.loading("Saving work order...");
// After mutation:
toast.success("Work order saved", { id: toastId });
```

#### Toast Rules
1. **Always use `sonner`** — never `useToast` or `alert()`
2. **Include a description** for context
3. **Success toasts auto-dismiss** (4s default)
4. **Error toasts persist** until dismissed
5. **Never toast on page load** — only on user actions

---

## 6. Animation Standards

### 6.1 Timing

| Duration | Usage | Tailwind |
|----------|-------|----------|
| **100ms** | Micro-interactions: button press, checkbox toggle | `duration-100` |
| **150ms** | Hover states: color change, shadow | `duration-150` |
| **200ms** | Element transitions: accordion, tabs, dropdown | `duration-200` |
| **300ms** | Page transitions: dialog open/close, sheet | `duration-300` |
| **500ms** | Skeleton shimmer, loading pulse | `duration-500` |

### 6.2 Easing

| Easing | Usage | CSS |
|--------|-------|-----|
| `ease-out` | Elements appearing (entering) | `transition-all ease-out` |
| `ease-in` | Elements disappearing (leaving) | `transition-all ease-in` |
| `ease-in-out` | State changes (hover, toggle) | `transition-all ease-in-out` |

### 6.3 Approved Animations

```css
/* Hover: subtle lift */
.card-hover {
  @apply transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5;
}

/* Fade in on mount */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 200ms ease-out;
}

/* Skeleton pulse (already built into shadcn) */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Status dot pulse for AOG */
@keyframes aog-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.aog-pulse {
  animation: aog-pulse 1.5s ease-in-out infinite;
}

/* Spin for loading */
.animate-spin { /* Tailwind built-in */ }
```

### 6.4 Animation Rules

1. **Never animate layout shifts** — no height/width animations on content
2. **Never use bounce** — unprofessional for B2B
3. **Respect `prefers-reduced-motion`**:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```
4. **Only AOG gets a pulse animation** — it's the only thing that should demand attention
5. **Dialog animations come from Radix** — don't override
6. **Loading spinners**: Use `Loader2` from lucide with `animate-spin`

---

## 7. Icons

### 7.1 Icon Library

Use **Lucide React** exclusively. Never mix icon libraries.

```tsx
import { Wrench, Plane, Package, AlertTriangle } from "lucide-react";
```

### 7.2 Icon Sizes

| Context | Size | Tailwind |
|---------|------|----------|
| **Inline with text** | 16px | `size-4` |
| **Button icon** | 16px | `size-4` |
| **KPI card icon** | 20px | `size-5` |
| **Empty state icon** | 24px | `size-6` |
| **Feature icon (large)** | 32px | `size-8` |

### 7.3 Aviation Icon Mapping

| Concept | Icon | Usage |
|---------|------|-------|
| Aircraft | `Plane` | Fleet, aircraft list |
| Work Order | `Wrench` | WO list, dashboard |
| Parts | `Package` | Inventory, parts |
| Billing | `Receipt` | Invoices, billing |
| Discrepancy | `AlertTriangle` | Squawks, findings |
| Compliance | `Shield` | AD/SB, compliance |
| Scheduling | `Calendar` | Schedule, calendar |
| Personnel | `Users` | Technicians, personnel |
| Tools | `Hammer` | Tool crib |
| Shipping | `Truck` | Shipping/receiving |
| Dashboard | `LayoutDashboard` | Dashboard |
| Settings | `Settings` | Settings |
| Search | `Search` | Search/filter |
| Add | `Plus` | Create new |
| Edit | `Pencil` | Edit |
| Delete | `Trash2` | Delete (with confirmation) |
| Download | `Download` | Export, PDF |
| Upload | `Upload` | Import, attach |
| Clock | `Clock` | Time clock, duration |
| Check | `Check` | Complete, approved |
| X | `X` | Cancel, close |
| AOG | `AlertOctagon` | Aircraft on ground |

---

## 8. Accessibility (WCAG 2.1 AA)

### 8.1 Color Contrast

| Element | Min Ratio | Verification |
|---------|-----------|-------------|
| Body text | 4.5:1 | Dark: `#E2E4EA` on `#0A0E1A` = 12.8:1 ✅ |
| Muted text | 4.5:1 | Dark: `#9CA3AF` on `#0A0E1A` = 6.8:1 ✅ |
| UI elements (borders, icons) | 3:1 | Dark: borders at 9% opacity = marginal, ensure icons are brighter |
| Button text | 4.5:1 | White on `#0EA5E9` = 4.6:1 ✅ |

### 8.2 Keyboard Navigation

1. **All interactive elements** must be focusable with Tab
2. **Focus rings** are built into shadcn: `focus-visible:ring-[3px] focus-visible:ring-ring/50`
3. **Skip to content link** (add if not present):
   ```tsx
   <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:p-4 focus:shadow-lg">
     Skip to main content
   </a>
   ```
4. **Dialog trap focus** — handled by Radix Dialog
5. **Escape to close** — handled by Radix Dialog/Popover/Dropdown

### 8.3 Semantic HTML

```tsx
// ✅ Correct
<nav aria-label="Main navigation">...</nav>
<main id="main-content">...</main>
<section aria-labelledby="wo-heading">
  <h2 id="wo-heading">Work Orders</h2>
</section>
<table role="table" aria-label="Work order list">...</table>

// ❌ Wrong
<div onClick={navigate}>...</div>  // Use <button> or <Link>
<div class="table">...</div>      // Use <table>
```

### 8.4 ARIA Labels

```tsx
// Status badges need context
<Badge className="status-critical" aria-label="Priority: AOG">AOG</Badge>

// Icon-only buttons need labels
<Button variant="ghost" size="icon-sm" aria-label="Edit work order">
  <Pencil className="size-4" />
</Button>

// Search inputs
<Input placeholder="Search work orders..." aria-label="Search work orders" />

// Tables with sort
<TableHead aria-sort="ascending">Date</TableHead>
```

### 8.5 Screen Reader Considerations

1. **Visually hidden text** for context: `<span className="sr-only">Work Order</span>`
2. **Live regions** for dynamic content: `aria-live="polite"` on notification areas
3. **Error announcements**: `aria-describedby` linking input to error message
4. **Loading states**: `aria-busy="true"` on loading containers

---

## 9. Dark/Light Mode Implementation

### 9.1 Toggle Component

```tsx
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

function ThemeToggle() {
  const [dark, setDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  const toggle = () => {
    document.documentElement.classList.toggle("dark");
    setDark(!dark);
    localStorage.setItem("theme", dark ? "light" : "dark");
  };

  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Toggle theme">
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
```

### 9.2 Rules for Dual-Mode Components

1. **Never hardcode colors** — always use CSS variables via Tailwind tokens
2. **Test every component in both modes** before committing
3. **Dark mode is default** — the `.dark` class is applied to `<html>` on load
4. **Shadows in dark mode** should be minimal — use border/bg changes instead
5. **Images and icons** should have sufficient contrast in both modes
6. **Charts**: Use `--chart-N` variables which are tuned for both modes

```tsx
// ✅ Works in both modes
<div className="bg-card text-card-foreground border border-border">
  <p className="text-muted-foreground">Label</p>
  <p className="text-foreground font-medium">Value</p>
</div>

// ❌ Breaks in dark mode
<div className="bg-white text-gray-900 border-gray-200">
  <p className="text-gray-500">Label</p>
</div>
```

---

## 10. Common Patterns

### 10.1 Confirmation Dialog (Destructive Actions)

```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive" size="sm">Void Invoice</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Void Invoice INV-2026-042?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. The invoice will be marked as voided
        and a credit memo will be generated.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive hover:bg-destructive/90">
        Void Invoice
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 10.2 Data Table with Search + Filter + Pagination

```tsx
// See app/(app)/billing/invoices/page.tsx for the canonical implementation
```

### 10.3 Detail Page with Breadcrumb

```tsx
<div className="p-6 space-y-6">
  <Breadcrumb>
    <BreadcrumbList>
      <BreadcrumbItem>
        <BreadcrumbLink asChild>
          <Link to="/work-orders">Work Orders</Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator />
      <BreadcrumbItem>
        <BreadcrumbPage>WO-2026-001</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  </Breadcrumb>
  
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold font-mono-pn">WO-2026-001</h1>
      <p className="text-sm text-muted-foreground">N842GA · King Air B200</p>
    </div>
    <Badge className="status-active">In Progress</Badge>
  </div>
  
  {/* Detail content */}
</div>
```

### 10.4 Sidebar Navigation Pattern

Navigation is defined in `components/AppSidebar.tsx`. Follow the existing pattern:
- Group related items under section headers
- Use Lucide icons for each item
- Active state uses `data-[active=true]` styling from shadcn Sidebar

---

## 11. File Naming & Organization

| Type | Pattern | Example |
|------|---------|---------|
| Pages | `app/(app)/[module]/page.tsx` | `app/(app)/parts/page.tsx` |
| Detail pages | `app/(app)/[module]/[id]/page.tsx` | `app/(app)/work-orders/[id]/page.tsx` |
| Components | `components/[ComponentName].tsx` | `components/QRCodeBadge.tsx` |
| UI primitives | `components/ui/[component].tsx` | `components/ui/button.tsx` |
| PDF templates | `lib/pdf/[Template]PDF.tsx` | `lib/pdf/InvoicePDF.tsx` |
| Hooks | `hooks/use[Name].ts` | `hooks/useCurrentOrg.ts` |
| Utilities | `lib/[name].ts` | `lib/utils.ts` |

---

## 12. Do's and Don'ts

### DO ✅
- Use semantic HTML elements
- Test in dark mode first (it's primary)
- Use `font-mono-pn` for any aviation identifier
- Show loading skeletons that match the content shape
- Use `tabular-nums` for any column of numbers
- Include empty states for every list/table
- Add `aria-label` to every icon-only button
- Use `sonner` toast for all user feedback
- Prefix commits with conventional commit types

### DON'T ❌
- Use raw Tailwind colors (`text-red-500`) — use semantic tokens
- Use `alert()` or `console.log` for user feedback
- Use `next/link` or `next/navigation` — it's Vite, not Next.js
- Mix icon libraries — Lucide only
- Use bounce/spring animations — too playful for B2B
- Hardcode light or dark colors — always use CSS variables
- Truncate work order numbers or part numbers — these are critical identifiers
- Use placeholder text as the only label
- Create buttons without visible text OR aria-label

---

*This style guide is a living document. Update it as the design system evolves. When in doubt, look at `app/(app)/billing/invoices/page.tsx` — it's the canonical reference implementation.*
