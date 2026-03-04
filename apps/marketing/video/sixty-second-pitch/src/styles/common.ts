/**
 * Shared animation constants and spring configs.
 * Reference these from scene components for consistent motion language.
 */

// Video specs
export const FPS = 30;
export const DURATION_FRAMES = 1800; // 60 seconds
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Scene frame boundaries (absolute)
export const SCENES = {
  intro: { from: 0, duration: 180 },       // 0:00–0:06
  background: { from: 180, duration: 240 }, // 0:06–0:14
  problem: { from: 420, duration: 240 },    // 0:14–0:22
  pivot: { from: 660, duration: 180 },      // 0:22–0:28
  vision: { from: 840, duration: 240 },     // 0:28–0:36
  product: { from: 1080, duration: 300 },   // 0:36–0:46
  value: { from: 1380, duration: 180 },     // 0:46–0:52
  cta: { from: 1560, duration: 240 },       // 0:52–1:00
} as const;

// Spring configs — named presets
export const SPRING_CONFIGS = {
  /** Hard slam — fast, minimal overshoot. For text punches. */
  slam: { stiffness: 300, damping: 20 },
  /** Bouncy pop — noticeable overshoot. For logo reveals. */
  pop: { stiffness: 200, damping: 12 },
  /** Smooth settle — gentle, no overshoot. For fade-ins. */
  smooth: { stiffness: 100, damping: 20 },
  /** Snappy — very fast, slight bounce. For feature cards. */
  snappy: { stiffness: 250, damping: 18 },
} as const;

// Transition durations (in frames)
export const TRANSITIONS = {
  flash: 3,       // White flash between scenes
  glitch: 3,      // Glitch cut
  colorWipe: 15,  // Color transition (built into scene)
  fade: 10,       // Opacity crossfade
} as const;
