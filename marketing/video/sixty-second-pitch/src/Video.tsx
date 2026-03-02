import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { SCENES } from "./styles/common";
import { loadFonts } from "./styles/fonts";
import { Scene1_MeetFounders } from "./scenes/Scene1_MeetFounders";
import { Scene2_Frustration } from "./scenes/Scene2_Frustration";
import { Scene3_Decision } from "./scenes/Scene3_Decision";
import { Scene4_Opportunity } from "./scenes/Scene4_Opportunity";
import { Scene5_AvlyAthelon } from "./scenes/Scene5_AvlyAthelon";
import { Scene6_WhatItDoes } from "./scenes/Scene6_WhatItDoes";
import { Scene7_Promise } from "./scenes/Scene7_Promise";
import { Scene8_CTA } from "./scenes/Scene8_CTA";
import { SceneTransition } from "./components/SceneTransition";
import { BackgroundAudio } from "./components/BackgroundAudio";
import { SoundEffects } from "./components/SoundEffects";
import { ProgressBar } from "./components/ProgressBar";

loadFonts();

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#09090b" }}>
      <BackgroundAudio />
      <SoundEffects />

      <Sequence from={SCENES.meetFounders.from} durationInFrames={SCENES.meetFounders.duration} name="1 - Meet the Founders">
        <Scene1_MeetFounders />
      </Sequence>
      <Sequence from={SCENES.frustration.from} durationInFrames={SCENES.frustration.duration} name="2 - Frustration">
        <Scene2_Frustration />
      </Sequence>
      <Sequence from={SCENES.decision.from} durationInFrames={SCENES.decision.duration} name="3 - The Decision">
        <Scene3_Decision />
      </Sequence>
      <Sequence from={SCENES.opportunity.from} durationInFrames={SCENES.opportunity.duration} name="4 - The Opportunity">
        <Scene4_Opportunity />
      </Sequence>
      <Sequence from={SCENES.avlyAthelon.from} durationInFrames={SCENES.avlyAthelon.duration} name="5 - AVLY + Athelon">
        <Scene5_AvlyAthelon />
      </Sequence>
      <Sequence from={SCENES.whatItDoes.from} durationInFrames={SCENES.whatItDoes.duration} name="6 - What It Does">
        <Scene6_WhatItDoes />
      </Sequence>
      <Sequence from={SCENES.promise.from} durationInFrames={SCENES.promise.duration} name="7 - The Promise">
        <Scene7_Promise />
      </Sequence>
      <Sequence from={SCENES.cta.from} durationInFrames={SCENES.cta.duration} name="8 - CTA + Close">
        <Scene8_CTA />
      </Sequence>

      {/* Scene transitions */}
      <Sequence from={SCENES.frustration.from - 5} durationInFrames={10} name="T: Fade 1→2">
        <SceneTransition type="fade" durationFrames={10} />
      </Sequence>
      <Sequence from={SCENES.decision.from - 5} durationInFrames={10} name="T: Fade 2→3">
        <SceneTransition type="fade" durationFrames={10} />
      </Sequence>
      <Sequence from={SCENES.opportunity.from - 5} durationInFrames={10} name="T: Fade 3→4">
        <SceneTransition type="fade" durationFrames={10} />
      </Sequence>
      <Sequence from={SCENES.promise.from - 3} durationInFrames={6} name="T: Flash 6→7">
        <SceneTransition type="flash" />
      </Sequence>

      <ProgressBar color="#6366f1" height={2} position="bottom" opacity={0.4} />
    </AbsoluteFill>
  );
};
