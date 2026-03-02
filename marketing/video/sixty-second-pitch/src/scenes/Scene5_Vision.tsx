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
import { LogoReveal } from "../components/LogoReveal";

/**
 * Scene 5 — THE VISION (V2 Enhanced)
 * 240 frames / 8 seconds @ 30fps
 *
 * The calm scene. Clean white background with a subtle radial gradient.
 * AVLY.IO logo with dot animation. Refined typography with
 * elegant fade-in animations. A thin blue divider line separates
 * the logo from the mission text.
 */
export const Scene5_Vision: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Divider line grows in width after logo
  const dividerWidth = interpolate(frame, [40, 70], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dividerOpacity = interpolate(frame, [40, 55], [0, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade-in for mission lines
  const missionFade = interpolate(frame - 60, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sanityFade = interpolate(frame - 100, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sanitySlideY = interpolate(frame - 100, [0, 20], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const killFade = interpolate(frame - 140, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const claritySpring = spring({
    fps,
    frame: Math.max(0, frame - 180),
    config: SPRING_CONFIGS.smooth,
  });
  const clarityTranslateY = interpolate(claritySpring, [0, 1], [12, 0], {
    extrapolateRight: "clamp",
  });

  // Subtle background gradient animation
  const bgGradientAngle = interpolate(frame, [0, 240], [0, 15], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${180 + bgGradientAngle}deg, ${COLORS.visionBg} 0%, ${COLORS.visionSubtle} 100%)`,
      }}
    >
      {/* Content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* AVLY.IO logo — Frame 0 */}
        <Sequence from={0}>
          <LogoReveal logo="avly" />
        </Sequence>

        {/* Divider line */}
        <div
          style={{
            width: dividerWidth,
            height: 2,
            backgroundColor: COLORS.visionAccent,
            opacity: dividerOpacity,
            borderRadius: 1,
            marginTop: 8,
            marginBottom: 8,
          }}
        />

        {/* "One mission:" — Frame 60 */}
        {frame >= 60 && (
          <div
            style={{
              opacity: missionFade,
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.medium,
              fontSize: FONT_SIZES.subtitle,
              color: "#6b7280",
              textAlign: "center",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            One mission
          </div>
        )}

        {/* "bring sanity back to aircraft maintenance" — Frame 100 */}
        {frame >= 100 && (
          <div
            style={{
              opacity: sanityFade,
              transform: `translateY(${sanitySlideY}px)`,
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.bold,
              fontSize: FONT_SIZES.headline,
              color: "#111827",
              textAlign: "center",
              padding: "0 120px",
              lineHeight: 1.2,
            }}
          >
            Bring sanity back to aircraft maintenance.
          </div>
        )}

        {/* "Kill the daily headaches." — Frame 140 */}
        {frame >= 140 && (
          <div
            style={{
              opacity: killFade,
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.medium,
              fontSize: FONT_SIZES.subtitle,
              color: "#374151",
              textAlign: "center",
              padding: "0 80px",
              lineHeight: 1.2,
            }}
          >
            Kill the daily headaches.
          </div>
        )}

        {/* "Replace confusion with clarity." — Frame 180 */}
        {frame >= 180 && (
          <div
            style={{
              opacity: claritySpring,
              transform: `translateY(${clarityTranslateY}px)`,
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.semibold,
              fontSize: FONT_SIZES.subtitle,
              color: "#374151",
              textAlign: "center",
              padding: "0 80px",
              lineHeight: 1.2,
            }}
          >
            Replace confusion with{" "}
            <span style={{ color: COLORS.visionAccent, fontWeight: FONT_WEIGHTS.bold }}>
              clarity.
            </span>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
