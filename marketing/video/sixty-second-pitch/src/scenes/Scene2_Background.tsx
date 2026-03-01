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
 * Scene 2 — CREDIBILITY
 * 240 frames / 8 seconds @ 30fps
 *
 * Dark gradient background with CSS-only aircraft silhouette decoration.
 * Three text blocks slide in from the right sequentially, then a final
 * line springs in with emphasis.
 */

/** CSS-only aircraft silhouette using border triangles, positioned in the bottom-right. */
const AircraftSilhouette: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        right: 100,
        opacity: 0.06,
      }}
    >
      {/* Fuselage — long horizontal triangle pointing right */}
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "20px solid transparent",
          borderBottom: "20px solid transparent",
          borderLeft: "260px solid #444",
          position: "absolute",
          bottom: 30,
          right: 0,
        }}
      />
      {/* Main wing — wide triangle */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "100px solid transparent",
          borderRight: "100px solid transparent",
          borderBottom: "40px solid #444",
          position: "absolute",
          bottom: 20,
          right: 60,
        }}
      />
      {/* Tail fin — small upward triangle */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "30px solid transparent",
          borderRight: "30px solid transparent",
          borderBottom: "60px solid #444",
          position: "absolute",
          bottom: 40,
          right: 220,
        }}
      />
    </div>
  );
};

export const Scene2_Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring value for the final emphasis line
  const emphasisSpring = spring({
    fps,
    frame: Math.max(0, frame - 150),
    config: SPRING_CONFIGS.pop,
  });

  const emphasisScale = interpolate(emphasisSpring, [0, 1], [0.9, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.darkGradient,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingLeft: 120,
        paddingRight: 200,
      }}
    >
      <AircraftSilhouette />

      {/* Line 1 — Frame 10, slide from right */}
      <Sequence from={10}>
        <div style={{ marginBottom: 36 }}>
          <AnimatedText
            text="Nate came up through the military — heavy iron, combat readiness."
            style="slide"
            size="subtitle"
            color={COLORS.white}
            weight="medium"
            align="left"
          />
        </div>
      </Sequence>

      {/* Line 2 — Frame 80, slide from right */}
      <Sequence from={80}>
        <div style={{ marginBottom: 36 }}>
          <AnimatedText
            text="I got my A&P and cut my teeth on Part 135 charter ops."
            style="slide"
            size="subtitle"
            color={COLORS.white}
            weight="medium"
            align="left"
          />
        </div>
      </Sequence>

      {/* Line 3 — Frame 150, spring emphasis */}
      <Sequence from={150}>
        <div
          style={{
            marginTop: 20,
            transform: `scale(${emphasisScale})`,
            transformOrigin: "left center",
          }}
        >
          <AnimatedText
            text="Between us? We've touched every corner of this industry."
            style="slam"
            size="subtitle"
            color={COLORS.white}
            weight="bold"
            align="left"
          />
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
