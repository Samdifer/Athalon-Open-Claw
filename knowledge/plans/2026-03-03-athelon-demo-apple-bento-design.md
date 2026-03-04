# 2026-03-03-athelon-demo-apple-bento-design.md

# Athalon Demo: Apple-Style Bento Redesign

## 1. Overview
Athalon Demo is a high-end, simplified "deep redesign" of the Athalon MRO platform. It focuses on **Apple-style softness**, **Bento-grid layouts**, and **Progressive Disclosure** to manage high-density MRO data without overwhelming the user.

## 2. Design Philosophy
- **Aesthetic**: Light, airy, "squircle" geometry (`rounded-[2rem]`), and glassmorphism.
- **Navigation**: A floating, translucent bottom **App Dock** for primary sections.
- **Layout**: Content floats in **Bento Cards** on a soft grey (`bg-zinc-50/50`) canvas.
- **UX Strategy**: Layered complexity via fluid "Sheet" expansions.

## 3. Core Components

### 3.1 The App Dock (`<AppDock />`)
- **Position**: Fixed bottom-center.
- **Styling**: `bg-white/70 backdrop-blur-xl border border-white/30 shadow-2xl`.
- **Behavior**: Hover magnification (macOS style), active state indicated by a subtle dot.

### 3.2 BentoCard (`<BentoCard />`)
- **Geometry**: `rounded-3xl` (24px) or `rounded-[2rem]` (32px).
- **Shadow**: `shadow-sm` (subtle ambient occlusion).
- **Padding**: Large internal gutters (`p-8`).
- **Variants**: 
  - `1x1`: Mini-stat (e.g., "Active Techs").
  - `2x2`: Standard (e.g., "Work Order Summary").
  - `4x2`: Wide (e.g., "Fleet Health Matrix").

### 3.3 The "Sheet" Expansion
- **Trigger**: Clicking a Bento Card.
- **Animation**: `framer-motion` layout transition (card grows into full-screen sheet).
- **Layout**: Sidebar (30%) for navigation/lists, Main Canvas (70%) for task execution.

## 4. Technical Architecture
- **Location**: `apps/athelon-demo/` (Vite + React 19).
- **Backend**: Shared `convex/` from the main project.
- **Auth**: Clerk integration via `clerk-react`.
- **Styling**: Tailwind CSS v4 + `framer-motion`.
- **Data Flow**: Consumes existing Convex queries/mutations to ensure 100% functional parity.

## 5. Success Criteria
1. **The 3-Second Rule**: Immediate identification of top priorities.
2. **Fluid Continuity**: No page refreshes; all deep-dives are animated expansions.
3. **Full Parity**: 100% compatible with existing data schema and business logic.
