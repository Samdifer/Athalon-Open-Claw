import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";

export const loadFonts = () => {
  const inter = loadInter();
  const jetbrains = loadJetBrainsMono();
  return { inter, jetbrains };
};

export const FONTS = {
  heading: "Inter, system-ui, -apple-system, sans-serif",
  body: "Inter, system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
} as const;

export const FONT_WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

export const FONT_SIZES = {
  small: 24,
  body: 32,
  subtitle: 40,
  title: 56,
  headline: 72,
  hero: 96,
  mega: 200,
} as const;
