import React from "react";
import {
  useCurrentFrame,
  interpolate,
  AbsoluteFill,
  random,
} from "remotion";
import { COLORS } from "../styles/colors";

type TransitionType = "flash" | "glitch";

interface SceneTransitionProps {
  type: TransitionType;
  durationFrames?: number;
}

export const SceneTransition: React.FC<SceneTransitionProps> = ({
  type,
  durationFrames = 3,
}) => {
  const frame = useCurrentFrame();

  if (type === "flash") {
    const opacity = interpolate(frame, [0, durationFrames], [1, 0], {
      extrapolateRight: "clamp",
    });

    return (
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.flashWhite,
          opacity,
          zIndex: 100,
        }}
      />
    );
  }

  if (type === "glitch") {
    const isActive = frame < durationFrames;
    if (!isActive) return null;

    const offsetX = random(`glitch-x-${frame}`) * 20 - 10;
    const offsetY = random(`glitch-y-${frame}`) * 10 - 5;
    const skew = random(`glitch-skew-${frame}`) * 4 - 2;

    return (
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.black,
          opacity: 0.8,
          transform: `translateX(${offsetX}px) translateY(${offsetY}px) skewX(${skew}deg)`,
          zIndex: 100,
        }}
      />
    );
  }

  return null;
};
