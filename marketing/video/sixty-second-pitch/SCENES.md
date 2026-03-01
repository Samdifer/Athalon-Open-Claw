# Scene-by-Scene Remotion Technical Guide

**Video Specs:** 1920x1080 | 30fps | 1800 frames | 60 seconds

This document maps every scene to specific Remotion components, animation functions, and frame timings. Use this as the build reference when implementing each scene component.

---

## Global Conventions

- **All animations use `useCurrentFrame()`** — never CSS transitions or `setTimeout`
- **Deterministic randomness only** — use `random('seed-string')` from remotion, never `Math.random()`
- **Extrapolation clamped** — every `interpolate()` call uses `{ extrapolateRight: "clamp" }`
- **Transitions** — 3-frame white flash between scenes (overlay via `AbsoluteFill` with opacity interpolation)
- **Font stack** — Inter (bold, black weights) for headings; JetBrains Mono for technical callouts
- **Color palette** — See `src/styles/colors.ts`

---

## Scene 1 — THE HOOK

| Property | Value |
|----------|-------|
| Frames | 0–180 (6 seconds) |
| Component | `Scene1_Intro.tsx` |
| Background | Solid `#000000` |

### Animation Timeline

| Frame | Element | Animation |
|-------|---------|-----------|
| 0–10 | Black hold | Nothing — 0.33s of silence builds tension |
| 10–30 | "I'm Sam. This is Nate." | `spring({ fps: 30, frame: f-10, config: { stiffness: 300, damping: 20 } })` — text scales from 0→1 with slight overshoot |
| 50–70 | "Two aircraft mechanics." | Same spring config, positioned below first line |
| 90–110 | "Eleven years on the flight line." | Same spring, positioned below. This line uses slightly larger font |
| 140–180 | All three lines visible | Static hold. Let it land. |

### Remotion Components Used

```
<AbsoluteFill style={{ backgroundColor: '#000' }}>
  <Sequence from={10} durationInFrames={170}>
    <AnimatedText text="I'm Sam. This is Nate." style="slam" />
  </Sequence>
  <Sequence from={50} durationInFrames={130}>
    <AnimatedText text="Two aircraft mechanics." style="slam" />
  </Sequence>
  <Sequence from={90} durationInFrames={90}>
    <AnimatedText text="Eleven years on the flight line." style="slam" size="large" />
  </Sequence>
</AbsoluteFill>
```

---

## Scene 2 — CREDIBILITY

| Property | Value |
|----------|-------|
| Frames | 180–420 (8 seconds / 240 frames) |
| Component | `Scene2_Background.tsx` |
| Background | Dark gradient `#0a0a0a` → `#1a1a2e` |

### Animation Timeline

| Frame (relative) | Element | Animation |
|-------------------|---------|-----------|
| 0–20 | Background gradient | `interpolate()` opacity 0→1 |
| 10–70 | "Nate came up through the military..." | `interpolate()` translateX: 100→0, opacity 0→1 (slide from right) |
| 80–140 | "I got my A&P..." | Same slide-in, offset |
| 150–200 | "Between us?..." | `spring()` scale with emphasis on "every corner" |
| 200–240 | Hold | All text visible, slight parallax drift |

### Visual Elements
- Subtle military aircraft silhouette (CSS-only geometric shape, dark gray on near-black)
- A&P license badge graphic (styled div with border + text)
- Text slides in from the right with `interpolate(frame, [0, 20], [100, 0])` translateX

---

## Scene 3 — THE PROBLEM

| Property | Value |
|----------|-------|
| Frames | 420–660 (8 seconds / 240 frames) |
| Component | `Scene3_Problem.tsx` |
| Background | Transitions from `#0a0a0a` to red-tinted `#1a0000` |

### Animation Timeline

