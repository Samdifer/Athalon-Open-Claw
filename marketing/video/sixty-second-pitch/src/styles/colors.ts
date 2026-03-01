/**
 * AVLY.IO / Athelon brand color palette
 * Used across all video scenes for consistency.
 */

export const COLORS = {
  // Core brand
  black: "#000000",
  white: "#ffffff",
  slate900: "#0f172a",
  slate800: "#1e293b",

  // Problem scene (red tints)
  problemBg: "#1a0000",
  problemAccent: "#dc2626",
  problemText: "#fca5a5",

  // Pivot / bright palette
  brightBg: "#f0f4ff",
  brightText: "#111827",

  // Vision / clean
  visionBg: "#ffffff",
  visionSubtle: "#f8fafc",

  // Product scene
  productBg: "#0f172a",
  productAccent: "#3b82f6",
  productGlow: "#818cf8",

  // CTA
  ctaBg: "#0f172a",
  ctaGlow: "#60a5fa",
  ctaUrgent: "#f59e0b",

  // Transitions
  flashWhite: "#ffffff",

  // Gradients (CSS strings)
  darkGradient: "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)",
  aiGradient: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
} as const;
