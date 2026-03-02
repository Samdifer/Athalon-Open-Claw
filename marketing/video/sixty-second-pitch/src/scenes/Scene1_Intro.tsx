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
import { ParticleField } from "../components/ParticleField";
import { GlowOrb } from "../components/GlowOrb";
import { GridOverlay } from "../components/GridOverlay";

/**
 * Scene 1 — THE HOOK (V2 Enhanced)
 * 180 frames / 6 seconds @ 30fps
 *
 * Deep black background with subtle blue glow orb and floating particles.
 * Three lines slam in with underline accent animations.
 * Grid overlay adds technical depth.
 */
export const Scene1_Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Underline animations — grow from 0% to 100% width after text lands
  const underline1 = interpolate(frame, [22, 40], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const underline2 = interpolate(frame, [62, 80], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Line 3 gets a subtle scale pulse after landing
  const line3Spring = spring({
    fps,
    frame: Math.max(0, frame - 90),
    config: SPRING_CONFIGS.slam,
  });
  const line3Pulse = frame > 110
    ? interpolate(frame, [110, 125, 140], [1, 1.03, 1], {
        extrapolateRight: "clamp",
      })
    : 1;

  // Overall scene fade-in from pure black
  const sceneFade = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.hookBg,
        opacity: sceneFade,
      }}
    >
      {/* Ambient glow orb — blue, bottom-right */}
      <GlowOrb
        x={70}
        y={65}
        size={500}
        color={COLORS.hookGlow}
        opacity={0.12}
        speed={0.5}
      />

      {/* Subtle grid overlay */}
      <GridOverlay
        cellSize={80}
        color="rgba(96,165,250,0.03)"
        speed={0.3}
        scanlines
      />

      {/* Floating particles — sparse, elegant */}
      <ParticleField
        count={25}
        color="rgba(96,165,250,0.4)"
        speed={0.4}
        maxSize={3}
        opacity={0.5}
        seed="hook"
      />

      {/* Text content container */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 40,
        }}
      >
        {/* Line 1 — Frame 10 */}
        <Sequence from={10}>
          <div style={{ position: "relative", textAlign: "center" }}>
            <div
              style={{
                opacity: spring({ fps, frame: Math.max(0, frame - 10), config: SPRING_CONFIGS.slam }),
                transform: `scale(${spring({ fps, frame: Math.max(0, frame - 10), config: SPRING_CONFIGS.slam })})`,
                color: COLORS.white,
                fontFamily: FONTS.heading,
                fontWeight: FONT_WEIGHTS.bold,
                fontSize: FONT_SIZES.title,
                letterSpacing: "-0.01em",
              }}
            >
              I'm Sam. This is Nate.
            </div>
            {/* Accent underline */}
            <div
              style={{
                position: "absolute",
                bottom: -8,
                left: "50%",
                transform: "translateX(-50%)",
                width: `${underline1}%`,
                height: 3,
                backgroundColor: COLORS.hookAccent,
                borderRadius: 2,
                opacity: 0.6,
                boxShadow: `0 0 8px ${COLORS.hookAccent}`,
              }}
            />
          </div>
        </Sequence>

        {/* Line 2 — Frame 50 */}
        <Sequence from={50}>
          <div style={{ position: "relative", textAlign: "center" }}>
            <div
              style={{
                opacity: spring({ fps, frame: Math.max(0, frame - 50), config: SPRING_CONFIGS.slam }),
                transform: `scale(${spring({ fps, frame: Math.max(0, frame - 50), config: SPRING_CONFIGS.slam })})`,
                color: COLORS.white,
                fontFamily: FONTS.heading,
                fontWeight: FONT_WEIGHTS.bold,
                fontSize: FONT_SIZES.title,
                letterSpacing: "-0.01em",
              }}
            >
              Two aircraft mechanics.
            </div>
            <div
              style={{
                position: "absolute",
                bottom: -8,
                left: "50%",
                transform: "translateX(-50%)",
                width: `${underline2}%`,
                height: 3,
                backgroundColor: COLORS.hookAccent,
                borderRadius: 2,
                opacity: 0.6,
                boxShadow: `0 0 8px ${COLORS.hookAccent}`,
              }}
            />
          </div>
        </Sequence>

        {/* Line 3 — Frame 90, larger + pulse emphasis */}
        <Sequence from={90}>
          <div
            style={{
              opacity: line3Spring,
              transform: `scale(${line3Spring * line3Pulse})`,
              color: COLORS.white,
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.extrabold,
              fontSize: FONT_SIZES.headline,
              textAlign: "center",
              letterSpacing: "-0.02em",
              textShadow: `0 0 40px ${COLORS.hookGlow}`,
            }}
          >
            Eleven years on the flight line.
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
