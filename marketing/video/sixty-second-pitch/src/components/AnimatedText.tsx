import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { SPRING_CONFIGS } from "../styles/common";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";

type AnimationStyle = "slam" | "slide" | "fade" | "cascade";
type TextSize = "small" | "body" | "subtitle" | "title" | "headline" | "hero";

interface AnimatedTextProps {
  text: string;
  style?: AnimationStyle;
  size?: TextSize;
  color?: string;
  delay?: number;
  align?: "left" | "center" | "right";
  weight?: keyof typeof FONT_WEIGHTS;
  mono?: boolean;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  style = "slam",
  size = "title",
  color = COLORS.white,
  delay = 0,
  align = "center",
  weight = "bold",
  mono = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  let opacity = 1;
  let translateX = 0;
  let translateY = 0;
  let scale = 1;

  switch (style) {
    case "slam": {
      const s = spring({
        fps,
        frame: adjustedFrame,
        config: SPRING_CONFIGS.slam,
      });
      scale = s;
      opacity = s;
      break;
    }
    case "slide": {
      opacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
        extrapolateRight: "clamp",
      });
      translateX = interpolate(adjustedFrame, [0, 20], [100, 0], {
        extrapolateRight: "clamp",
      });
      break;
    }
    case "fade": {
      opacity = interpolate(adjustedFrame, [0, 20], [0, 1], {
        extrapolateRight: "clamp",
      });
      translateY = interpolate(adjustedFrame, [0, 20], [20, 0], {
        extrapolateRight: "clamp",
      });
      break;
    }
    case "cascade": {
      const s = spring({
        fps,
        frame: adjustedFrame,
        config: SPRING_CONFIGS.snappy,
      });
      opacity = s;
      translateY = interpolate(s, [0, 1], [-40, 0]);
      break;
    }
  }

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`,
        color,
        fontFamily: mono ? FONTS.mono : FONTS.heading,
        fontWeight: FONT_WEIGHTS[weight],
        fontSize: FONT_SIZES[size],
        textAlign: align,
        lineHeight: 1.2,
        padding: "0 80px",
      }}
    >
      {text}
    </div>
  );
};
