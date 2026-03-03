/**
 * Font configuration for the pitch video.
 *
 * Uses system/web-safe fonts by default. To use custom fonts:
 * 1. Place .woff2 files in public/fonts/
 * 2. Use staticFile() to reference them
 * 3. Load via @font-face in a component's useEffect
 *
 * For now we use Inter (Google Fonts loaded via CSS) and system monospace.
 */

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
