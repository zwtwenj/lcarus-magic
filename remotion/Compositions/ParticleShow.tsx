import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  random,
  Easing,
} from "remotion";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
  initialDelay: number;
}

interface ParticleShowProps {
  text?: string;
  particleCount?: number;
  primaryColor?: string;
  secondaryColor?: string;
}

export const ParticleShow: React.FC<ParticleShowProps> = ({
  text = "Remotion",
  particleCount = 50,
  primaryColor = "#91EAE4",
  secondaryColor = "#86A8E7",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // 生成粒子数据
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: particleCount }, (_, i) => {
      const seed = i;
      return {
        id: i,
        x: random(`x-${seed}`) * width,
        y: random(`y-${seed}`) * height,
        size: random(`size-${seed}`) * 8 + 4,
        speed: random(`speed-${seed}`) * 2 + 0.5,
        color: random(`color-${seed}`) > 0.5 ? primaryColor : secondaryColor,
        initialDelay: random(`delay-${seed}`) * 30,
      };
    });
  }, [particleCount, width, height, primaryColor, secondaryColor]);

  // 背景渐变动画
  const backgroundProgress = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  const bgGradient = interpolate(
    backgroundProgress,
    [0, 1],
    [0, 360],
    {
      easing: Easing.bezier(0.5, 0, 0.5, 1),
    }
  );

  // 文字出现动画
  const textAppearProgress = spring({
    frame: frame - 20,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
    },
  });

  // 文字缩放和旋转
  const textScale = interpolate(
    textAppearProgress,
    [0, 0.5, 1],
    [0, 1.2, 1],
    {
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    }
  );

  const textRotation = interpolate(
    frame,
    [0, durationInFrames],
    [0, 360],
    {
      easing: Easing.linear,
    }
  );

  // 文字发光效果
  const glowIntensity = interpolate(
    frame,
    [0, 30, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    {
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    }
  );

  // 粒子动画
  const renderParticle = (particle: Particle) => {
    const particleFrame = frame - particle.initialDelay;
    if (particleFrame < 0) return null;

    // 粒子出现动画
    const appearProgress = spring({
      frame: particleFrame,
      fps,
      config: {
        damping: 80,
        stiffness: 100,
      },
    });

    // 粒子移动
    const moveX = interpolate(
      particleFrame,
      [0, durationInFrames],
      [particle.x, particle.x + Math.sin(particleFrame * 0.1) * 200],
      {
        easing: Easing.bezier(0.5, 0, 0.5, 1),
      }
    );

    const moveY = interpolate(
      particleFrame,
      [0, durationInFrames],
      [particle.y, particle.y + Math.cos(particleFrame * 0.1) * 200],
      {
        easing: Easing.bezier(0.5, 0, 0.5, 1),
      }
    );

    // 粒子旋转
    const rotation = particleFrame * particle.speed * 2;

    // 粒子透明度脉冲
    const pulse = Math.sin(particleFrame * 0.2) * 0.3 + 0.7;

    return (
      <div
        key={particle.id}
        style={{
          position: "absolute",
          left: moveX,
          top: moveY,
          width: particle.size,
          height: particle.size,
          borderRadius: "50%",
          backgroundColor: particle.color,
          opacity: appearProgress * pulse,
          transform: `rotate(${rotation}deg) scale(${appearProgress})`,
          boxShadow: `0 0 ${Math.min(particle.size * 1.5, 12)}px ${particle.color}`,
        }}
      />
    );
  };

  // 中心圆形动画
  const centerCircleProgress = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 100,
      stiffness: 150,
    },
  });

  const centerCircleScale = interpolate(
    centerCircleProgress,
    [0, 1],
    [0, 1.5],
    {
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    }
  );

  const centerCircleRotation = frame * 2;

  // 环形粒子轨道
  const orbitParticles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const radius = 150;
      return {
        id: `orbit-${i}`,
        angle,
        radius,
        delay: i * 2,
      };
    });
  }, []);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${bgGradient}deg, ${primaryColor}15, ${secondaryColor}15)`,
        overflow: "hidden",
      }}
    >
      {/* 背景粒子层 */}
      <AbsoluteFill>
        {particles.map(renderParticle)}
      </AbsoluteFill>

      {/* 中心圆形 */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            transform: `scale(${centerCircleScale}) rotate(${centerCircleRotation}deg)`,
            opacity: centerCircleProgress * 0.6,
            boxShadow: `0 0 100px ${primaryColor}40`,
          }}
        />
      </AbsoluteFill>

      {/* 环形轨道粒子 */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {orbitParticles.map((orbit) => {
          const orbitFrame = frame - orbit.delay;
          if (orbitFrame < 0) return null;

          const orbitProgress = spring({
            frame: orbitFrame,
            fps,
            config: {
              damping: 100,
              stiffness: 150,
            },
          });

          const currentAngle = orbit.angle + (frame * 0.5);
          const x = Math.cos(currentAngle) * orbit.radius * orbitProgress;
          const y = Math.sin(currentAngle) * orbit.radius * orbitProgress;

          return (
            <div
              key={orbit.id}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: primaryColor,
                transform: `translate(${x - 6}px, ${y - 6}px) scale(${orbitProgress})`,
                opacity: orbitProgress,
                boxShadow: `0 0 12px ${primaryColor}`,
              }}
            />
          );
        })}
      </AbsoluteFill>

      {/* 主文字 */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          perspective: "1000px",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: "bold",
            color: "#ffffff",
            textAlign: "center",
            transform: `scale(${textScale}) rotateY(${textRotation * 0.1}deg)`,
            opacity: textAppearProgress,
            textShadow: `0 0 ${Math.min(20 * glowIntensity, 24)}px ${primaryColor}, 0 0 ${Math.min(40 * glowIntensity, 48)}px ${secondaryColor}`,
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "0.1em",
          }}
        >
          {text}
        </div>
      </AbsoluteFill>

      {/* 装饰性线条：单 SVG 减少 DOM/重绘 */}
      <AbsoluteFill>
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <defs>
            {Array.from({ length: 8 }, (_, i) => (
              <linearGradient key={`g-${i}`} id={`line-gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
                <stop offset="100%" stopColor={secondaryColor} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {Array.from({ length: 8 }, (_, i) => {
            const lineFrame = frame - i * 5;
            if (lineFrame < 0) return null;
            const lineProgress = spring({
              frame: lineFrame,
              fps,
              config: { damping: 100, stiffness: 200 },
            });
            const angle = (i / 8) * Math.PI * 2;
            const length = 300 * lineProgress;
            const startX = width / 2;
            const startY = height / 2;
            const endX = startX + Math.cos(angle) * length;
            const endY = startY + Math.sin(angle) * length;
            return (
              <line
                key={`line-${i}`}
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={`url(#line-gradient-${i})`}
                strokeWidth={3}
                opacity={lineProgress * 0.5}
              />
            );
          })}
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
