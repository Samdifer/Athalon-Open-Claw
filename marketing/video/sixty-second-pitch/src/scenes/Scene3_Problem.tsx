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
import { AnimatedText } from "../components/AnimatedText";

/**
 * Scene 3 — THE PROBLEM
 * 240 frames / 8 seconds @ 30fps
 *
 * Background transitions from near-black (#0a0a0a) to dark red (#1a0000).
 * Opens with a spring-slammed center line, then rapid cascade of pain points,
 * followed by a glitch-jittered hold line.
 */
export const Scene3_Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background color interpolation: near-black to dark red over first 30 frames
  const bgProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Interpolate RGB channels individually: #0a0a0a -> #1a0000
  const bgR = interpolate(bgProgress, [0, 1], [10, 26], {
    extrapolateRight: "clamp",
  });
  const bgG = interpolate(bgProgress, [0, 1], [10, 0], {
    extrapolateRight: "clamp",
  });
  const bgB = interpolate(bgProgress, [0, 1], [10, 0], {
    extrapolateRight: "clamp",
  });
  const backgroundColor = `rgb(${Math.round(bgR)}, ${Math.round(bgG)}, ${Math.round(bgB)})`;

  // Glitch jitter for the "Software built in the '90s" line (frames 100-160)
  const isGlitchActive = frame >= 100 && frame <= 160;
  const glitchX = isGlitchActive
    ? (random(`problem-glitch-x-${frame}`) * 8 - 4)
    : 0;
  const glitchY = isGlitchActive
    ? (random(`problem-glitch-y-${frame}`) * 6 - 3)
    : 0;

  // Only apply jitter on every other frame for a 2-frame jitter feel
  const jitterX = frame % 2 === 0 ? glitchX : 0;
  const jitterY = frame % 2 === 0 ? glitchY : 0;

  // Opacity for the glitch line — fades in at frame 100
  const glitchLineOpacity = interpolate(frame, [100, 112], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
      }}
    >
      {/* Opening line — Frame 10, spring slam center */}
      <Sequence from={10}>
        <div style={{ marginBottom: 32 }}>
          <AnimatedText
            text="And no matter where we went — same problems."
            style="slam"
            size="title"
            color={COLORS.white}
            weight="bold"
            align="center"
          />
        </div>
      </Sequence>

      {/* Rapid cascade of pain points */}
      <Sequence from={40}>
        <AnimatedText
          text="Paperwork nightmares."
          style="cascade"
          size="subtitle"
          color={COLORS.problemText}
          weight="semibold"
          align="center"
        />
      </Sequence>

      <Sequence from={55}>
        <AnimatedText
          text="Scheduling chaos."
          style="cascade"
          size="subtitle"
          color={COLORS.problemText}
          weight="semibold"
          align="center"
        />
      </Sequence>

      <Sequence from={70}>
        <AnimatedText
          text="Compliance headaches that never end."
          style="cascade"
          size="subtitle"
          color={COLORS.problemText}
          weight="semibold"
          align="center"
        />
      </Sequence>

      {/* Glitch line — Frame 100-160, holds with jitter effect */}
      <Sequence from={100}>
        <div
          style={{
            marginTop: 40,
            opacity: glitchLineOpacity,
            transform: `translateX(${jitterX}px) translateY(${jitterY}px)`,
          }}
        >
          <div
            style={{
              color: COLORS.problemAccent,
              fontFamily: FONTS.mono,
              fontWeight: FONT_WEIGHTS.bold,
              fontSize: FONT_SIZES.subtitle,
              textAlign: "center",
              lineHeight: 1.2,
              padding: "0 80px",
            }}
          >
            Software built in the '90s... still running the show.
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
