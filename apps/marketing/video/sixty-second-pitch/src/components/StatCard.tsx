import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { SPRING_CONFIGS } from "../styles/common";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";

interface StatCardProps {
  label: string;
  delay?: number;
  index?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  delay = 0,
  index = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay - index * 8);

  const scale = spring({
    fps,
    frame: adjustedFrame,
    config: SPRING_CONFIGS.snappy,
  });

  const opacity = spring({
    fps,
    frame: adjustedFrame,
    config: SPRING_CONFIGS.smooth,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 32px",
        borderRadius: 12,
        backgroundColor: "rgba(59, 130, 246, 0.15)",
        border: `1px solid ${COLORS.productAccent}`,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
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
