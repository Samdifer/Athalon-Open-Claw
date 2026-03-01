import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  AbsoluteFill,
  Sequence,
} from "remotion";
import { SPRING_CONFIGS } from "../styles/common";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { AnimatedText } from "../components/AnimatedText";

/**
 * Scene 1 — THE HOOK
 * 180 frames / 6 seconds @ 30fps
 *
 * Black background. Three lines slam in sequentially:
 *   Frame 10:  "I'm Sam. This is Nate."
 *   Frame 50:  "Two aircraft mechanics."
 *   Frame 90:  "Eleven years on the flight line."
 */
export const Scene1_Intro: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.black,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 24,
      }}
    >
      {/* Line 1 — Frame 10 */}
      <Sequence from={10}>
        <AnimatedText
          text="I'm Sam. This is Nate."
          style="slam"
          size="title"
          color={COLORS.white}
          weight="bold"
          align="center"
        />
      </Sequence>

      {/* Line 2 — Frame 50 */}
      <Sequence from={50}>
        <AnimatedText
          text="Two aircraft mechanics."
          style="slam"
          size="title"
          color={COLORS.white}
          weight="bold"
          align="center"
        />
      </Sequence>

      {/* Line 3 — Frame 90, slightly larger */}
      <Sequence from={90}>
        <AnimatedText
          text="Eleven years on the flight line."
          style="slam"
          size="headline"
          color={COLORS.white}
          weight="extrabold"
          align="center"
        />
      </Sequence>
    </AbsoluteFill>
  );
};
