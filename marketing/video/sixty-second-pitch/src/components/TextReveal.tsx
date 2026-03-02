import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONTS } from "../styles/fonts";
import { FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { COLORS } from "../styles/colors";
import { SPRING_CONFIGS } from "../styles/common";

interface Highlight {
  word: string;
  color: string;
  weight?: keyof typeof FONT_WEIGHTS;
}

interface TextRevealProps {
  text: string;
  delay?: number;
  stagger?: number;
  size?: keyof typeof FONT_SIZES;
  color?: string;
  weight?: keyof typeof FONT_WEIGHTS;
  align?: "left" | "center" | "right";
  maxWidth?: number;
  highlights?: Highlight[];
  mono?: boolean;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  text,
  delay = 0,
  stagger = 3,
  size = "title",
  color = COLORS.white,
  weight = "bold",
  align = "left",
  maxWidth,
  highlights = [],
  mono = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        gap: "0 0.3em",
        maxWidth: maxWidth || "100%",
        fontFamily: mono ? FONTS.mono : FONTS.heading,
        fontSize: FONT_SIZES[size],
        fontWeight: FONT_WEIGHTS[weight],
        color,
        lineHeight: 1.2,
      }}
    >
      {words.map((word, i) => {
        const wordDelay = delay + i * stagger;
        const adjustedFrame = Math.max(0, frame - wordDelay);

        const progress = spring({
          fps,
          frame: adjustedFrame,
          config: SPRING_CONFIGS.smooth,
        });

        const opacity = interpolate(progress, [0, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const translateY = interpolate(progress, [0, 1], [20, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Check if this word matches any highlight
        const cleanWord = word.replace(/[.,!?;:]/g, "");
        const highlight = highlights.find((h) => {
          const highlightWords = h.word.split(" ");
          // Check if this word is part of a multi-word highlight
          if (highlightWords.length === 1) {
            return cleanWord.toLowerCase() === h.word.toLowerCase();
          }
          // For multi-word highlights, check each word
          return highlightWords.some(
            (hw) => cleanWord.toLowerCase() === hw.toLowerCase()
          );
        });

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${translateY}px)`,
              color: highlight ? highlight.color : color,
              fontWeight: highlight
                ? FONT_WEIGHTS[highlight.weight || weight]
                : FONT_WEIGHTS[weight],
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
