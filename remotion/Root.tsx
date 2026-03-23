import React from "react";
import { Composition } from "remotion";
import { FadeIn } from "./Compositions/FedeIn";
import { ParticleShow } from "./Compositions/ParticleShow";
import { LottieText, lottieTextSchema } from "./Compositions/LottieText";

export const ServerRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="FadeIn"
        component={FadeIn}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="ParticleShow"
        component={ParticleShow}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          text: "Remotion",
          particleCount: 50,
          primaryColor: "#91EAE4",
          secondaryColor: "#86A8E7",
        }}
      />
      <Composition
        id="LottieText"
        component={LottieText}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={lottieTextSchema}
        defaultProps={{
          id: "subtitles",
          props: {}
        }}
      />
    </>
  );
};
