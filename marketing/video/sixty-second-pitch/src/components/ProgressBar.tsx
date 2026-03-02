import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
import { DURATION_FRAMES } from "../styles/common";

interface ProgressBarProps {
  /** Bar color */
  color?: string;
  /** Height in px */
  height?: number;
  /** Position: top or bottom */
  position?: "top" | "bottom";
  /** Opacity */
  opacity?: number;
}

/**
 * Thin progress bar that tracks video timeline.
 * Adds a subtle professional polish.
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  color = "#3b82f6",
  height = 3,
  position = "bottom",
  opacity = 0.6,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, DURATION_FRAMES], [0, 100], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          [position]: 0,
          left: 0,
          width: `${progress}%`,
          height,
          backgroundColor: color,
          opacity,
          zIndex: 200,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
    </AbsoluteFill>
  );
};