| Frame (relative) | Element | Animation |
|-------------------|---------|-----------|
| 0–10 | Background | `interpolate()` backgroundColor shift to red tint |
| 10–30 | "Same problems." | `spring()` slam center |
| 30–50 | "Paperwork nightmares." | Cascade from top — `Series` item 1 |
| 50–70 | "Scheduling chaos." | Cascade item 2 |
| 70–90 | "Compliance headaches..." | Cascade item 3 |
| 100–160 | "Software built in the '90s..." | Hold, then glitch effect (2-frame offset jitter using `random()`) |
| 160–240 | "...still running the show." | Text holds. Red vignette intensifies. |

### Visual Elements
- `<Series>` component for rapid-fire text cascade
- Red color shift via `interpolate(frame, [0, 30], ['#0a0a0a', '#1a0000'])` on background
- Glitch effect: 2-3 frame random translateX/Y jitter on the '90s text using `random('glitch-${frame}')`
- Pain point words get progressively larger font weight

---

## Scene 4 — THE PIVOT

| Property | Value |
|----------|-------|
| Frames | 660–840 (6 seconds / 180 frames) |
| Component | `Scene4_Mission.tsx` |
| Background | Transitions from red-dark to bright `#f0f4ff` |

### Animation Timeline

| Frame (relative) | Element | Animation |
|-------------------|---------|-----------|
| 0–30 | Background | `interpolate()` from `#1a0000` → `#f0f4ff` (darkness lifts) |
| 0–15 | Scale effect | `interpolate(frame, [0, 30], [0.8, 1])` — zoom out, runway acceleration feel |
| 10–50 | "We stopped complaining..." | Slide up + fade in, dark text on bright bg |
| 60–100 | "AI tools. Workflow fixes..." | Quick keyword pops — each word springs individually |
| 100–140 | "Way bigger than one shop." | `spring()` with overshoot — this is THE pivot line |
| 140–180 | Hold | Clean. Bright. Text centered. |

### Visual Elements
- Color palette inversion is the star — dark→light transition over 30 frames
- Individual word animations for "AI tools. Workflow fixes. Common-sense solutions." — each word on its own `spring()` delay
- "Way bigger" gets a subtle scale emphasis (1→1.05→1)

---

## Scene 5 — THE VISION

| Property | Value |
|----------|-------|
| Frames | 840–1080 (8 seconds / 240 frames) |
| Component | `Scene5_Vision.tsx` |
| Background | Clean white `#ffffff` with subtle gradient |

### Animation Timeline

| Frame (relative) | Element | Animation |
|-------------------|---------|-----------|
| 0–60 | AVLY.IO logo | `<LogoReveal logo="avly" />` — `spring()` scale 0→1 with satisfying overshoot |
| 60–100 | "One mission:" | Fade in below logo, `interpolate()` opacity |
| 100–140 | "bring sanity back" | Slide up, larger font |
| 140–180 | "Kill the daily headaches." | Direct, no animation delay — appears cleanly |
| 180–220 | "Replace confusion with clarity." | Final line, slight `spring()` for emphasis |
| 220–240 | Hold | All text + logo visible. First visual breathing room in the video. |

### Visual Elements
- `<LogoReveal>` component — AVLY.IO in bold Inter Black, with a dot animation on the period
- This is the calmest scene — visual relief after problem/pivot intensity
- Generous whitespace, centered layout

---

## Scene 6 — THE PRODUCT

| Property | Value |
|----------|-------|
| Frames | 1080–1380 (10 seconds / 300 frames) |
| Component | `Scene6_Product.tsx` |
| Background | Dark `#0f172a` (slate-900) |

### Animation Timeline

| Frame (relative) | Element | Animation |
|-------------------|---------|-----------|
| 0–40 | "Meet Athelon" | `<LogoReveal logo="athelon" variant="bold" />` — bigger than AVLY reveal |
| 40–60 | Subtitle | "Our first product" fades in |
| 60–100 | Feature cards parade | 5 `<StatCard>` components pop in via staggered `spring()` |
| | | "Planning" → "Quoting" → "Scheduling" → "Resources" → "Compliance" |
| 100–160 | "Part 145 and Part 135" | Text with regulation-style formatting |
| 160–220 | "one platform" | Scale emphasis, centered |
| 220–260 | "Powered by AI..." | Final line with subtle glow effect |
| 260–300 | Hold | Full product slide — everything visible |

