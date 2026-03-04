import React from "react";
import { Audio, interpolate, useCurrentFrame, staticFile } from "remotion";
import { SCENES, DURATION_FRAMES, FPS } from "../styles/common";

/**
 * Background audio track with volume automation.
 *
 * Volume curve:
 *   - Fade in over first 1s (frames 0-30)
 *   - Hold at 0.3 during scenes 1-2 (frames 0-420) — let text breathe
 *   - Swell to 0.5 during the problem scene (420-660) — builds tension
 *   - Drop to 0.25 during pivot/vision (660-1080) — emotional clarity
 *   - Rise to 0.45 during product (1080-1380) — energy returns
 *   - Peak at 0.55 during value (1380-1560) — maximum impact
 *   - Hold 0.5 during CTA (1560-1770) then fade out last 1s
 *
 * Place your audio file at public/audio/bg-track.mp3
 * Recommended: 60-second driving indie/electronic beat, 120-130 BPM
 */
export const BackgroundAudio: React.FC = () => {
  const frame = useCurrentFrame();

  const volume = interpolate(
    frame,
    [
      0,    // start
      30,   // fade-in complete
      420,  // end of credibility
      660,  // end of problem
      840,  // end of pivot
      1080, // end of vision
      1380, // end of product
      1560, // end of value
      1770, // start final fade-out
      DURATION_FRAMES, // end
    ],
    [
      0,    // silent
      0.3,  // hold during hook/credibility
      0.3,  // still held
      0.5,  // swells during problem
      0.25, // drops for pivot
      0.25, // holds for vision
      0.45, // rises for product
      0.55, // peaks for value
      0.5,  // holds for CTA
      0,    // fade out
    ],
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
