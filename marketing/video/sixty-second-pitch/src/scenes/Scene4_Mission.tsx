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

/**
 * Scene 4 — THE PIVOT
 * 180 frames / 6 seconds @ 30fps
 *
 * Background transitions from dark red (#1a0000) to bright blue-white (#f0f4ff).
 * Opens with a zoom-out from 0.8 to 1.0 scale, fade-up text in dark color,
 * then three words pop individually, followed by a closing realization line
 * with overshoot scale emphasis.
 */
export const Scene4_Mission: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background color transition: #1a0000 -> #f0f4ff over frames 0-30
  const bgProgress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Interpolate RGB channels: #1a0000 (26,0,0) -> #f0f4ff (240,244,255)
  const bgR = interpolate(bgProgress, [0, 1], [26, 240], {
    extrapolateRight: "clamp",
  });
  const bgG = interpolate(bgProgress, [0, 1], [0, 244], {
    extrapolateRight: "clamp",
  });
  const bgB = interpolate(bgProgress, [0, 1], [0, 255], {
    extrapolateRight: "clamp",
  });
  const backgroundColor = `rgb(${Math.round(bgR)}, ${Math.round(bgG)}, ${Math.round(bgB)})`;

  // Zoom-out effect: scale from 0.8 to 1.0 over frames 0-30
  const zoomScale = interpolate(frame, [0, 30], [0.8, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Pop springs for the three words (staggered)
  const pop1 = spring({
    fps,
    frame: Math.max(0, frame - 60),
    config: SPRING_CONFIGS.pop,
  });
  const pop2 = spring({
    fps,
    frame: Math.max(0, frame - 73),
    config: SPRING_CONFIGS.pop,
  });
  const pop3 = spring({
    fps,
    frame: Math.max(0, frame - 86),
    config: SPRING_CONFIGS.pop,
  });

  // Overshoot scale for the closing line — uses pop config for bounce
  const closingSpring = spring({
    fps,
    frame: Math.max(0, frame - 110),
    config: SPRING_CONFIGS.pop,
  });
  const closingScale = interpolate(closingSpring, [0, 1], [0.85, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        transform: `scale(${zoomScale})`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 20,
      }}
    >
      {/* Opening line — Frame 10, fade up, dark text */}
      <Sequence from={10}>
        <div style={{ marginBottom: 40 }}>
          <AnimatedText
            text="We stopped complaining and started building."
            style="fade"
            size="title"
            color={COLORS.brightText}
            weight="bold"
            align="center"
          />
        </div>
      </Sequence>

      {/* Three words pop individually with staggered springs */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 60,
          marginBottom: 40,
        }}
      >
        {/* Word 1 — "AI tools." pops at frame 60 */}
        <div
          style={{
            opacity: pop1,
            transform: `scale(${pop1})`,
            color: COLORS.brightText,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.extrabold,
            fontSize: FONT_SIZES.headline,
            textAlign: "center",
          }}
        >
          AI tools.
        </div>

        {/* Word 2 — "Workflow fixes." pops at frame 73 */}
        <div
          style={{
            opacity: pop2,
            transform: `scale(${pop2})`,
            color: COLORS.brightText,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.extrabold,
            fontSize: FONT_SIZES.headline,
            textAlign: "center",
          }}
        >
          Workflow fixes.
        </div>

        {/* Word 3 — "Common-sense solutions." pops at frame 86 */}
        <div
          style={{
            opacity: pop3,
            transform: `scale(${pop3})`,
            color: COLORS.brightText,
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.extrabold,
            fontSize: FONT_SIZES.headline,
            textAlign: "center",
          }}
        >
          Common-sense solutions.
        </div>
      </div>

      {/* Closing realization — Frame 110, spring with overshoot scale */}
      <Sequence from={110}>
        <div
          style={{
            transform: `scale(${closingScale})`,
            transformOrigin: "center center",
          }}
        >
          <AnimatedText
            text="Then we realized — this is way bigger than one shop."
            style="slam"
            size="title"
            color={COLORS.brightText}
            weight="bold"
            align="center"
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
