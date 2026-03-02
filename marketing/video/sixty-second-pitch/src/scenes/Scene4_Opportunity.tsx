import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { SPRING_CONFIGS } from "../styles/common";
import { CinematicImage } from "../components/CinematicImage";
import { TextReveal } from "../components/TextReveal";
import { GlowOrb } from "../components/GlowOrb";
import { ParticleField } from "../components/ParticleField";

export const Scene4_Opportunity: React.FC = () => {
  const frame = useCurrentFrame();

  // Underline animation for "bring sanity back"
  const underlineWidth = interpolate(frame, [60, 85], [0, 340], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const underlineOpacity = interpolate(frame, [60, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Strikethrough for "daily headaches"
  const strikeWidth = interpolate(frame, [170, 195], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <CinematicImage src="images/aircraft-sunset.jpg" overlayColor={COLORS.darkSlate} overlayOpacity={0.65} zoomEnd={1.05} panY={-5} />
      <GlowOrb x={30} y={40} size={500} color={COLORS.primaryGlow} opacity={0.07} />
      <GlowOrb x={75} y={65} size={400} color={COLORS.blueGlow} opacity={0.05} />
      <ParticleField count={25} color="rgba(99,102,241,0.25)" speed={0.4} maxSize={2} seed="s4" />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 160px" }}>
        <div style={{ position: "relative", marginBottom: 48 }}>
          <TextReveal
            text="Bring sanity back to aircraft operations."
            delay={10}
            size="headline"
            highlights={[
              { word: "Bring", color: COLORS.blueGlow },
              { word: "sanity", color: COLORS.blueGlow },
              { word: "back", color: COLORS.blueGlow },
            ]}
          />
          {/* Animated underline below highlight */}
          <div style={{
            position: "absolute", bottom: -8, left: 0,
            width: underlineWidth, height: 3,
            backgroundColor: COLORS.blue,
            boxShadow: `0 0 10px ${COLORS.blueGlow}`,
            opacity: underlineOpacity,
            borderRadius: 2,
          }} />
        </div>

        <div style={{ position: "relative", display: "inline-block" }}>
          <TextReveal
            text="Get rid of the daily headaches."
            delay={110}
            size="title"
            color={COLORS.muted}
          />
          {/* Strikethrough animation */}
          <div style={{
            position: "absolute", top: "50%", left: 0,
            width: `${strikeWidth}%`, height: 3,
            backgroundColor: COLORS.red,
            borderRadius: 2,
            opacity: strikeWidth > 0 ? 0.7 : 0,
          }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