### Visual Elements
- `<StatCard>` components: rounded rectangles with label + subtle icon, arranged in a row
- Each StatCard pops in with `spring({ delay: index * 8 })` stagger
- UI mockup frame (styled div resembling a browser window with Athelon UI colors)
- "AI" gets a subtle gradient text effect (blue→purple)

---

## Scene 7 — THE VALUE

| Property | Value |
|----------|-------|
| Frames | 1380–1560 (6 seconds / 180 frames) |
| Component | `Scene7_Value.tsx` |
| Background | Alternating black `#000` / white `#fff` per statement |

### Animation Timeline

| Frame (relative) | Element | Animation |
|-------------------|---------|-----------|
| 0–50 | "This isn't a software upgrade." | White text on black. `spring()` slam. Then bg flips to white. |
| 50–100 | "It's a competitive advantage." | Black text on white. Same slam energy. Then bg flips back. |
| 100–150 | "Make more money. Run better maintenance." | White on black. Bold. |
| 150–170 | "Period." | Holds alone. Full screen. No animation after it lands. |
| 170–180 | Hard cut | 3-frame hold then transition |

### Visual Elements
- Maximum contrast: alternating black/white backgrounds (3-frame transitions)
- Each statement fills ~80% of the screen width
- "Period." is the smallest text but gets the most screen time alone
- No decorative elements — pure typography impact

---

## Scene 8 — THE CTA

| Property | Value |
|----------|-------|
| Frames | 1560–1800 (8 seconds / 240 frames) |
| Component | `Scene8_CTA.tsx` |
| Background | Dark `#0f172a` with subtle blue accent glow |

### Animation Timeline

| Frame (relative) | Element | Animation |
|-------------------|---------|-----------|
| 0–40 | Large "8" | Number animates in huge (200px), then `interpolate()` scales down to inline size |
| 40–80 | "first 8 customers" | Text assembles around the number |
| 80–120 | "Lock in founder pricing — forever." | Slide up with lock icon (CSS geometric) |
| 120–160 | "avly.io/athelon" | `spring()` pop with subtle pulse/glow (`interpolate()` boxShadow) |
| 160–200 | "Grab your spot." | Final rallying text |
| 200–210 | "The future of aviation maintenance starts now." | Quick fade in |
| 210–240 | URL holds | Everything else fades slightly, URL stays prominent. Hard cut to black at frame 240. |

### Visual Elements
- The number "8" is the visual anchor — starts as a hero element, integrates into the sentence
- URL has a pulsing glow: `interpolate(frame % 30, [0, 15, 30], [0, 8, 0])` for boxShadow blur
- Lock icon: CSS-only (styled div with border-radius + keyhole shape)
- Final frame: URL centered on black, 1 second hold, then hard cut

---

## Transition Map

| Between | Type | Frames | Implementation |
|---------|------|--------|----------------|
| Scene 1→2 | White flash | 3 frames | `<SceneTransition type="flash" />` overlay at frame 178–180 |
| Scene 2→3 | Glitch cut | 3 frames | `<SceneTransition type="glitch" />` at frame 418–420 |
| Scene 3→4 | Color wipe | 15 frames | Built into Scene 4's background `interpolate()` |
| Scene 4→5 | Clean fade | 10 frames | `interpolate()` opacity crossfade |
| Scene 5→6 | Hard cut | 1 frame | Direct — no transition component needed |
| Scene 6→7 | White flash | 3 frames | `<SceneTransition type="flash" />` |
| Scene 7→8 | Hard cut | 1 frame | Direct — maintains urgency |
| Scene 8→end | Black hold | 30 frames | Last second is URL on black |
