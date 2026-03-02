import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, AbsoluteFill } from "remotion";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { SPRING_CONFIGS } from "../styles/common";

export const Scene7_Promise: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const section = Math.floor(frame / 60); // 0, 1, 2

  const sections = [
    {
      text: "Won't just replace your old software.",
      bg: COLORS.nearBlack,
      accentColor: COLORS.primary,
      highlightWord: null as string | null,
      highlightColor: "",
    },
    {
      text: "It'll let you make a lot more money.",
      bg: COLORS.nearBlack,
      accentColor: COLORS.amber,
      highlightWord: "money.",
      highlightColor: COLORS.gold,
    },
    {
      text: "And become much better at maintenance.",
      bg: COLORS.nearBlack,
      accentColor: COLORS.amber,
      highlightWord: "better",
      highlightColor: COLORS.amberGlow,
    },
  ];

  const current = sections[Math.min(section, 2)];
  const sectionFrame = frame - section * 60;

  // Text slam animation
  const slamProgress = spring({ fps, frame: sectionFrame, config: SPRING_CONFIGS.slam });
  const scale = interpolate(slamProgress, [0, 1], [1.15, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = interpolate(slamProgress, [0, 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Accent bar
  const barHeight = interpolate(sectionFrame, [0, 15], [0, 80], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Underline for highlighted words in section 1 (a lot more money)
  const underlineWidth = section === 1
    ? interpolate(sectionFrame, [25, 45], [0, 280], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 0;

  // Section transitions (brief fade)
  const fadeOut = sectionFrame > 53 ? interpolate(sectionFrame, [53, 60], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;

  // Split text to color highlight words
  const words = current.text.split(" ");

  return (
    <AbsoluteFill style={{ backgroundColor: current.bg }}>
      {/* Hero gradient for contrast */}
      <AbsoluteFill style={{ background: COLORS.heroGradient, opacity: 0.5 }} />

      <AbsoluteFill style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 140px", opacity: opacity * fadeOut,
        transform: `scale(${scale})`,
      }}>
        {/* Accent bar */}
        <div style={{
          position: "absolute",
          left: 80,
          top: "50%",
          transform: "translateY(-50%)",
          width: 4,
          height: barHeight,
          backgroundColor: current.accentColor,
          borderRadius: 2,
          boxShadow: `0 0 12px ${current.accentColor}`,
        }} />

        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 0.3em", justifyContent: "center" }}>
            {words.map((word, i) => {
              const isHighlight = current.highlightWord && word.toLowerCase().includes(current.highlightWord.toLowerCase().replace(".", ""));
              return (
                <span key={i} style={{
                  fontFamily: FONTS.heading,
                  fontWeight: FONT_WEIGHTS.black,
                  fontSize: FONT_SIZES.headline,
                  color: isHighlight ? current.highlightColor : COLORS.white,
                  textShadow: isHighlight ? `0 0 20px ${current.highlightColor}` : "none",
                  display: "inline-block",
                  lineHeight: 1.2,
                }}>
                  {word}
                </span>
              );
            })}
          </div>
          {/* Underline for "a lot more money" */}
          {section === 1 && underlineWidth > 0 && (
            <div style={{
              position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)",
              width: underlineWidth, height: 3,
              backgroundColor: COLORS.gold,
              boxShadow: `0 0 10px ${COLORS.amberGlow}`,
              borderRadius: 2,
            }} />
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
