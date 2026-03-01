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
 * Scene 7 — THE VALUE
 * 180 frames / 6 seconds @ 30fps
 *
 * Alternating black/white backgrounds with hard 3-frame snaps.
 * Maximum contrast, maximum impact.
 *
 *   Frame 0-50:    "This isn't a software upgrade." — white on black, slam
 *   Frame 50-100:  "It's a competitive advantage." — black on white, slam
 *   Frame 100-150: "Make more money. Run better maintenance." — white on black
 *   Frame 150-170: "Period." — holds alone, maximum presence
 *   Frame 170-180: Hold
 */
export const Scene7_Value: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background color snaps — 3-frame transitions between black and white
  // Section 1: black (0-47), transition (47-50), Section 2: white (50-97),
  // transition (97-100), Section 3: black (100+)
  const bgPhase1 = interpolate(frame, [47, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bgPhase2 = interpolate(frame, [97, 100], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 0 = black, 1 = white
  const bgValue = frame < 50 ? bgPhase1 : bgPhase2;
  const bgR = Math.round(bgValue * 255);
  const backgroundColor = `rgb(${bgR}, ${bgR}, ${bgR})`;

  // Text colors — inverse of background
  const textR = Math.round((1 - bgValue) * 255);
  const textColor = `rgb(${textR}, ${textR}, ${textR})`;

  // Slam springs for each line
  const slam1 = spring({
    fps,
    frame: Math.max(0, frame - 5),
    config: SPRING_CONFIGS.slam,
  });

  const slam2 = spring({
    fps,
    frame: Math.max(0, frame - 55),
    config: SPRING_CONFIGS.slam,
  });

  const slam3 = spring({
    fps,
    frame: Math.max(0, frame - 105),
    config: SPRING_CONFIGS.slam,
  });

  const slam4 = spring({
    fps,
    frame: Math.max(0, frame - 152),
    config: SPRING_CONFIGS.slam,
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Section 1: "This isn't a software upgrade." — Frame 0-50 */}
      {frame < 50 && (
        <div
          style={{
            opacity: slam1,
            transform: `scale(${slam1})`,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.black,
            fontSize: FONT_SIZES.headline,
            color: textColor,
            textAlign: "center",
            padding: "0 100px",
            lineHeight: 1.1,
          }}
        >
          This isn't a software upgrade.
        </div>
      )}

      {/* Section 2: "It's a competitive advantage." — Frame 50-100 */}
      {frame >= 50 && frame < 100 && (
        <div
          style={{
            opacity: slam2,
            transform: `scale(${slam2})`,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.black,
            fontSize: FONT_SIZES.headline,
            color: textColor,
            textAlign: "center",
            padding: "0 100px",
            lineHeight: 1.1,
          }}
        >
          It's a competitive advantage.
        </div>
      )}

      {/* Section 3: "Make more money. Run better maintenance." — Frame 100-150 */}
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
          Make more money. Run better maintenance.
        </div>
      )}

      {/* Section 4: "Period." — Frame 150+, holds alone, maximum presence */}
      {frame >= 150 && (
        <div
          style={{
            opacity: slam4,
            transform: `scale(${slam4})`,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.black,
            fontSize: FONT_SIZES.title,
            color: textColor,
            textAlign: "center",
            letterSpacing: "0.1em",
            lineHeight: 1,
          }}
        >
          Period.
        </div>
      )}
    </AbsoluteFill>
  );
};
