import React from "react";
import { Audio, Sequence, staticFile, interpolate, useCurrentFrame } from "remotion";
import { DURATION_FRAMES } from "../styles/common";

/**
 * Layered sound effects timed to scene transitions and key moments.
 *
 * Place these files in public/audio/:
 *   - whoosh.mp3       — short whoosh for text slams (~0.3s)
 *   - impact.mp3       — bass thud for scene transitions (~0.5s)
 *   - glitch.mp3       — digital glitch texture (~0.5s)
 *   - rise.mp3         — tension riser for the pivot moment (~2s)
 *   - shimmer.mp3      — bright shimmer for logo reveals (~1s)
 *   - pulse.mp3        — low pulse for the "8" number (~1s)
 *
 * All SFX are optional — the video renders fine without them.
 * Audio components silently fail if the file doesn't exist during preview.
 */
export const SoundEffects: React.FC = () => {
  return (
    <>
      {/* Scene 1: Text slam impacts */}
      <Sequence from={10} durationInFrames={15}>
        <Audio src={staticFile("audio/whoosh.mp3")} volume={0.4} />
      </Sequence>
      <Sequence from={50} durationInFrames={15}>
        <Audio src={staticFile("audio/whoosh.mp3")} volume={0.35} />
      </Sequence>
      <Sequence from={90} durationInFrames={15}>
        <Audio src={staticFile("audio/whoosh.mp3")} volume={0.5} />
      </Sequence>

      {/* Scene 1→2 transition flash */}
      <Sequence from={177} durationInFrames={10}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.3} />
      </Sequence>

      {/* Scene 2→3 glitch transition */}
      <Sequence from={417} durationInFrames={15}>
        <Audio src={staticFile("audio/glitch.mp3")} volume={0.35} />
      </Sequence>

      {/* Scene 3: Problem build — tension riser starts at cascade */}
      <Sequence from={440} durationInFrames={200}>
        <Audio src={staticFile("audio/rise.mp3")} volume={0.2} />
      </Sequence>

      {/* Scene 4: Pivot moment — shimmer on bright transition */}
      <Sequence from={660} durationInFrames={30}>
        <Audio src={staticFile("audio/shimmer.mp3")} volume={0.3} />
      </Sequence>

      {/* Scene 5: AVLY.IO logo reveal */}
      <Sequence from={840} durationInFrames={30}>
        <Audio src={staticFile("audio/shimmer.mp3")} volume={0.25} />
      </Sequence>

      {/* Scene 6: Athelon logo reveal */}
      <Sequence from={1080} durationInFrames={30}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.35} />
      </Sequence>

      {/* Scene 6→7 transition flash */}
      <Sequence from={1377} durationInFrames={10}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.3} />
      </Sequence>

      {/* Scene 8: Big "8" pulse */}
      <Sequence from={1560} durationInFrames={30}>
        <Audio src={staticFile("audio/pulse.mp3")} volume={0.35} />
      </Sequence>

      {/* Scene 8: URL reveal */}
      <Sequence from={1680} durationInFrames={30}>
        <Audio src={staticFile("audio/shimmer.mp3")} volume={0.2} />
      </Sequence>
    </>
  );
};
