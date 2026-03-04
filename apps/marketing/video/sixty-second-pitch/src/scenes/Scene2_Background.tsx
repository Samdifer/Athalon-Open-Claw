import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
  Sequence,
} from "remotion";
import { SPRING_CONFIGS } from "../styles/common";
import { COLORS } from "../styles/colors";
import { FONTS, FONT_WEIGHTS, FONT_SIZES } from "../styles/fonts";
import { ParticleField } from "../components/ParticleField";
import { GlowOrb } from "../components/GlowOrb";
import { GridOverlay } from "../components/GridOverlay";

/**
 * Scene 2 — CREDIBILITY (V2 Enhanced)
 * 240 frames / 8 seconds @ 30fps
 *
 * Dark gradient background with improved aircraft silhouette,
 * credential badges, and atmospheric depth effects.
 */

/** Enhanced CSS-only aircraft silhouette with more detail */
const AircraftSilhouette: React.FC<{ opacity: number }> = ({ opacity }) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        right: 80,
        opacity: opacity * 0.08,
      }}
    >
      {/* Fuselage */}
      <div
        style={{
          width: 0,
          height: 0,
          borderTop: "24px solid transparent",
          borderBottom: "24px solid transparent",
          borderLeft: "300px solid #64748b",
          position: "absolute",
          bottom: 35,
          right: 0,
        }}
      />
      {/* Main wing — swept */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "120px solid transparent",
          borderRight: "120px solid transparent",
          borderBottom: "50px solid #64748b",
          position: "absolute",
          bottom: 20,
          right: 60,
        }}
      />
      {/* Tail fin */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "35px solid transparent",
          borderRight: "35px solid transparent",
          borderBottom: "70px solid #64748b",
          position: "absolute",
          bottom: 45,
          right: 240,
        }}
      />
      {/* Engine pod */}
      <div
        style={{
          width: 30,
          height: 14,
          backgroundColor: "#64748b",
          borderRadius: "7px 14px 14px 7px",
          position: "absolute",
          bottom: 15,
          right: 130,
        }}
      />
    </div>
  );
};

/** A&P License badge — styled credential indicator */
const CredentialBadge: React.FC<{
  label: string;
  sublabel: string;
  opacity: number;
  delay: number;
}> = ({ label, sublabel, opacity, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeSpring = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: SPRING_CONFIGS.snappy,
  });

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "10px 20px",
        borderRadius: 8,
        border: `1px solid rgba(148,163,184,0.2)`,
        backgroundColor: "rgba(148,163,184,0.05)",
        opacity: badgeSpring * opacity,
        transform: `scale(${badgeSpring})`,
      }}
    >
      <span
        style={{
          fontFamily: FONTS.mono,
          fontWeight: FONT_WEIGHTS.bold,
          fontSize: 18,
          color: COLORS.credAccent,
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: FONTS.body,
          fontWeight: FONT_WEIGHTS.regular,
          fontSize: 12,
          color: "rgba(148,163,184,0.6)",
          marginTop: 2,
        }}
      >
        {sublabel}
      </span>
    </div>
  );
};

export const Scene2_Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Aircraft silhouette fades in slowly
  const silhouetteOpacity = interpolate(frame, [0, 60], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Spring for the emphasis line
  const emphasisSpring = spring({
    fps,
    frame: Math.max(0, frame - 150),
    config: SPRING_CONFIGS.pop,
  });

  const emphasisScale = interpolate(emphasisSpring, [0, 1], [0.9, 1], {
    extrapolateRight: "clamp",
  });

  // Slide-from-right animations
  const slide1Opacity = interpolate(frame - 10, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const slide1X = interpolate(frame - 10, [0, 20], [80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const slide2Opacity = interpolate(frame - 80, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const slide2X = interpolate(frame - 80, [0, 20], [80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: COLORS.darkGradient,
      }}
    >
      {/* Ambient glow */}
      <GlowOrb x={25} y={40} size={400} color="#1e293b" opacity={0.2} speed={0.3} />

      {/* Subtle grid */}
      <GridOverlay cellSize={100} color="rgba(148,163,184,0.02)" speed={0.2} />

      {/* Particles — cooler tone */}
      <ParticleField
        count={20}
        color="rgba(148,163,184,0.3)"
        speed={0.3}
        maxSize={2}
        opacity={0.4}
        seed="cred"
      />

      <AircraftSilhouette opacity={silhouetteOpacity} />

      {/* Content */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingLeft: 120,
          paddingRight: 200,
          gap: 36,
        }}
      >
        {/* Line 1 — Frame 10, slide from right */}
        {frame >= 10 && (
          <div
            style={{
              opacity: slide1Opacity,
              transform: `translateX(${slide1X}px)`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 40,
                  backgroundColor: COLORS.credAccent,
                  borderRadius: 2,
                  opacity: 0.4,
                }}
              />
              <div
                style={{
                  color: COLORS.white,
                  fontFamily: FONTS.heading,
                  fontWeight: FONT_WEIGHTS.medium,
                  fontSize: FONT_SIZES.subtitle,
                  lineHeight: 1.3,
                }}
              >
                Nate came up through the military —
                <br />
                <span style={{ color: COLORS.credAccent }}>
                  heavy iron, combat readiness.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Credential badges — pop in between lines */}
        <Sequence from={50}>
          <div style={{ display: "flex", gap: 16, marginLeft: 24 }}>
            <CredentialBadge label="USAF" sublabel="Aircraft Maintenance" opacity={1} delay={50} />
            <CredentialBadge label="A&P" sublabel="FAA Certified" opacity={1} delay={65} />
          </div>
        </Sequence>

        {/* Line 2 — Frame 80, slide from right */}
        {frame >= 80 && (
          <div
            style={{
              opacity: slide2Opacity,
              transform: `translateX(${slide2X}px)`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <div
                style={{
                  width: 4,
                  height: 40,
                  backgroundColor: COLORS.credAccent,
                  borderRadius: 2,
                  opacity: 0.4,
                }}
              />
              <div
                style={{
                  color: COLORS.white,
                  fontFamily: FONTS.heading,
                  fontWeight: FONT_WEIGHTS.medium,
                  fontSize: FONT_SIZES.subtitle,
                  lineHeight: 1.3,
                }}
              >
                I got my A&P and cut my teeth on{" "}
                <span style={{ color: COLORS.credAccent }}>
                  Part 135 charter ops.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Line 3 — Frame 150, spring emphasis */}
        <Sequence from={150}>
          <div
            style={{
              marginTop: 20,
              marginLeft: 24,
              transform: `scale(${emphasisScale})`,
              transformOrigin: "left center",
              opacity: emphasisSpring,
            }}
          >
            <div
              style={{
                color: COLORS.white,
                fontFamily: FONTS.heading,
                fontWeight: FONT_WEIGHTS.bold,
                fontSize: FONT_SIZES.title,
                lineHeight: 1.2,
                textShadow: "0 0 30px rgba(148,163,184,0.15)",
              }}
            >
              Between us? We've touched{" "}
              <span
                style={{
                  borderBottom: `3px solid ${COLORS.credAccent}`,
                  paddingBottom: 4,
                }}
              >
                every corner
              </span>{" "}
              of this industry.
            </div>
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
