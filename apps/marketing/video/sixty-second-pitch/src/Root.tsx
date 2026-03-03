import React from "react";
import { Composition } from "remotion";
import { Video } from "./Video";
import { DURATION_FRAMES, FPS, WIDTH, HEIGHT } from "./styles/common";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="SixtySecondPitch"
        component={Video}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
