import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill } from "remotion";
import { COLORS } from "../styles/colors";
import { TextReveal } from "../components/TextReveal";
import { LogoReveal } from "../components/LogoReveal";
import { GlowOrb } from "../components/GlowOrb";
import { ParticleField } from "../components/ParticleField";

export const Scene5_AvlyAthelon: React.FC = () => {
  const frame = useCurrentFrame();

  const isPartTwo = frame >= 115;

  // Flash transition
  const flashOpacity = frame >= 108 && frame <= 118
    ? interpolate(frame, [108, 111, 118], [0, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  // Aurora gradient fade-in (Part 1)
  const auroraOpacity = interpolate(frame, [10, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Part 2 content fade
  const part2Opacity = interpolate(frame, [118, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.nearBlack }}>
      {/* Part 1 background */}
      {!isPartTwo && (
        <>
          <AbsoluteFill style={{ background: COLORS.auroraGradient, opacity: auroraOpacity }} />
          <GlowOrb x={50} y={45} size={500} color={COLORS.primaryGlow} opacity={0.08} />
        </>
      )}

      {/* Part 2 background */}
      {isPartTwo && (
        <>
          <AbsoluteFill style={{ background: COLORS.heroGradient, opacity: part2Opacity }} />
          <AbsoluteFill style={{ background: COLORS.meshGradient, opacity: part2Opacity * 0.8 }} />
          <GlowOrb x={50} y={40} size={600} color={COLORS.primaryGlow} opacity={0.1} />
          <ParticleField count={30} color="rgba(129,140,248,0.3)" speed={0.4} maxSize={2} seed="s5" opacity={part2Opacity} />
        </>
      )}

      {/* Part 1 content */}
      {!isPartTwo && (
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 40, padding: "0 200px" }}>
          <LogoReveal logo="avly" variant="clean" delay={5} />
          <TextReveal text="Taking 90s software into the modern age." delay={40} size="title" color={COLORS.muted} align="center" />
        </AbsoluteFill>
      )}

      {/* Part 2 content */}
      {isPartTwo && (
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 40, padding: "0 200px", opacity: part2Opacity }}>
          <LogoReveal logo="athelon" variant="clean" delay={120} />
          <TextReveal
            text="Introducing Athelon, our first product."
            delay={145}
            size="title"
            color={COLORS.offWhite}
            align="center"
            highlights={[{ word: "Athelon,", color: COLORS.primaryGlow, weight: "extrabold" }]}
          />
        </AbsoluteFill>
      )}

      {/* Flash transition */}
      {flashOpacity > 0 && (
        <AbsoluteFill style={{ backgroundColor: COLORS.white, opacity: flashOpacity, zIndex: 50 }} />
      )}
    </AbsoluteFill>
  );
};
