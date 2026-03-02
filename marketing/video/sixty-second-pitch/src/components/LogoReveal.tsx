import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { SPRING_CONFIGS } from "../styles/common";

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
  const f = Math.max(0, frame - delay);

  if (variant === "clean") {
    const scale = spring({
      fps,
      frame: f,
      config: SPRING_CONFIGS.smooth,
    });
    const opacity = interpolate(f, [0, 15], [0, 1], {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    });

    if (logo === "avly") {
      const underlineWidth = interpolate(f, [20, 40], [0, 220], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      });
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            transform: `scale(${scale})`,
            opacity,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span
              style={{
                fontFamily: FONTS.heading,
                fontWeight: FONT_WEIGHTS.black,
                fontSize: FONT_SIZES.hero,
                color: COLORS.white,
                letterSpacing: "0.02em",
              }}
            >
              AVLY
            </span>
            <span
              style={{
                fontFamily: FONTS.heading,
                fontWeight: FONT_WEIGHTS.black,
                fontSize: FONT_SIZES.hero,
                color: COLORS.primary,
              }}
            >
              .IO
            </span>
          </div>
          <div
            style={{
              width: underlineWidth,
              height: 3,
              backgroundColor: COLORS.primary,
              boxShadow: `0 0 12px ${COLORS.primaryGlow}`,
              borderRadius: 2,
            }}
          />
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
          gap: 16,
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.heading,
            fontWeight: FONT_WEIGHTS.black,
            fontSize: FONT_SIZES.hero,
            color: COLORS.white,
            letterSpacing: "0.08em",
            textShadow: `0 0 40px ${COLORS.primaryGlow}, 0 0 80px rgba(99,102,241,0.2)`,
          }}
        >
          ATHELON
        </span>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontWeight: FONT_WEIGHTS.medium,
            fontSize: FONT_SIZES.small,
            color: COLORS.blueGlow,
            letterSpacing: "0.2em",
          }}
        >
          BY AVLY.IO
        </span>
      </div>
    );
  }

  // Bold variant — letter-by-letter cascade
  const letters =
    logo === "avly"
      ? ["A", "V", "L", "Y", ".", "I", "O"]
      : ["A", "T", "H", "E", "L", "O", "N"];
  const framesPerLetter = 3;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "center",
        gap: logo === "avly" ? 0 : 8,
      }}
    >
      {letters.map((letter, i) => {
        const letterStart = i * framesPerLetter;
        const clamp = {
          extrapolateLeft: "clamp" as const,
          extrapolateRight: "clamp" as const,
        };
        const letterOpacity = interpolate(f - letterStart, [0, 4], [0, 1], clamp);
        const letterY = interpolate(f - letterStart, [0, 6], [20, 0], clamp);
        const isAccent = logo === "avly" && i >= 4;
        return (
          <span
            key={i}
            style={{
              fontFamily: FONTS.mono,
              fontWeight: FONT_WEIGHTS.black,
              fontSize: FONT_SIZES.hero,
              color: isAccent ? COLORS.primary : COLORS.white,
              opacity: letterOpacity,
              transform: `translateY(${letterY}px)`,
              display: "inline-block",
              letterSpacing: logo === "avly" ? "0.02em" : "0.12em",
            }}
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
};
