import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
  Sequence,
} from "remotion";
import { SPRING_CONFIGS } from "../styles/common";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { AnimatedText } from "../components/AnimatedText";

/**
 * Scene 8 — THE CTA
 * 240 frames / 8 seconds @ 30fps
 *
 * Dark background with subtle blue glow. Urgency builds to close.
 *
 *   Frame 0-40:    The number "8" starts huge, scales down as text assembles
 *   Frame 40-80:   "We're taking our first 8 customers." assembles
 *   Frame 80-120:  "Lock in founder pricing — forever." with CSS lock icon
 *   Frame 120-160: "avly.io/athelon" with pulsing glow
 *   Frame 160-200: "Grab your spot." fade in
 *   Frame 200-210: "The future of aviation maintenance starts now." quick fade
 *   Frame 210-240: URL stays prominent, other text fades to 0.6, hard cut feel
 */

/** CSS-only lock icon using div with border-radius shapes */
const LockIcon: React.FC<{ opacity: number }> = ({ opacity }) => {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        marginRight: 12,
        opacity,
        position: "relative",
        top: -2,
      }}
    >
      {/* Shackle — small circle on top */}
      <div
        style={{
          width: 20,
          height: 16,
          borderRadius: "10px 10px 0 0",
          border: `3px solid ${COLORS.ctaUrgent}`,
          borderBottom: "none",
          marginBottom: -2,
        }}
      />
      {/* Lock body — rectangle */}
      <div
        style={{
          width: 28,
          height: 20,
          borderRadius: 4,
          backgroundColor: COLORS.ctaUrgent,
        }}
      />
    </div>
  );
};

export const Scene8_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // --- Phase 1: The big "8" scaling down (Frame 0-40) ---
  const eightScale = interpolate(frame, [0, 40], [1, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const eightOpacity = interpolate(frame, [0, 35, 40], [1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 2: Full sentence assembles (Frame 40-80) ---
  const sentenceSpring = spring({
    fps,
    frame: Math.max(0, frame - 40),
    config: SPRING_CONFIGS.snappy,
  });

  // --- Phase 3: Lock in pricing (Frame 80-120) ---
  const lockSlideUp = interpolate(frame - 80, [0, 25], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lockOpacity = interpolate(frame - 80, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 4: URL with pulsing glow (Frame 120-240) ---
  const urlSpring = spring({
    fps,
    frame: Math.max(0, frame - 120),
    config: SPRING_CONFIGS.pop,
  });

  // Pulsing glow: cycles every 30 frames
  const glowFrame = Math.max(0, frame - 120);
  const glowSize = frame >= 120
    ? interpolate(glowFrame % 30, [0, 15, 30], [0, 12, 0], {
        extrapolateRight: "clamp",
      })
    : 0;

  // --- Phase 5: "Grab your spot." (Frame 160-200) ---
  const grabOpacity = interpolate(frame - 160, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 6: "The future..." (Frame 200-210) ---
  const futureOpacity = interpolate(frame - 200, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Phase 7: Fade-out of supporting text (Frame 210-240) ---
  const supportFade = interpolate(frame, [210, 230], [1, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle background glow
  const bgGlowOpacity = interpolate(frame, [0, 60], [0, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.ctaBg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 24,
      }}
    >
      {/* Subtle blue glow in background */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.ctaGlow} 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          opacity: bgGlowOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Phase 1: The big "8" — Frame 0-40 */}
      {frame < 40 && (
        <div
          style={{
            opacity: eightOpacity,
            transform: `scale(${eightScale})`,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.black,
            fontSize: FONT_SIZES.mega,
            color: COLORS.ctaUrgent,
            textAlign: "center",
            lineHeight: 1,
          }}
        >
          8
        </div>
      )}

      {/* Phase 2: "We're taking our first 8 customers." — Frame 40+ */}
      {frame >= 40 && (
        <div
          style={{
            opacity: sentenceSpring * supportFade,
            transform: `scale(${interpolate(sentenceSpring, [0, 1], [0.9, 1], { extrapolateRight: "clamp" })})`,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.bold,
            fontSize: FONT_SIZES.title,
            color: COLORS.white,
            textAlign: "center",
            padding: "0 120px",
            lineHeight: 1.2,
          }}
        >
          We're taking our first{" "}
          <span
            style={{
              color: COLORS.ctaUrgent,
              fontWeight: FONT_WEIGHTS.black,
            }}
          >
            8
          </span>{" "}
          customers.
        </div>
      )}

      {/* Phase 3: "Lock in founder pricing — forever." — Frame 80+ */}
      {frame >= 80 && (
        <div
          style={{
            opacity: lockOpacity * supportFade,
            transform: `translateY(${lockSlideUp}px)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LockIcon opacity={lockOpacity} />
          <span
            style={{
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.semibold,
              fontSize: FONT_SIZES.subtitle,
              color: COLORS.white,
              lineHeight: 1.2,
            }}
          >
            Lock in founder pricing —{" "}
            <span style={{ color: COLORS.ctaUrgent, fontWeight: FONT_WEIGHTS.bold }}>
              forever.
            </span>
          </span>
        </div>
      )}

      {/* Phase 4: "avly.io/athelon" — Frame 120+, pulsing glow */}
      {frame >= 120 && (
        <div
          style={{
            opacity: urlSpring,
            transform: `scale(${urlSpring})`,
            fontFamily: FONTS.mono,
            fontWeight: FONT_WEIGHTS.bold,
            fontSize: FONT_SIZES.headline,
            color: COLORS.white,
            textAlign: "center",
            padding: "16px 48px",
            borderRadius: 16,
            boxShadow: `0 0 ${glowSize}px ${COLORS.ctaGlow}`,
            lineHeight: 1.2,
          }}
        >
          avly.io/athelon
        </div>
      )}

      {/* Phase 5: "Grab your spot." — Frame 160+ */}
      {frame >= 160 && (
        <div
          style={{
            opacity: grabOpacity * supportFade,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.semibold,
            fontSize: FONT_SIZES.subtitle,
            color: COLORS.ctaUrgent,
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          Grab your spot.
        </div>
      )}

      {/* Phase 6: "The future of aviation maintenance starts now." — Frame 200+ */}
      {frame >= 200 && (
        <div
          style={{
            opacity: futureOpacity * supportFade,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.medium,
            fontSize: FONT_SIZES.body,
            color: COLORS.white,
            textAlign: "center",
            padding: "0 160px",
            lineHeight: 1.3,
          }}
        >
          The future of aviation maintenance starts now.
        </div>
      )}
    </AbsoluteFill>
  );
};
