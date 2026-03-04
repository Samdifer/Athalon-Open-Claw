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
import { LogoReveal } from "../components/LogoReveal";
import { GlowOrb } from "../components/GlowOrb";
import { GridOverlay } from "../components/GridOverlay";
import { ParticleField } from "../components/ParticleField";

/**
 * Scene 6 — THE PRODUCT (V2 Enhanced)
 * 300 frames / 10 seconds @ 30fps
 *
 * Dark background with gradient mesh. Athelon logo reveal is bigger and bolder.
 * Feature cards have icons and glow effects. UI mockup frame added.
 * "AI" text gets animated gradient.
 */

const FEATURES = [
  { label: "Planning", icon: "P" },
  { label: "Quoting", icon: "Q" },
  { label: "Scheduling", icon: "S" },
  { label: "Resources", icon: "R" },
  { label: "Compliance", icon: "C" },
];

/** Enhanced feature card with icon and glow */
const FeatureCard: React.FC<{
  label: string;
  icon: string;
  index: number;
}> = ({ label, icon, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - index * 8);
  const scale = spring({ fps, frame: adjustedFrame, config: SPRING_CONFIGS.snappy });
  const opacity = spring({ fps, frame: adjustedFrame, config: SPRING_CONFIGS.smooth });

  // Subtle glow pulse after card appears
  const glowIntensity = adjustedFrame > 20
    ? Math.sin(adjustedFrame * 0.1 + index) * 3 + 4
    : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 28px",
        borderRadius: 14,
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        border: "1px solid rgba(59, 130, 246, 0.3)",
        transform: `scale(${scale})`,
        opacity,
        boxShadow: `0 0 ${glowIntensity}px rgba(59,130,246,0.3)`,
        gap: 8,
        minWidth: 140,
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONTS.mono,
          fontWeight: FONT_WEIGHTS.bold,
          fontSize: 16,
          color: COLORS.productAccent,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontFamily: FONTS.heading,
          fontWeight: FONT_WEIGHTS.semibold,
          fontSize: FONT_SIZES.body,
          color: COLORS.white,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </span>
    </div>
  );
};

