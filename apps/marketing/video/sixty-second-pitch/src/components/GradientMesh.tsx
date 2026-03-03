import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";

interface GradientMeshProps {
  /** Array of color stops for the mesh. Min 2 colors. */
  colors: string[];
  /** Animation speed — how fast the mesh drifts */
  speed?: number;
  /** Overall opacity */
  opacity?: number;
}

/**
 * Animated gradient mesh background — creates organic, shifting color fields.
 * Uses layered radial gradients that move in different directions.
 */
export const GradientMesh: React.FC<GradientMeshProps> = ({
  colors,
  speed = 1,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();

  // Create 3-4 layered radial gradients that move independently
  const layers = colors.slice(0, 4).map((color, i) => {
    const angle = (i * 90 + frame * speed * (i % 2 === 0 ? 0.3 : -0.2)) % 360;
    const radius = 40 + Math.sin(frame * 0.02 * speed + i) * 10;
    const x = 50 + Math.sin(frame * 0.015 * speed + i * 1.5) * 25;
    const y = 50 + Math.cos(frame * 0.012 * speed + i * 2) * 25;

    return `radial-gradient(circle ${radius}% at ${x}% ${y}%, ${color} 0%, transparent 70%)`;
  });

  return (
    <AbsoluteFill
      style={{
        background: layers.join(", "),
        opacity,
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    />
  );
};
