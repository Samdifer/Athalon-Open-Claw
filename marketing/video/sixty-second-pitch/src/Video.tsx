import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { SCENES } from "./styles/common";
import { Scene1_Intro } from "./scenes/Scene1_Intro";
import { Scene2_Background } from "./scenes/Scene2_Background";
import { Scene3_Problem } from "./scenes/Scene3_Problem";
import { Scene4_Mission } from "./scenes/Scene4_Mission";
import { Scene5_Vision } from "./scenes/Scene5_Vision";
import { Scene6_Product } from "./scenes/Scene6_Product";
import { Scene7_Value } from "./scenes/Scene7_Value";
import { Scene8_CTA } from "./scenes/Scene8_CTA";
import { SceneTransition } from "./components/SceneTransition";
import { BackgroundAudio } from "./components/BackgroundAudio";
import { SoundEffects } from "./components/SoundEffects";
import { ProgressBar } from "./components/ProgressBar";

export const Video: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ═══ Audio Layer ═══ */}
      <BackgroundAudio />
      <SoundEffects />

      {/* ═══ Scene 1 — THE HOOK ═══ */}
      <Sequence
        from={SCENES.intro.from}
        durationInFrames={SCENES.intro.duration}
        name="1 - The Hook"
      >
        <Scene1_Intro />
      </Sequence>

      {/* Transition: white flash */}
      <Sequence from={177} durationInFrames={3} name="Transition 1→2">
        <SceneTransition type="flash" />
      </Sequence>

      {/* ═══ Scene 2 — CREDIBILITY ═══ */}
      <Sequence
        from={SCENES.background.from}
        durationInFrames={SCENES.background.duration}
        name="2 - Credibility"
      >
        <Scene2_Background />
      </Sequence>

      {/* Transition: glitch cut */}
      <Sequence from={417} durationInFrames={3} name="Transition 2→3">
        <SceneTransition type="glitch" />
      </Sequence>

      {/* ═══ Scene 3 — THE PROBLEM ═══ */}
      <Sequence
        from={SCENES.problem.from}
        durationInFrames={SCENES.problem.duration}
        name="3 - The Problem"
      >
        <Scene3_Problem />
      </Sequence>

      {/* Transition: color wipe (built into Scene 4's background) */}

      {/* ═══ Scene 4 — THE PIVOT ═══ */}
      <Sequence
        from={SCENES.pivot.from}
        durationInFrames={SCENES.pivot.duration}
        name="4 - The Pivot"
      >
        <Scene4_Mission />
      </Sequence>

      {/* Transition: clean fade (built into Scene 5's opacity) */}

      {/* ═══ Scene 5 — THE VISION ═══ */}
      <Sequence
        from={SCENES.vision.from}
        durationInFrames={SCENES.vision.duration}
        name="5 - The Vision"
      >
        <Scene5_Vision />
      </Sequence>

      {/* Hard cut — no transition needed */}

      {/* ═══ Scene 6 — THE PRODUCT ═══ */}
      <Sequence
        from={SCENES.product.from}
        durationInFrames={SCENES.product.duration}
        name="6 - The Product"
      >
        <Scene6_Product />
      </Sequence>

      {/* Transition: white flash */}
      <Sequence from={1377} durationInFrames={3} name="Transition 6→7">
        <SceneTransition type="flash" />
      </Sequence>

      {/* ═══ Scene 7 — THE VALUE ═══ */}
      <Sequence
        from={SCENES.value.from}
        durationInFrames={SCENES.value.duration}
        name="7 - The Value"
      >
        <Scene7_Value />
      </Sequence>

      {/* Hard cut — maintains urgency */}

      {/* ═══ Scene 8 — THE CTA ═══ */}
      <Sequence
        from={SCENES.cta.from}
        durationInFrames={SCENES.cta.duration}
        name="8 - The CTA"
      >
        <Scene8_CTA />
      </Sequence>

      {/* ═══ Global Overlays ═══ */}
      <ProgressBar color="#3b82f6" height={3} position="bottom" opacity={0.5} />
    </AbsoluteFill>
  );
};
