import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from "remotion";
import { SPRING_CONFIGS } from "../styles/common";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";

/**
 * Scene 7 — THE VALUE (V2 Enhanced)
 * 180 frames / 6 seconds @ 30fps
 *
 * Alternating black/white backgrounds with hard 3-frame snaps.
 * Enhanced with side accent bars, dramatic scale effects,
 * and "Period." getting its own visual weight with a subtle glow.
 */
export const Scene7_Value: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background color snaps
  const bgPhase1 = interpolate(frame, [47, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bgPhase2 = interpolate(frame, [97, 100], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bgValue = frame < 50 ? bgPhase1 : bgPhase2;
  const bgR = Math.round(bgValue * 255);
  const backgroundColor = `rgb(${bgR}, ${bgR}, ${bgR})`;

  const textR = Math.round((1 - bgValue) * 255);
  const textColor = `rgb(${textR}, ${textR}, ${textR})`;

  // Accent color
  const accentColor = bgValue < 0.5 ? COLORS.productAccent : COLORS.brightAccent;

  // Slam springs
  const slam1 = spring({ fps, frame: Math.max(0, frame - 5), config: SPRING_CONFIGS.slam });
  const slam2 = spring({ fps, frame: Math.max(0, frame - 55), config: SPRING_CONFIGS.slam });
  const slam3 = spring({ fps, frame: Math.max(0, frame - 105), config: SPRING_CONFIGS.slam });
  const slam4 = spring({ fps, frame: Math.max(0, frame - 152), config: SPRING_CONFIGS.slam });

  // Side accent bars
  const accentBar1Width = interpolate(frame, [8, 20], [0, 6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const accentBar2Width = interpolate(frame, [58, 70], [0, 6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Section 1 */}
      {frame < 50 && (
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: accentBar1Width,
              height: 60,
              backgroundColor: accentColor,
              borderRadius: 3,
              opacity: 0.6,
            }}
          />
          <div
            style={{
              opacity: slam1,
              transform: `scale(${slam1})`,
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.black,
              fontSize: FONT_SIZES.headline,
              color: textColor,
              textAlign: "center",
              padding: "0 80px",
              lineHeight: 1.1,
            }}
          >
            This isn't a software upgrade.
          </div>
        </div>
      )}

      {/* Section 2 */}
      {frame >= 50 && frame < 100 && (
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: accentBar2Width,
              height: 60,
              backgroundColor: accentColor,
              borderRadius: 3,
              opacity: 0.6,
            }}
          />
          <div
            style={{
              opacity: slam2,
              transform: `scale(${slam2})`,
              fontFamily: FONTS.heading,
              fontWeight: FONT_WEIGHTS.black,
              fontSize: FONT_SIZES.headline,
              color: textColor,
              textAlign: "center",
              padding: "0 80px",
              lineHeight: 1.1,
            }}
          >
            It's a{" "}
            <span style={{ borderBottom: `4px solid ${accentColor}`, paddingBottom: 4 }}>
              competitive advantage.
            </span>
          </div>
        </div>
      )}

      {/* Section 3 */}
      {frame >= 100 && frame < 150 && (
        <div
          style={{
            opacity: slam3,
            transform: `scale(${slam3})`,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.black,
            fontSize: FONT_SIZES.headline,
            color: textColor,
            textAlign: "center",
            padding: "0 80px",
            lineHeight: 1.15,
          }}
        >
          Make more money.
          <br />
          Run better maintenance.
        </div>
      )}

      {/* Section 4: "Period." */}
      {frame >= 150 && (
        <div
          style={{
            opacity: slam4,
            transform: `scale(${slam4})`,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.black,
            fontSize: FONT_SIZES.headline,
            color: textColor,
            textAlign: "center",
            letterSpacing: "0.15em",
            lineHeight: 1,
            textShadow: bgValue < 0.5 ? `0 0 20px rgba(59,130,246,0.3)` : "none",
          }}
        >
          Period.
        </div>
      )}
    </AbsoluteFill>
  );
};
