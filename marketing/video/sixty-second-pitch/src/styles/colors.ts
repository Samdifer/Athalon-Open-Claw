/**
 * AVLY.IO / Athelon brand color palette — V3 Professional
 */
export const COLORS = {
  // Base
  black: "#000000",
  nearBlack: "#09090b",
  darkSlate: "#0f172a",
  white: "#ffffff",
  offWhite: "#f8fafc",
  muted: "#94a3b8",

  // Primary: Indigo/Blue
  primary: "#6366f1",
  primaryGlow: "#818cf8",
  primaryDark: "#4338ca",
  blue: "#3b82f6",
  blueGlow: "#60a5fa",
  cyan: "#06b6d4",

  // Accent: Amber/Gold (CTA moments)
  amber: "#f59e0b",
  amberGlow: "#fbbf24",
  gold: "#d4a017",

  // Danger/Problem
  red: "#ef4444",
  redMuted: "#dc2626",
  redBg: "#1a0a0a",

  // Success/Decision
  green: "#22c55e",
  greenGlow: "#4ade80",

  // Glassmorphic
  glass: "rgba(255,255,255,0.05)",
  glassBorder: "rgba(255,255,255,0.1)",
  glassHover: "rgba(255,255,255,0.08)",

  // Gradients (as CSS strings)
  auroraGradient: "radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.15) 0%, transparent 70%)",
  meshGradient: "radial-gradient(ellipse at 70% 30%, rgba(59,130,246,0.12) 0%, transparent 60%)",
  heroGradient: "linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #09090b 100%)",
} as const;
