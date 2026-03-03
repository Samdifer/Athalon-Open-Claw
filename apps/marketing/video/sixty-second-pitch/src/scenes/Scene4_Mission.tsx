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

/**
 * Scene 4 — THE PIVOT (V2 Enhanced)
 * 180 frames / 6 seconds @ 30fps
 *
 * The big tonal shift. Background transitions from dark red to bright blue-white.
 * Enhanced with a "runway acceleration" scale effect, individual word pops
 * with colored accents, and a glowing underline on the realization line.
 */
export const Scene4_Mission: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background color transition: #1a0000 → #f0f4ff over frames 0-30
  const bgProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  const bgR = interpolate(bgProgress, [0, 1], [26, 240], { extrapolateRight: "clamp" });
  const bgG = interpolate(bgProgress, [0, 1], [0, 244], { extrapolateRight: "clamp" });
  const bgB = interpolate(bgProgress, [0, 1], [0, 255], { extrapolateRight: "clamp" });
  const backgroundColor = `rgb(${Math.round(bgR)}, ${Math.round(bgG)}, ${Math.round(bgB)})`;

  // Zoom-out runway effect
  const zoomScale = interpolate(frame, [0, 30], [0.85, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Light rays from center during transition
  const raysOpacity = interpolate(frame, [5, 20, 35], [0, 0.3, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Pop springs for the three words (staggered)
  const pop1 = spring({ fps, frame: Math.max(0, frame - 60), config: SPRING_CONFIGS.pop });
  const pop2 = spring({ fps, frame: Math.max(0, frame - 73), config: SPRING_CONFIGS.pop });
  const pop3 = spring({ fps, frame: Math.max(0, frame - 86), config: SPRING_CONFIGS.pop });

  // Overshoot scale for the closing line
  const closingSpring = spring({ fps, frame: Math.max(0, frame - 110), config: SPRING_CONFIGS.pop });
  const closingScale = interpolate(closingSpring, [0, 1], [0.85, 1], { extrapolateRight: "clamp" });

  // Underline grows on the closing line
  const closingUnderline = interpolate(frame, [120, 145], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        transform: `scale(${zoomScale})`,
      }}
    >
      {/* Light burst during transition */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, transparent 60%)`,
          opacity: raysOpacity,
          pointerEvents: "none",
        }}
      />

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
        {/* Opening line — Frame 10, fade up */}
        <Sequence from={10}>
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                opacity: interpolate(frame - 10, [0, 20], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `translateY(${interpolate(frame - 10, [0, 20], [20, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}px)`,
                color: COLORS.brightText,
                fontFamily: FONTS.heading,
                fontWeight: FONT_WEIGHTS.bold,
                fontSize: FONT_SIZES.title,
                textAlign: "center",
                lineHeight: 1.2,
                padding: "0 80px",
              }}
            >
              We stopped complaining and{" "}
              <span style={{ color: COLORS.brightAccent }}>started building.</span>
            </div>
          </div>
        </Sequence>

        {/* Three words pop — with colored accent blocks behind them */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 40,
            marginBottom: 40,
          }}
        >
          {/* Word 1 — "AI tools." */}
          <div
            style={{
              opacity: pop1,
              transform: `scale(${pop1})`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: -4,
                left: 0,
                right: 0,
                height: 8,
                backgroundColor: COLORS.brightAccent,
                opacity: 0.2,
                borderRadius: 4,
              }}
            />
            <span
              style={{
                color: COLORS.brightText,
                fontFamily: FONTS.heading,
                fontWeight: FONT_WEIGHTS.extrabold,
                fontSize: FONT_SIZES.headline,
              }}
            >
              AI tools.
            </span>
          </div>

          {/* Word 2 — "Workflow fixes." */}
          <div
            style={{
              opacity: pop2,
              transform: `scale(${pop2})`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: -4,
                left: 0,
                right: 0,
                height: 8,
                backgroundColor: COLORS.brightAccent,
                opacity: 0.2,
                borderRadius: 4,
              }}
            />
            <span
              style={{
                color: COLORS.brightText,
                fontFamily: FONTS.heading,
                fontWeight: FONT_WEIGHTS.extrabold,
                fontSize: FONT_SIZES.headline,
              }}
            >
              Workflow fixes.
            </span>
          </div>

          {/* Word 3 — "Common-sense." */}
          <div
            style={{
              opacity: pop3,
              transform: `scale(${pop3})`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: -4,
                left: 0,
                right: 0,
                height: 8,
                backgroundColor: COLORS.brightAccent,
                opacity: 0.2,
                borderRadius: 4,
              }}
            />
            <span
              style={{
                color: COLORS.brightText,
                fontFamily: FONTS.heading,
                fontWeight: FONT_WEIGHTS.extrabold,
                fontSize: FONT_SIZES.headline,
              }}
            >
              Common-sense.
            </span>
          </div>
        </div>

        {/* Closing realization — Frame 110 */}
        <Sequence from={110}>
          <div
            style={{
              transform: `scale(${closingScale})`,
              transformOrigin: "center center",
              opacity: closingSpring,
              position: "relative",
              textAlign: "center",
            }}
          >
            <div
              style={{
                color: COLORS.brightText,
                fontFamily: FONTS.heading,
                fontWeight: FONT_WEIGHTS.bold,
                fontSize: FONT_SIZES.title,
                lineHeight: 1.2,
                padding: "0 80px",
              }}
            >
              This is{" "}
              <span
                style={{
                  color: COLORS.brightAccent,
                  fontWeight: FONT_WEIGHTS.extrabold,
                }}
              >
                way bigger
              </span>{" "}
              than one shop.
            </div>
            {/* Growing underline */}
            <div
              style={{
                position: "absolute",
                bottom: -12,
                left: "50%",
                transform: "translateX(-50%)",
                width: `${closingUnderline}%`,
                maxWidth: 400,
                height: 4,
                backgroundColor: COLORS.brightAccent,
                borderRadius: 2,
                opacity: 0.5,
              }}
            />
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
