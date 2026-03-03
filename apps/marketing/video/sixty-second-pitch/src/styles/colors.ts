/**
 * AVLY.IO / Athelon brand color palette — V2 Enhanced
 * Richer palette with glow colors, gradient stops, and scene-specific accents.
 */

export const COLORS = {
  // Core brand
  black: "#000000",
  white: "#ffffff",
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",

  // Hook scene (deep black with blue undertone)
  hookBg: "#030712",
  hookAccent: "#60a5fa",
  hookGlow: "#1e3a5f",

  // Credibility scene (dark gradient)
  credBg: "#0a0a0a",
  credAccent: "#94a3b8",

  // Problem scene (red tints — more intense)
  problemBg: "#1a0000",
  problemAccent: "#ef4444",
  problemText: "#fca5a5",
  problemGlow: "#7f1d1d",

  // Pivot / bright palette
  brightBg: "#f0f4ff",
  brightText: "#111827",
  brightAccent: "#2563eb",

  // Vision / clean
  visionBg: "#ffffff",
  visionSubtle: "#f8fafc",
  visionAccent: "#3b82f6",

  // Product scene
  productBg: "#0f172a",
  productAccent: "#3b82f6",
  productGlow: "#818cf8",
  productSecondary: "#06b6d4",

  // CTA
  ctaBg: "#0f172a",
  ctaGlow: "#60a5fa",
  ctaUrgent: "#f59e0b",
  ctaUrgentGlow: "#fbbf24",

  // Transitions
  flashWhite: "#ffffff",

  // Gradients (CSS strings)
  darkGradient: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)",
  aiGradient: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
  heroGradient: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
} as const;
