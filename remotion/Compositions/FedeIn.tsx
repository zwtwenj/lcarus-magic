import { AbsoluteFill, useCurrentFrame } from "remotion";

export const FadeIn = () => {
    const frame = useCurrentFrame();
  
    const opacity = Math.min(1, frame / 60);
  
    return (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "white",
          fontSize: 80,
        }}
      >
        <div style={{ opacity: opacity }}>Hello World!</div>
      </AbsoluteFill>
    );
};