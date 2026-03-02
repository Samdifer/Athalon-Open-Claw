import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { SPRING_CONFIGS } from "../styles/common";
import { TextReveal } from "../components/TextReveal";
import { GlassCard } from "../components/GlassCard";
import { GlowOrb } from "../components/GlowOrb";
import { GridOverlay } from "../components/GridOverlay";
import { ParticleField } from "../components/ParticleField";

export const Scene6_WhatItDoes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: "P", label: "Planning", delay: 10 },
    { icon: "$", label: "Quoting", delay: 22 },
    { icon: "S", label: "Scheduling", delay: 34 },
    { icon: "R", label: "Resources", delay: 46 },
    { icon: "C", label: "Compliance", delay: 58 },
  ];

  // "One platform." slam animation
  const slamProgress = spring({ fps, frame: Math.max(0, frame - 140), config: SPRING_CONFIGS.slam });
  const slamScale = interpolate(slamProgress, [0, 1], [1.3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const slamOpacity = interpolate(slamProgress, [0, 0.3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // AI text fade
  const aiOpacity = interpolate(frame, [180, 200], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const aiY = interpolate(frame, [180, 200], [15, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.darkSlate }}>
      <AbsoluteFill style={{ background: COLORS.meshGradient }} />
      <GridOverlay cellSize={80} color="rgba(99,102,241,0.03)" animate speed={0.3} />
      <GlowOrb x={50} y={30} size={500} color={COLORS.primaryGlow} opacity={0.06} />
      <GlowOrb x={30} y={70} size={400} color={COLORS.blueGlow} opacity={0.04} />
      <ParticleField count={20} color="rgba(99,102,241,0.2)" speed={0.3} maxSize={2} seed="s6" />

      <AbsoluteFill style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 120px", gap: 48 }}>
        {/* Feature cards row */}
        <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
          {features.map((f) => (
            <GlassCard key={f.label} icon={f.icon} label={f.label} delay={f.delay} glowColor={COLORS.primary} />
          ))}
        </div>

        {/* Part 145 + 135 */}
        <TextReveal text="Part 145 + Part 135 — one place." delay={100} size="body" color={COLORS.muted} align="center" mono />

        {/* One platform slam */}
        <div style={{ opacity: slamOpacity, transform: `scale(${slamScale})` }}>
          <span style={{
            fontFamily: FONTS.heading, fontWeight: FONT_WEIGHTS.black,
            fontSize: FONT_SIZES.hero, color: COLORS.white,
            textShadow: `0 0 40px ${COLORS.primaryGlow}`,
          }}>
            One platform.
          </span>
        </div>

        {/* AI-powered gradient text */}
        <div style={{ opacity: aiOpacity, transform: `translateY(${aiY}px)` }}>
          <span style={{
            fontFamily: FONTS.heading, fontWeight: FONT_WEIGHTS.bold,
            fontSize: FONT_SIZES.subtitle,
            background: "linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            AI-powered decision making.
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
