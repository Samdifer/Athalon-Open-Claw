import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, AbsoluteFill } from "remotion";

interface SceneTransitionProps {
  type: "flash" | "fade";
  durationFrames?: number;
}

export const SceneTransition: React.FC<SceneTransitionProps> = ({
  type,
  durationFrames = 3,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const dur = Math.min(durationFrames, durationInFrames);

  if (type === "flash") {
    const opacity = interpolate(frame, [0, dur], [0.9, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#ffffff",
          opacity,
          zIndex: 100,
          pointerEvents: "none",
        }}
      />
    );
  }

  // fade
  const opacity = interpolate(frame, [0, dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#09090b",
        opacity,
        zIndex: 100,
        pointerEvents: "none",
      }}
    />
  );
};
