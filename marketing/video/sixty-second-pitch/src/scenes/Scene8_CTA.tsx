import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { SPRING_CONFIGS } from "../styles/common";
import { GlowOrb } from "../components/GlowOrb";
import { ParticleField } from "../components/ParticleField";
import { TextReveal } from "../components/TextReveal";

export const Scene8_CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Big "8" animation
  const eightScale = frame < 35
    ? interpolate(frame, [0, 12, 20, 35], [0, 1.2, 1.0, 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : interpolate(frame, [35, 45], [0.4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eightOpacity = interpolate(frame, [0, 5, 35, 45], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // "Taking first 8 customers" reveal
  const line1Progress = spring({ fps, frame: Math.max(0, frame - 40), config: SPRING_CONFIGS.snappy });
  const line1Opacity = interpolate(line1Progress, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line1Y = interpolate(line1Progress, [0, 1], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Lock line
  const line2Progress = spring({ fps, frame: Math.max(0, frame - 80), config: SPRING_CONFIGS.snappy });
  const line2Opacity = interpolate(line2Progress, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line2Y = interpolate(line2Progress, [0, 1], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // URL reveal
  const urlProgress = spring({ fps, frame: Math.max(0, frame - 120), config: SPRING_CONFIGS.smooth });
  const urlOpacity = interpolate(urlProgress, [0, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlScale = interpolate(urlProgress, [0, 1], [0.95, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // URL glow pulse
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  // "Grab your spot" fade
  const grabOpacity = interpolate(frame, [160, 180], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const grabY = interpolate(frame, [160, 180], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Final fade: everything dims except URL
  const finalDim = interpolate(frame, [210, 240], [1, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const urlFinalBright = interpolate(frame, [210, 230, 240], [1, 1, 0.8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.heroGradient }}>
      <AbsoluteFill style={{ background: COLORS.meshGradient }} />
      <GlowOrb x={50} y={45} size={500} color={COLORS.primaryGlow} opacity={0.08} />
      <GlowOrb x={60} y={60} size={400} color={COLORS.amberGlow} opacity={0.06} />
      <ParticleField count={25} color="rgba(245,158,11,0.2)" speed={0.3} maxSize={2} seed="s8" />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 28, padding: "0 160px" }}>
        {/* Big "8" */}
        {eightOpacity > 0 && (
          <span style={{
            position: "absolute",
            fontFamily: FONTS.heading, fontWeight: FONT_WEIGHTS.black,
            fontSize: FONT_SIZES.mega, color: COLORS.gold,
            opacity: eightOpacity, transform: `scale(${eightScale})`,
            textShadow: `0 0 60px ${COLORS.amberGlow}, 0 0 120px rgba(245,158,11,0.3)`,
          }}>
            8
          </span>
        )}

        {/* Line 1: Taking first 8 customers */}
        <div style={{ opacity: line1Opacity * finalDim, transform: `translateY(${line1Y}px)` }}>
          <span style={{ fontFamily: FONTS.heading, fontWeight: FONT_WEIGHTS.extrabold, fontSize: FONT_SIZES.headline, color: COLORS.white }}>
            Taking first <span style={{ color: COLORS.gold }}>8</span> customers.
          </span>
        </div>

        {/* Line 2: Lock in forever pricing */}
        <div style={{ opacity: line2Opacity * finalDim, transform: `translateY(${line2Y}px)`, display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: FONT_SIZES.subtitle }}>🔒</span>
          <span style={{ fontFamily: FONTS.heading, fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.title, color: COLORS.offWhite }}>
            Lock in <span style={{ color: COLORS.gold, fontWeight: FONT_WEIGHTS.bold }}>forever</span> low pricing.
          </span>
        </div>

        {/* URL box */}
        <div style={{
          opacity: urlOpacity * urlFinalBright, transform: `scale(${urlScale})`,
          backgroundColor: COLORS.glass, border: `2px solid rgba(99,102,241,${glowPulse * 0.4})`,
          borderRadius: 16, padding: "20px 48px",
          boxShadow: `0 0 ${30 * glowPulse}px rgba(99,102,241,${glowPulse * 0.25})`,
        }}>
          <span style={{
            fontFamily: FONTS.mono, fontWeight: FONT_WEIGHTS.bold,
            fontSize: FONT_SIZES.headline, color: COLORS.white,
            letterSpacing: "0.02em",
          }}>
            avly.io/athelon
          </span>
        </div>

        {/* Grab your spot */}
        <div style={{ opacity: grabOpacity * finalDim, transform: `translateY(${grabY}px)` }}>
          <span style={{
            fontFamily: FONTS.heading, fontWeight: FONT_WEIGHTS.bold,
            fontSize: FONT_SIZES.subtitle, color: COLORS.gold,
            textShadow: `0 0 15px ${COLORS.amberGlow}`,
          }}>
            Grab your spot now.
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
