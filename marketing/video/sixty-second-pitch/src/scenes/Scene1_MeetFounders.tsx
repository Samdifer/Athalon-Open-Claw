import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { SPRING_CONFIGS } from "../styles/common";
import { CinematicImage } from "../components/CinematicImage";
import { TextReveal } from "../components/TextReveal";
import { GlowOrb } from "../components/GlowOrb";
import { ParticleField } from "../components/ParticleField";

export const Scene1_MeetFounders: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Founder badge animation
  const badge1Progress = spring({ fps, frame: Math.max(0, frame - 130), config: SPRING_CONFIGS.snappy });
  const badge2Progress = spring({ fps, frame: Math.max(0, frame - 140), config: SPRING_CONFIGS.snappy });

  // Subtitle fade
  const subtitleOpacity = interpolate(frame, [170, 185], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitleY = interpolate(frame, [170, 185], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <CinematicImage src="images/hangar.jpg" overlayColor="#09090b" overlayOpacity={0.7} zoomEnd={1.06} />
      <GlowOrb x={70} y={50} size={500} color={COLORS.primaryGlow} opacity={0.06} />
      <ParticleField count={20} color="rgba(99,102,241,0.3)" speed={0.5} maxSize={2} seed="s1" />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 160px" }}>
        {/* Main text reveals */}
        <div style={{ marginBottom: 24 }}>
          <TextReveal text="I'm Sam, this is Nate." delay={15} size="headline" align="center" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <TextReveal text="Two aircraft mechanics," delay={50} size="title" color={COLORS.muted} align="center" />
        </div>
        <div style={{ marginBottom: 48 }}>
          <TextReveal
            text="eleven years on the flight line."
            delay={90}
            size="title"
            color={COLORS.offWhite}
            align="center"
            highlights={[{ word: "eleven", color: COLORS.gold }, { word: "years", color: COLORS.gold }]}
          />
        </div>

        {/* Founder badges */}
        <div style={{ display: "flex", gap: 40, marginBottom: 24 }}>
          {[{ initial: "S", progress: badge1Progress }, { initial: "N", progress: badge2Progress }].map(({ initial, progress }) => (
            <div key={initial} style={{
              width: 72, height: 72, borderRadius: "50%",
              backgroundColor: COLORS.glass, border: `1px solid ${COLORS.glassBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: progress, transform: `scale(${interpolate(progress, [0, 1], [0.7, 1])})`,
              boxShadow: `0 0 20px rgba(99,102,241,${progress * 0.2})`,
            }}>
              <span style={{ fontFamily: FONTS.heading, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.body, color: COLORS.white }}>{initial}</span>
            </div>
          ))}
        </div>

        {/* Subtitle */}
        <div style={{ opacity: subtitleOpacity, transform: `translateY(${subtitleY}px)` }}>
          <span style={{ fontFamily: FONTS.mono, fontSize: FONT_SIZES.small, color: COLORS.muted, letterSpacing: "0.05em" }}>
            Nate: military · Sam: A&P certified
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
