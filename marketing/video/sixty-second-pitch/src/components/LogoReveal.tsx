import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { SPRING_CONFIGS } from "../styles/common";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";

type LogoType = "avly" | "athelon";
type LogoVariant = "clean" | "bold";

interface LogoRevealProps {
  logo: LogoType;
  variant?: LogoVariant;
  delay?: number;
}

export const LogoReveal: React.FC<LogoRevealProps> = ({
  logo,
  variant = "clean",
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  const scale = spring({
    fps,
    frame: adjustedFrame,
    config: SPRING_CONFIGS.pop,
  });

  const opacity = spring({
    fps,
    frame: adjustedFrame,
    config: SPRING_CONFIGS.smooth,
  });

  if (logo === "avly") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.black,
            fontSize: variant === "bold" ? FONT_SIZES.hero : FONT_SIZES.headline,
            color: COLORS.white,
            letterSpacing: "-0.02em",
          }}
        >
          AVLY
        </span>
        <span
          style={{
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.black,
            fontSize: variant === "bold" ? FONT_SIZES.hero : FONT_SIZES.headline,
            color: COLORS.productAccent,
            letterSpacing: "-0.02em",
          }}
        >
          .IO
        </span>
      </div>
    );
  }

  // Athelon logo
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <span
        style={{
          fontFamily: FONTS.heading,
          fontWeight: FONT_WEIGHTS.black,
          fontSize: variant === "bold" ? FONT_SIZES.hero : FONT_SIZES.headline,
          color: COLORS.white,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        ATHELON
      </span>
      {variant === "bold" && (
        <span
          style={{
            fontFamily: FONTS.mono,
            fontWeight: FONT_WEIGHTS.medium,
            fontSize: FONT_SIZES.small,
            color: COLORS.productAccent,
            letterSpacing: "0.2em",
            marginTop: 8,
          }}
        >
          BY AVLY.IO
        </span>
      )}
    </div>
  );
};
