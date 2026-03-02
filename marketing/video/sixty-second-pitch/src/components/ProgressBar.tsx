import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";
import { DURATION_FRAMES } from "../styles/common";

interface ProgressBarProps {
  color?: string;
  height?: number;
  position?: "top" | "bottom";
  opacity?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  color = "#f59e0b", height = 3, position = "bottom", opacity = 0.6,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, DURATION_FRAMES], [0, 100], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", [position]: 0, left: 0,
        width: `${progress}%`, height, backgroundColor: color,
        opacity, zIndex: 200, boxShadow: `0 0 8px ${color}`,
      }} />
    </AbsoluteFill>
  );
};