/** UI mockup frame — represents the Athelon dashboard */
const UIMockup: React.FC<{ opacity: number }> = ({ opacity }) => {
  return (
    <div
      style={{
        width: 700,
        height: 100,
        borderRadius: 12,
        border: "1px solid rgba(59,130,246,0.2)",
        backgroundColor: "rgba(15,23,42,0.8)",
        opacity,
        overflow: "hidden",
      }}
    >
      {/* Title bar dots */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "8px 12px",
          borderBottom: "1px solid rgba(59,130,246,0.1)",
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#ef4444" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22c55e" }} />
        <div
          style={{
            marginLeft: 12,
            fontFamily: FONTS.mono,
            fontSize: 10,
            color: "rgba(148,163,184,0.5)",
          }}
        >
          athelon.avly.io/dashboard
        </div>
      </div>
      {/* Abstract bars representing UI */}
      <div style={{ padding: "10px 16px", display: "flex", gap: 8 }}>
        <div style={{ width: 80, height: 10, backgroundColor: "rgba(59,130,246,0.15)", borderRadius: 4 }} />
        <div style={{ width: 120, height: 10, backgroundColor: "rgba(59,130,246,0.1)", borderRadius: 4 }} />
        <div style={{ width: 60, height: 10, backgroundColor: "rgba(59,130,246,0.08)", borderRadius: 4 }} />
        <div style={{ width: 100, height: 10, backgroundColor: "rgba(59,130,246,0.12)", borderRadius: 4 }} />
        <div style={{ width: 90, height: 10, backgroundColor: "rgba(59,130,246,0.1)", borderRadius: 4 }} />
      </div>
      <div style={{ padding: "4px 16px", display: "flex", gap: 8 }}>
        <div style={{ width: 140, height: 10, backgroundColor: "rgba(6,182,212,0.1)", borderRadius: 4 }} />
        <div style={{ width: 70, height: 10, backgroundColor: "rgba(6,182,212,0.08)", borderRadius: 4 }} />
        <div style={{ width: 110, height: 10, backgroundColor: "rgba(6,182,212,0.12)", borderRadius: 4 }} />
      </div>
    </div>
  );
};

export const Scene6_Product: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "One platform." slam spring
  const platformSlam = spring({
    fps,
    frame: Math.max(0, frame - 160),
    config: SPRING_CONFIGS.slam,
  });

  // AI subtitle fade-in
  const aiSubtitleOpacity = interpolate(frame - 220, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const aiSubtitleTranslateY = interpolate(frame - 220, [0, 20], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // UI mockup fade
  const mockupOpacity = interpolate(frame, [45, 65], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Regulation text
  const regFade = interpolate(frame - 100, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: COLORS.heroGradient }}>
      {/* Ambient glow */}
      <GlowOrb x={50} y={30} size={500} color={COLORS.productAccent} opacity={0.1} speed={0.5} />
      <GlowOrb x={30} y={70} size={300} color={COLORS.productSecondary} opacity={0.08} speed={0.7} />

      {/* Grid */}
      <GridOverlay cellSize={60} color="rgba(59,130,246,0.03)" speed={0.4} />

      {/* Particles */}
      <ParticleField
        count={35}
        color="rgba(59,130,246,0.3)"
        speed={0.5}
        maxSize={3}
        opacity={0.4}
        seed="product"
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
        {/* Athelon logo — Frame 0 */}
        <Sequence from={0}>
          <LogoReveal logo="athelon" variant="bold" />
        </Sequence>

        {/* "Our first product." — Frame 40 */}
        <Sequence from={40}>
          <div
            style={{
              opacity: interpolate(frame - 40, [0, 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.medium,
              fontSize: FONT_SIZES.subtitle,
              color: "rgba(255,255,255,0.7)",
              textAlign: "center",
              letterSpacing: "0.02em",
            }}
          >
            Our first product.
          </div>
        </Sequence>

        {/* UI Mockup */}
        {frame >= 45 && <UIMockup opacity={mockupOpacity} />}

        {/* 5 FeatureCards — Frame 60, staggered */}
        <Sequence from={60}>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 16,
              justifyContent: "center",
              alignItems: "center",
              padding: "0 60px",
            }}
          >
            {FEATURES.map((feat, i) => (
              <FeatureCard key={feat.label} label={feat.label} icon={feat.icon} index={i} />
            ))}
          </div>
        </Sequence>

        {/* "Part 145 and Part 135" — Frame 100 */}
        {frame >= 100 && (
          <div
            style={{
              opacity: regFade,
              fontFamily: FONTS.mono,
              fontWeight: FONT_WEIGHTS.semibold,
              fontSize: FONT_SIZES.body,
              color: COLORS.productAccent,
              textAlign: "center",
              letterSpacing: "0.05em",
              padding: "8px 24px",
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: 8,
            }}
          >
            14 CFR Part 145 + Part 135 — one platform
          </div>
        )}

        {/* "One platform." — Frame 160, slam */}
        {frame >= 160 && (
          <div
            style={{
              opacity: platformSlam,
              transform: `scale(${platformSlam})`,
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.black,
              fontSize: FONT_SIZES.hero,
              color: COLORS.white,
              textAlign: "center",
              lineHeight: 1.1,
              textShadow: `0 0 40px ${COLORS.productAccent}`,
            }}
          >
            One platform.
          </div>
        )}

        {/* "Powered by AI..." — Frame 220 */}
        {frame >= 220 && (
          <div
            style={{
              opacity: aiSubtitleOpacity,
              transform: `translateY(${aiSubtitleTranslateY}px)`,
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.medium,
              fontSize: FONT_SIZES.subtitle,
              color: COLORS.white,
              textAlign: "center",
              padding: "0 120px",
              lineHeight: 1.3,
            }}
          >
            Powered by{" "}
            <span
              style={{
                background: COLORS.aiGradient,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: FONT_WEIGHTS.extrabold,
                fontSize: FONT_SIZES.headline,
              }}
            >
              AI
            </span>{" "}
            that actually understands your operation.
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
