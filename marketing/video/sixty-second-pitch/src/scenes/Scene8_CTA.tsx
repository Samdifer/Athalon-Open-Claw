import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from "remotion";
import { SPRING_CONFIGS } from "../styles/common";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { GlowOrb } from "../components/GlowOrb";
import { ParticleField } from "../components/ParticleField";
import { GridOverlay } from "../components/GridOverlay";

/**
 * Scene 8 — THE CTA (V2 Enhanced)
 * 240 frames / 8 seconds @ 30fps
 *
 * Dark background with blue and amber glow orbs. The "8" animates dramatically.
 * URL has a pulsing neon glow. Enhanced lock icon. Particles add energy.
 * Final frames: everything fades except the URL.
 */

/** Enhanced CSS lock icon with glow */
const LockIcon: React.FC<{ opacity: number }> = ({ opacity }) => {
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        marginRight: 14,
        opacity,
        position: "relative",
        top: -2,
        filter: `drop-shadow(0 0 4px ${COLORS.ctaUrgent})`,
      }}
    >
      <div
        style={{
          width: 22,
          height: 18,
          borderRadius: "11px 11px 0 0",
          border: `3px solid ${COLORS.ctaUrgent}`,
          borderBottom: "none",
          marginBottom: -2,
        }}
      />
      <div
        style={{
          width: 30,
          height: 22,
          borderRadius: 5,
          backgroundColor: COLORS.ctaUrgent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: COLORS.ctaBg,
          }}
        />
      </div>
    </div>
  );
};

export const Scene8_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Big "8" animation (frames 0-40)
  const eightScale = interpolate(frame, [0, 5, 30, 40], [0, 1.2, 1, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eightOpacity = interpolate(frame, [0, 5, 35, 40], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eightGlow = interpolate(frame, [5, 20], [0, 30], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Sentence assembles (frame 40)
  const sentenceSpring = spring({
    fps,
    frame: Math.max(0, frame - 40),
    config: SPRING_CONFIGS.snappy,
  });

  // Lock pricing (frame 80)
  const lockSlideUp = interpolate(frame - 80, [0, 25], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lockOpacity = interpolate(frame - 80, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // URL with pulsing neon glow (frame 120)
  const urlSpring = spring({
    fps,
    frame: Math.max(0, frame - 120),
    config: SPRING_CONFIGS.pop,
  });
  const glowFrame = Math.max(0, frame - 120);
  const glowSize = frame >= 120
    ? interpolate(glowFrame % 30, [0, 15, 30], [4, 16, 4], { extrapolateRight: "clamp" })
    : 0;

  // "Grab your spot." (frame 160)
  const grabOpacity = interpolate(frame - 160, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "The future..." (frame 200)
  const futureOpacity = interpolate(frame - 200, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Supporting text fade
  const supportFade = interpolate(frame, [210, 230], [1, 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Background glow
  const bgGlowOpacity = interpolate(frame, [0, 60], [0, 0.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ctaBg }}>
      {/* Ambient glow orbs */}
      <GlowOrb x={50} y={45} size={500} color={COLORS.ctaGlow} opacity={bgGlowOpacity} speed={0.6} />
      <GlowOrb x={60} y={60} size={300} color={COLORS.ctaUrgent} opacity={bgGlowOpacity * 0.5} speed={0.4} />

      {/* Grid */}
      <GridOverlay cellSize={80} color="rgba(96,165,250,0.02)" speed={0.3} />

      {/* Particles — amber */}
      <ParticleField
        count={30}
        color="rgba(245,158,11,0.3)"
        speed={0.6}
        maxSize={3}
        opacity={0.4}
        seed="cta"
      />

      {/* Content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* Big "8" */}
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
              textShadow: `0 0 ${eightGlow}px ${COLORS.ctaUrgentGlow}`,
            }}
          >
            8
          </div>
        )}

        {/* "We're taking our first 8 customers." */}
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
                fontSize: FONT_SIZES.headline,
                textShadow: `0 0 10px ${COLORS.ctaUrgentGlow}`,
              }}
            >
              8
            </span>{" "}
            customers.
          </div>
        )}

        {/* "Lock in founder pricing — forever." */}
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
              <span
                style={{
                  color: COLORS.ctaUrgent,
                  fontWeight: FONT_WEIGHTS.bold,
                  textShadow: `0 0 6px ${COLORS.ctaUrgentGlow}`,
                }}
              >
                forever.
              </span>
            </span>
          </div>
        )}

        {/* "avly.io/athelon" — pulsing neon glow */}
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
              border: "1px solid rgba(96,165,250,0.3)",
              backgroundColor: "rgba(15,23,42,0.5)",
              boxShadow: `0 0 ${glowSize}px ${COLORS.ctaGlow}, inset 0 0 ${glowSize * 0.5}px rgba(96,165,250,0.1)`,
              lineHeight: 1.2,
            }}
          >
            avly.io/athelon
          </div>
        )}

        {/* "Grab your spot." */}
        {frame >= 160 && (
          <div
            style={{
              opacity: grabOpacity * supportFade,
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.bold,
              fontSize: FONT_SIZES.subtitle,
              color: COLORS.ctaUrgent,
              textAlign: "center",
              lineHeight: 1.2,
              letterSpacing: "0.02em",
              textShadow: `0 0 8px ${COLORS.ctaUrgentGlow}`,
            }}
          >
            Grab your spot.
          </div>
        )}

        {/* "The future of aviation maintenance starts now." */}
        {frame >= 200 && (
          <div
            style={{
              opacity: futureOpacity * supportFade,
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.medium,
              fontSize: FONT_SIZES.body,
              color: "rgba(255,255,255,0.7)",
              textAlign: "center",
              padding: "0 160px",
              lineHeight: 1.3,
            }}
          >
            The future of aviation maintenance starts now.
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
