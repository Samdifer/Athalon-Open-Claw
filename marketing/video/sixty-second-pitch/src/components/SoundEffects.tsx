import React from "react";
import { Audio, Sequence, staticFile } from "remotion";

export const SoundEffects: React.FC = () => {
  return (
    <>
      {/* Scene 1: Subtle text reveal whoosh */}
      <Sequence from={15} durationInFrames={15}>
        <Audio src={staticFile("audio/whoosh.mp3")} volume={0.2} />
      </Sequence>

      {/* Scene 2: Pain point impacts */}
      <Sequence from={310} durationInFrames={15}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.15} />
      </Sequence>
      <Sequence from={335} durationInFrames={15}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.15} />
      </Sequence>
      <Sequence from={360} durationInFrames={15}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.18} />
      </Sequence>

      {/* Scene 3: Decision shimmer */}
      <Sequence from={490} durationInFrames={30}>
        <Audio src={staticFile("audio/shimmer.mp3")} volume={0.18} />
      </Sequence>

      {/* Scene 5: AVLY logo reveal shimmer */}
      <Sequence from={905} durationInFrames={30}>
        <Audio src={staticFile("audio/shimmer.mp3")} volume={0.2} />
      </Sequence>

      {/* Scene 5: Flash transition + Athelon reveal */}
      <Sequence from={1008} durationInFrames={10}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.2} />
      </Sequence>
      <Sequence from={1020} durationInFrames={30}>
        <Audio src={staticFile("audio/shimmer.mp3")} volume={0.22} />
      </Sequence>

      {/* Scene 6: Feature cards whoosh */}
      <Sequence from={1150} durationInFrames={50}>
        <Audio src={staticFile("audio/whoosh.mp3")} volume={0.1} />
      </Sequence>

      {/* Scene 6: "One platform" slam */}
      <Sequence from={1280} durationInFrames={15}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.2} />
      </Sequence>

      {/* Scene 7: Slam impacts */}
      <Sequence from={1385} durationInFrames={15}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.2} />
      </Sequence>
      <Sequence from={1445} durationInFrames={15}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.22} />
      </Sequence>
      <Sequence from={1505} durationInFrames={15}>
        <Audio src={staticFile("audio/impact.mp3")} volume={0.25} />
      </Sequence>

      {/* Scene 8: Big "8" pulse */}
      <Sequence from={1560} durationInFrames={30}>
        <Audio src={staticFile("audio/pulse.mp3")} volume={0.22} />
      </Sequence>

      {/* Scene 8: URL reveal shimmer */}
      <Sequence from={1680} durationInFrames={30}>
        <Audio src={staticFile("audio/shimmer.mp3")} volume={0.18} />
      </Sequence>
    </>
  );
};
