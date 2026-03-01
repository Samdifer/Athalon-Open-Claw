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
import { LogoReveal } from "../components/LogoReveal";
import { StatCard } from "../components/StatCard";

/**
 * Scene 6 — THE PRODUCT
 * 300 frames / 10 seconds @ 30fps
 *
 * Dark background (#0f172a). Product showcase with feature cards.
 *
 *   Frame 0-40:    Athelon logo (bold variant)
 *   Frame 40-60:   "Our first product." fades in
 *   Frame 60-100:  5 StatCards in a row, staggered springs
 *   Frame 100-160: "Part 145 and Part 135" mono regulation style
 *   Frame 160-220: "One platform." large slam
 *   Frame 220-260: "Powered by AI..." with styled "AI"
 *   Frame 260-300: Hold — everything visible
 */

const FEATURES = ["Planning", "Quoting", "Scheduling", "Resources", "Compliance"];

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

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.productBg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 32,
      }}
    >
      {/* Athelon logo — Frame 0, bold variant */}
      <Sequence from={0}>
        <LogoReveal logo="athelon" variant="bold" />
      </Sequence>

      {/* "Our first product." — Frame 40 */}
      <Sequence from={40}>
        <AnimatedText
          text="Our first product."
          style="fade"
          size="subtitle"
          color={COLORS.white}
          weight="medium"
          align="center"
        />
      </Sequence>

      {/* 5 StatCards in a row — Frame 60, staggered */}
      <Sequence from={60}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: 20,
            justifyContent: "center",
            alignItems: "center",
            padding: "0 80px",
          }}
        >
          {FEATURES.map((label, i) => (
            <StatCard key={label} label={label} delay={0} index={i} />
          ))}
        </div>
      </Sequence>

      {/* "Part 145 and Part 135" — Frame 100, mono regulation style */}
      <Sequence from={100}>
        <AnimatedText
          text="Part 145 and Part 135"
          style="fade"
          size="subtitle"
          color={COLORS.productAccent}
          weight="semibold"
          align="center"
          mono
        />
      </Sequence>

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
          }}
        >
          One platform.
        </div>
      )}

      {/* "Powered by AI..." — Frame 220, with "AI" styled differently */}
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
            }}
          >
            AI
          </span>{" "}
          that actually understands your operation.
        </div>
      )}
    </AbsoluteFill>
  );
};
