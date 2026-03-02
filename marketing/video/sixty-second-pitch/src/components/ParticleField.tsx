import React from "react";
import { useCurrentFrame, interpolate, random, AbsoluteFill } from "remotion";

interface ParticleFieldProps {
  /** Number of particles */
  count?: number;
  /** Base color for particles */
  color?: string;
  /** Speed multiplier (1 = default drift) */
  speed?: number;
  /** Max particle size in px */
  maxSize?: number;
  /** Overall opacity */
  opacity?: number;
  /** Seed prefix for deterministic randomness */
  seed?: string;
}

/**
 * Floating particle field — deterministic animated dots that drift upward.
 * Creates depth and visual texture behind text.
 */
export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 40,
  color = "rgba(255,255,255,0.6)",
  speed = 1,
  maxSize = 4,
  opacity = 1,
  seed = "particles",
}) => {
  const frame = useCurrentFrame();

  const particles = Array.from({ length: count }, (_, i) => {
    const x = random(`${seed}-x-${i}`) * 100;
    const startY = random(`${seed}-y-${i}`) * 120 - 10;
    const size = random(`${seed}-size-${i}`) * maxSize + 1;
    const particleSpeed = (random(`${seed}-speed-${i}`) * 0.3 + 0.1) * speed;
    const wobbleAmp = random(`${seed}-wobble-${i}`) * 15;
    const wobbleFreq = random(`${seed}-freq-${i}`) * 0.05 + 0.02;
    const particleOpacity = random(`${seed}-opacity-${i}`) * 0.6 + 0.2;
    const delay = random(`${seed}-delay-${i}`) * 60;

    // Particles drift upward and wobble horizontally
    const y = startY - (frame - delay) * particleSpeed * 0.3;
    const wobbleX = Math.sin((frame - delay) * wobbleFreq) * wobbleAmp;

    // Wrap particles that go off-screen
    const wrappedY = ((y % 120) + 120) % 120 - 10;

    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${x + wobbleX * 0.1}%`,
          top: `${wrappedY}%`,
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: color,
          opacity: particleOpacity,
          filter: size > maxSize * 0.7 ? `blur(${size * 0.3}px)` : undefined,
        }}
      />
    );
  });

  return (
    <AbsoluteFill
      style={{
        opacity,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {particles}
    </AbsoluteFill>
  );
};
