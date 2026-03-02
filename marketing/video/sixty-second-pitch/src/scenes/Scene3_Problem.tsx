import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
  Sequence,
  random,
} from "remotion";
import { SPRING_CONFIGS } from "../styles/common";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { ParticleField } from "../components/ParticleField";
import { GlowOrb } from "../components/GlowOrb";

/**
 * Scene 3 — THE PROBLEM (V2 Enhanced)
 * 240 frames / 8 seconds @ 30fps
 *
 * Background pulses with red intensity. Pain points cascade with
 * warning-stripe accents. Glitch effect on the '90s line is more dramatic
 * with chromatic aberration and horizontal tear lines.
 */

/** Horizontal tear line — appears during glitch sequences */
const TearLine: React.FC<{ y: number; width: number; opacity: number }> = ({
  y,
  width,
  opacity,
}) => (
  <div
    style={{
      position: "absolute",
      top: `${y}%`,
      left: 0,
      width: `${width}%`,
      height: 2,
      backgroundColor: COLORS.problemAccent,
      opacity,
      boxShadow: `0 0 6px ${COLORS.problemAccent}`,
    }}
  />
);

/** Warning stripe badge for pain points */
const PainPointBadge: React.FC<{
  text: string;
  delay: number;
  index: number;
}> = ({ text, delay, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: SPRING_CONFIGS.snappy,
  });

  const translateY = interpolate(s, [0, 1], [-30, 0]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity: s,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {/* Warning icon — triangle */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderBottom: `14px solid ${COLORS.problemAccent}`,
          opacity: 0.7,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: FONTS.heading,
          fontWeight: FONT_WEIGHTS.semibold,
          fontSize: FONT_SIZES.subtitle,
          color: COLORS.problemText,
          lineHeight: 1.2,
        }}
      >
        {text}
      </span>
    </div>
  );
};

export const Scene3_Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background color: near-black → dark red with pulsing intensity
  const bgProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Pulse red intensity during the cascade (frames 40-160)
  const pulse = frame > 40 && frame < 160
    ? Math.sin(frame * 0.15) * 0.3 + 0.7
    : 1;

  const bgR = interpolate(bgProgress, [0, 1], [10, 26 * pulse], {
    extrapolateRight: "clamp",
  });
  const bgG = interpolate(bgProgress, [0, 1], [10, 0], {
    extrapolateRight: "clamp",
  });
  const bgB = interpolate(bgProgress, [0, 1], [10, 0], {
    extrapolateRight: "clamp",
  });
  const backgroundColor = `rgb(${Math.round(bgR)}, ${Math.round(bgG)}, ${Math.round(bgB)})`;

  // Red vignette that intensifies
  const vignetteOpacity = interpolate(frame, [0, 100, 200], [0, 0.3, 0.5], {
    extrapolateRight: "clamp",
  });

  // Glitch jitter for the '90s line (frames 100-160)
  const isGlitchActive = frame >= 100 && frame <= 160;
  const jitterX = isGlitchActive && frame % 2 === 0
    ? (random(`problem-glitch-x-${frame}`) * 12 - 6)
    : 0;
  const jitterY = isGlitchActive && frame % 2 === 0
    ? (random(`problem-glitch-y-${frame}`) * 8 - 4)
    : 0;

  // Chromatic aberration offset during glitch
  const chromaOffset = isGlitchActive && frame % 3 === 0
    ? random(`chroma-${frame}`) * 4 - 2
    : 0;

  // Tear lines during glitch
  const showTears = isGlitchActive && frame % 4 < 2;

  const glitchLineOpacity = interpolate(frame, [100, 112], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Red glow orb — center, pulses */}
      <GlowOrb
        x={50}
        y={50}
        size={600}
        color={COLORS.problemGlow}
        opacity={vignetteOpacity}
        pulse
        speed={2}
      />

      {/* Red particles */}
      <ParticleField
        count={30}
        color="rgba(239,68,68,0.3)"
        speed={0.8}
        maxSize={3}
        opacity={0.4}
        seed="problem"
      />

      {/* Vignette overlay */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(26,0,0,0.8) 100%)`,
          opacity: vignetteOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Tear lines during glitch */}
      {showTears && (
        <>
          <TearLine y={random(`tear1-${frame}`) * 100} width={random(`tearw1-${frame}`) * 60 + 20} opacity={0.4} />
          <TearLine y={random(`tear2-${frame}`) * 100} width={random(`tearw2-${frame}`) * 40 + 10} opacity={0.3} />
        </>
      )}

      {/* Text content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 20,
        }}
      >
        {/* Opening line — Frame 10 */}
        <Sequence from={10}>
          <div style={{ marginBottom: 32 }}>
            <div
              style={{
                opacity: spring({ fps, frame: Math.max(0, frame - 10), config: SPRING_CONFIGS.slam }),
                transform: `scale(${spring({ fps, frame: Math.max(0, frame - 10), config: SPRING_CONFIGS.slam })})`,
                color: COLORS.white,
                fontFamily: FONTS.heading,
                fontWeight: FONT_WEIGHTS.bold,
                fontSize: FONT_SIZES.title,
                textAlign: "center",
                lineHeight: 1.2,
                padding: "0 80px",
              }}
            >
              And no matter where we went —{" "}
              <span style={{ color: COLORS.problemAccent }}>same problems.</span>
            </div>
          </div>
        </Sequence>

        {/* Pain point cascade with warning badges */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "flex-start",
            paddingLeft: 200,
          }}
        >
          <Sequence from={40}>
            <PainPointBadge text="Paperwork nightmares." delay={40} index={0} />
          </Sequence>
          <Sequence from={55}>
            <PainPointBadge text="Scheduling chaos." delay={55} index={1} />
          </Sequence>
          <Sequence from={70}>
            <PainPointBadge text="Compliance headaches that never end." delay={70} index={2} />
          </Sequence>
        </div>

        {/* Glitch line — '90s software */}
        <Sequence from={100}>
          <div
            style={{
              marginTop: 40,
              opacity: glitchLineOpacity,
              transform: `translateX(${jitterX}px) translateY(${jitterY}px)`,
              position: "relative",
            }}
          >
            {/* Chromatic aberration — red shadow offset */}
            {isGlitchActive && chromaOffset !== 0 && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  color: "rgba(239,68,68,0.3)",
                  fontFamily: FONTS.mono,
                  fontWeight: FONT_WEIGHTS.bold,
                  fontSize: FONT_SIZES.subtitle,
                  textAlign: "center",
                  lineHeight: 1.2,
                  padding: "0 80px",
                  transform: `translateX(${chromaOffset}px)`,
                }}
              >
                Software built in the '90s... still running the show.
              </div>
            )}
            <div
              style={{
                color: COLORS.problemAccent,
                fontFamily: FONTS.mono,
                fontWeight: FONT_WEIGHTS.bold,
                fontSize: FONT_SIZES.subtitle,
                textAlign: "center",
                lineHeight: 1.2,
                padding: "0 80px",
                position: "relative",
              }}
            >
              Software built in the '90s... still running the show.
            </div>
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
