import React from "react";
import { Audio, interpolate, useCurrentFrame, staticFile } from "remotion";
import { DURATION_FRAMES } from "../styles/common";

export const BackgroundAudio: React.FC = () => {
  const frame = useCurrentFrame();

  const volume = interpolate(
    frame,
    [0, 30, 240, 480, 660, 900, 1140, 1380, 1560, 1770, DURATION_FRAMES],
    [0, 0.2, 0.2, 0.3, 0.18, 0.25, 0.3, 0.35, 0.4, 0.3, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" },
  );

  return (
    <Audio
      src={staticFile("audio/bg-track.mp3")}
      volume={volume}
      startFrom={0}
    />
  );
};
