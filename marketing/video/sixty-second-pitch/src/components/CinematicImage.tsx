import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile, AbsoluteFill } from "remotion";

interface CinematicImageProps {
  src: string;
  overlayColor?: string;
  overlayOpacity?: number;
  zoomStart?: number;
  zoomEnd?: number;
  panX?: number;
  panY?: number;
  vignette?: boolean;
}

export const CinematicImage: React.FC<CinematicImageProps> = ({
  src,
  overlayColor = "#000000",
  overlayOpacity = 0.6,
  zoomStart = 1.0,
  zoomEnd = 1.08,
  panX = 0,
  panY = 0,
  vignette = true,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [zoomStart, zoomEnd], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateX = interpolate(frame, [0, durationInFrames], [0, panX], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(frame, [0, durationInFrames], [0, panY], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          }}
        />
      </AbsoluteFill>

      {/* Color overlay */}
      <AbsoluteFill
        style={{
          backgroundColor: overlayColor,
          opacity: overlayOpacity,
        }}
      />

      {/* Vignette */}
      {vignette && (
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
