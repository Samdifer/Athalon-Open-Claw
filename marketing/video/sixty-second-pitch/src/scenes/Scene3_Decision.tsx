import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { SPRING_CONFIGS } from "../styles/common";
import { TextReveal } from "../components/TextReveal";
import { GlowOrb } from "../components/GlowOrb";

export const Scene3_Decision: React.FC = () => {
  const frame = useCurrentFrame();

  // Green glow fades in
  const glowOpacity = interpolate(frame, [0, 30], [0, 0.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Accent line grows from center
  const lineWidth = interpolate(frame, [40, 70], [0, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineOpacity = interpolate(frame, [40, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.nearBlack }}>
      <GlowOrb x={50} y={50} size={500} color={COLORS.greenGlow} opacity={glowOpacity} />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 200px" }}>
        <div style={{ marginBottom: 32 }}>
          <TextReveal
            text="We decided to give back to the industry."
            delay={8}
            size="headline"
            align="center"
            highlights={[{ word: "give", color: COLORS.green }, { word: "back", color: COLORS.green }]}
          />
        </div>

        {/* Green accent line */}
        <div style={{
          width: lineWidth, height: 2,
          backgroundColor: COLORS.green,
          boxShadow: `0 0 12px ${COLORS.greenGlow}`,
          opacity: lineOpacity,
          borderRadius: 1,
          marginBottom: 32,
        }} />

        <TextReveal
          text="Started building tools for aircraft technicians."
          delay={65}
          size="title"
          color={COLORS.muted}
          align="center"
          highlights={[{ word: "building", color: COLORS.greenGlow }, { word: "tools", color: COLORS.greenGlow }]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
