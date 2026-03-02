import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { COLORS } from "../styles/colors";
import { SPRING_CONFIGS } from "../styles/common";

interface GlassCardProps {
  icon: string;
  label: string;
  delay?: number;
  width?: number;
  height?: number;
  glowColor?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  icon,
  label,
  delay = 0,
  width = 180,
  height = 160,
  glowColor = COLORS.primary,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  const progress = spring({
    fps,
    frame: adjustedFrame,
    config: SPRING_CONFIGS.snappy,
  });

  const scale = interpolate(progress, [0, 1], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(progress, [0, 1], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        backgroundColor: COLORS.glass,
        border: `1px solid ${COLORS.glassBorder}`,
        borderRadius: 16,
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        boxShadow: `0 0 30px rgba(${glowColor === COLORS.primary ? "99,102,241" : "59,130,246"},${opacity * 0.15})`,
      }}
    >
      <span
        style={{
          fontFamily: FONTS.mono,
          fontSize: FONT_SIZES.subtitle,
          fontWeight: FONT_WEIGHTS.bold,
          color: glowColor,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontFamily: FONTS.heading,
          fontSize: FONT_SIZES.small,
          fontWeight: FONT_WEIGHTS.medium,
          color: COLORS.offWhite,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </span>
    </div>
  );
};
