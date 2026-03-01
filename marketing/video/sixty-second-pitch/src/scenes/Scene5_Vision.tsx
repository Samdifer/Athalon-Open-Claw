import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
  Sequence,
} from "remotion";
import { SPRING_CONFIGS } from "../styles/common";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { AnimatedText } from "../components/AnimatedText";
import { LogoReveal } from "../components/LogoReveal";

/**
 * Scene 5 — THE VISION
 * 240 frames / 8 seconds @ 30fps
 *
 * Clean white background. The calmest scene in the video.
 * Lots of whitespace, centered layout, deliberate pacing.
 *
 *   Frame 0-60:    AVLY.IO logo centered
 *   Frame 60-100:  "One mission:" subtitle fade in
 *   Frame 100-140: "bring sanity back to aircraft maintenance" slide up
 *   Frame 140-180: "Kill the daily headaches." clean appear
 *   Frame 180-220: "Replace confusion with clarity." spring emphasis
 */
export const Scene5_Vision: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in for "Kill the daily headaches." — clean, no heavy animation
  const cleanAppearOpacity = interpolate(frame - 140, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slight spring emphasis for the final line
  const emphasisSpring = spring({
    fps,
    frame: Math.max(0, frame - 180),
    config: SPRING_CONFIGS.smooth,
  });

  const emphasisTranslateY = interpolate(emphasisSpring, [0, 1], [12, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.visionBg,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 28,
      }}
    >
      {/* AVLY.IO logo — Frame 0 */}
      <Sequence from={0}>
        <LogoReveal logo="avly" />
      </Sequence>

      {/* "One mission:" — Frame 60 */}
      <Sequence from={60}>
        <AnimatedText
          text="One mission:"
          style="fade"
          size="subtitle"
          color="#111827"
          weight="medium"
          align="center"
        />
      </Sequence>

      {/* "bring sanity back to aircraft maintenance" — Frame 100 */}
      <Sequence from={100}>
        <AnimatedText
          text="bring sanity back to aircraft maintenance"
          style="slide"
          size="headline"
          color="#111827"
          weight="bold"
          align="center"
        />
      </Sequence>

      {/* "Kill the daily headaches." — Frame 140, clean appear */}
      {frame >= 140 && (
        <div
          style={{
            opacity: cleanAppearOpacity,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.medium,
            fontSize: FONT_SIZES.subtitle,
            color: "#111827",
            textAlign: "center",
            padding: "0 80px",
            lineHeight: 1.2,
          }}
        >
          Kill the daily headaches.
        </div>
      )}

      {/* "Replace confusion with clarity." — Frame 180, spring emphasis */}
      {frame >= 180 && (
        <div
          style={{
            opacity: emphasisSpring,
            transform: `translateY(${emphasisTranslateY}px)`,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.semibold,
            fontSize: FONT_SIZES.subtitle,
            color: "#111827",
            textAlign: "center",
            padding: "0 80px",
            lineHeight: 1.2,
          }}
        >
          Replace confusion with clarity.
        </div>
      )}
    </AbsoluteFill>
  );
};
