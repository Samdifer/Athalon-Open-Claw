import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";

interface GlowOrbProps {
  /** Center X position (%) */
  x?: number;
  /** Center Y position (%) */
  y?: number;
  /** Orb radius in px */
  size?: number;
  /** Color of the glow */
  color?: string;
  /** Animation speed */
  speed?: number;
  /** Base opacity */
  opacity?: number;
  /** Whether the orb pulses */
  pulse?: boolean;
}

/**
 * Animated glowing orb — adds depth and focal points to dark scenes.
 * Gently breathes in size and opacity.
 */
export const GlowOrb: React.FC<GlowOrbProps> = ({
  x = 50,
  y = 50,
  size = 400,
  color = "#3b82f6",
  speed = 1,
  opacity = 0.15,
  pulse = true,
}) => {
  const frame = useCurrentFrame();

  const breathe = pulse
    ? Math.sin(frame * 0.03 * speed) * 0.2 + 1
    : 1;

  const drift = {
    x: Math.sin(frame * 0.01 * speed) * 3,
    y: Math.cos(frame * 0.008 * speed) * 3,
  };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: `${x + drift.x}%`,
          top: `${y + drift.y}%`,
          width: size * breathe,
          height: size * breathe,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          transform: "translate(-50%, -50%)",
          opacity,
          filter: `blur(${size * 0.15}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
