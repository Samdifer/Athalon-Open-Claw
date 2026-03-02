import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { SPRING_CONFIGS } from "../styles/common";
import { CinematicImage } from "../components/CinematicImage";
import { TextReveal } from "../components/TextReveal";
import { GlowOrb } from "../components/GlowOrb";

export const Scene2_Frustration: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Red glow intensifies over scene
  const redIntensity = interpolate(frame, [0, 180], [0.04, 0.1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pain point data
  const painPoints = [
    { text: "Paperwork nightmares", icon: "✕", delay: 70 },
    { text: "Scheduling chaos", icon: "✕", delay: 95 },
    { text: "Compliance headaches", icon: "✕", delay: 120 },
  ];

  return (
    <AbsoluteFill>
      <CinematicImage src="images/paperwork.jpg" overlayColor={COLORS.redBg} overlayOpacity={0.78} zoomStart={1.02} zoomEnd={1.08} panX={-10} />
      <GlowOrb x={50} y={40} size={600} color={COLORS.red} opacity={redIntensity} />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 160px" }}>
        {/* Opening text */}
        <div style={{ marginBottom: 60 }}>
          <TextReveal
            text="Frustrated with problems that never go away."
            delay={10}
            size="headline"
            highlights={[{ word: "problems", color: COLORS.red, weight: "extrabold" }]}
          />
        </div>

        {/* Pain point cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {painPoints.map(({ text, icon, delay: d }, i) => {
            const progress = spring({ fps, frame: Math.max(0, frame - d), config: SPRING_CONFIGS.snappy });
            const slideX = interpolate(progress, [0, 1], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 20,
                opacity: progress, transform: `translateX(${slideX}px)`,
                backgroundColor: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: 12, padding: "16px 24px",
              }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: FONT_SIZES.body, color: COLORS.red, fontWeight: FONT_WEIGHTS.bold }}>{icon}</span>
                <span style={{ fontFamily: FONTS.heading, fontSize: FONT_SIZES.subtitle, color: COLORS.offWhite, fontWeight: FONT_WEIGHTS.semibold }}>{text}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
