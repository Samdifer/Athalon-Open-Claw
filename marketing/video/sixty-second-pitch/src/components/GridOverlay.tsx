import React from "react";
import { useCurrentFrame, interpolate, AbsoluteFill } from "remotion";

interface GridOverlayProps {
  /** Grid cell size in px */
  cellSize?: number;
  /** Line color */
  color?: string;
  /** Line opacity */
  lineOpacity?: number;
  /** Whether the grid slowly scrolls */
  animate?: boolean;
  /** Scroll speed multiplier */
  speed?: number;
  /** Whether to show a subtle scanline effect */
  scanlines?: boolean;
}

/**
 * Technical grid overlay — adds a subtle engineering/blueprint feel.
 * Optional scanline effect for a retro-tech aesthetic.
 */
export const GridOverlay: React.FC<GridOverlayProps> = ({
  cellSize = 60,
  color = "rgba(255,255,255,0.04)",
  lineOpacity = 1,
  animate = true,
  speed = 1,
  scanlines = false,
}) => {
  const frame = useCurrentFrame();

  // Slow vertical scroll
  const offsetY = animate ? (frame * 0.2 * speed) % cellSize : 0;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      {/* Grid lines */}
      <div
        style={{
          position: "absolute",
          inset: -cellSize,
          opacity: lineOpacity,
          backgroundImage: `
            linear-gradient(${color} 1px, transparent 1px),
            linear-gradient(90deg, ${color} 1px, transparent 1px)
          `,
          backgroundSize: `${cellSize}px ${cellSize}px`,
          transform: `translateY(${offsetY}px)`,
        }}
      />

      {/* Optional scanlines — horizontal lines every 2px */}
      {scanlines && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0,0,0,0.03) 2px,
              rgba(0,0,0,0.03) 4px
            )`,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
