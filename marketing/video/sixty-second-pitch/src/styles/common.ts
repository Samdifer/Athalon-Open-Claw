export const FPS = 30;
export const DURATION_FRAMES = 1800;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const SCENES = {
  meetFounders: { from: 0, duration: 240 },
  frustration: { from: 240, duration: 240 },
  decision: { from: 480, duration: 180 },
  opportunity: { from: 660, duration: 240 },
  avlyAthelon: { from: 900, duration: 240 },
  whatItDoes: { from: 1140, duration: 240 },
  promise: { from: 1380, duration: 180 },
  cta: { from: 1560, duration: 240 },
} as const;

export const SPRING_CONFIGS = {
  smooth: { damping: 200 },
  snappy: { damping: 20, stiffness: 200 },
  pop: { damping: 12, stiffness: 180 },
  heavy: { damping: 15, stiffness: 80, mass: 2 },
  slam: { stiffness: 300, damping: 20 },
} as const;

export const TRANSITIONS = {
  flash: 3,
  fade: 10,
} as const;
