import React, { useEffect, useRef } from 'react';
import type { VoiceState } from '../../types';

interface VisualizerOrbProps {
  state: VoiceState;
  audioLevel: number; // 0.0 to 1.0
  frequencyData?: number[];
  size?: number;
}

export const VisualizerOrb: React.FC<VisualizerOrbProps> = ({
  state,
  audioLevel,
  frequencyData,
  size = 380,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Particle field around the orb
    const particles = Array.from({ length: 42 }, () => ({
      angle: Math.random() * Math.PI * 2,
      distance: 120 + Math.random() * 80,
      radius: 1.2 + Math.random() * 2.4,
      speed: 0.005 + Math.random() * 0.015,
      alpha: 0.2 + Math.random() * 0.6,
      orbitOffset: Math.random() * Math.PI,
    }));

    // High DPI scaling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      time += 0.025;
      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = size * 0.26;

      // Color themes depending on state
      let colorPrimary = 'rgba(6, 182, 212, '; // Cyan (Listening)
      let colorSecondary = 'rgba(59, 130, 246, '; // Blue
      let colorAccent = 'rgba(168, 85, 247, '; // Purple

      if (state === 'thinking') {
        colorPrimary = 'rgba(139, 92, 246, '; // Violet
        colorSecondary = 'rgba(99, 102, 241, '; // Indigo
        colorAccent = 'rgba(236, 72, 153, '; // Pink
      } else if (state === 'speaking') {
        colorPrimary = 'rgba(217, 70, 239, '; // Fuchsia
        colorSecondary = 'rgba(124, 58, 237, '; // Purple
        colorAccent = 'rgba(6, 182, 212, '; // Cyan
      } else if (state === 'muted') {
        colorPrimary = 'rgba(245, 158, 11, '; // Amber
        colorSecondary = 'rgba(156, 163, 175, '; // Slate
        colorAccent = 'rgba(217, 119, 6, ';
      }

      // Dynamic reactive scale based on audio input
      const reactiveLevel = Math.max(0.05, audioLevel);
      const dynamicScale = 1 + reactiveLevel * (state === 'speaking' ? 0.45 : 0.25);

      // 1. Draw outer ambient atmospheric glow
      const outerGlowRadius = baseRadius * 1.8 * dynamicScale;
      const outerGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.2,
        centerX,
        centerY,
        outerGlowRadius
      );
      outerGlow.addColorStop(0, colorPrimary + (0.35 + reactiveLevel * 0.4) + ')');
      outerGlow.addColorStop(0.5, colorSecondary + (0.15 + reactiveLevel * 0.25) + ')');
      outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.save();
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerGlowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Draw Orbiting Energy Dust / Spark Particles
      particles.forEach((p, idx) => {
        p.angle += p.speed * (state === 'thinking' ? 2.5 : 1);
        const freqAmp = frequencyData ? (frequencyData[idx % frequencyData.length] || 0) / 255 : 0;
        const currentDist = p.distance * (1 + reactiveLevel * 0.35 + freqAmp * 0.2);
        const px = centerX + Math.cos(p.angle) * currentDist;
        const py = centerY + Math.sin(p.angle) * (currentDist * 0.88);

        ctx.beginPath();
        ctx.arc(px, py, p.radius * (1 + freqAmp), 0, Math.PI * 2);
        ctx.fillStyle = colorAccent + (p.alpha * (0.6 + reactiveLevel * 0.4)) + ')';
        ctx.shadowColor = colorAccent + '0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
      });

      // 3. Draw Fluid Multi-harmonic Plasma Waves (3 nested layers)
      const layers = [
        { points: 8, speed: 1.0, variance: 0.18, alpha: 0.45, radiusMod: 1.08 },
        { points: 10, speed: -1.3, variance: 0.24, alpha: 0.6, radiusMod: 0.95 },
        { points: 7, speed: 0.8, variance: 0.15, alpha: 0.8, radiusMod: 0.8 },
      ];

      layers.forEach((layer, layerIdx) => {
        ctx.save();
        ctx.beginPath();

        const layerRadius = baseRadius * layer.radiusMod * dynamicScale;
        const totalPoints = layer.points;

        for (let i = 0; i <= totalPoints; i++) {
          const angle = (i / totalPoints) * Math.PI * 2;
          const freqVal = frequencyData && frequencyData.length > 0
            ? (frequencyData[(i * 3 + layerIdx * 4) % frequencyData.length] || 0) / 255
            : 0;

          // Harmonic sine oscillations
          const harmonic1 = Math.sin(angle * 3 + time * layer.speed) * 12;
          const harmonic2 = Math.cos(angle * 2 - time * 0.8) * 8;
          const stateMod = state === 'thinking' ? Math.sin(angle * 5 + time * 3) * 14 : 0;
          const audioWave = (reactiveLevel * 30 + freqVal * 25) * Math.sin(angle * 4 + time * 2);

          const r = layerRadius + harmonic1 + harmonic2 + stateMod + audioWave;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            // Smooth spline curve between points
            const prevAngle = ((i - 1) / totalPoints) * Math.PI * 2;
            const prevHarmonic = Math.sin(prevAngle * 3 + time * layer.speed) * 12;
            const prevR = layerRadius + prevHarmonic + audioWave;
            const prevX = centerX + Math.cos(prevAngle) * prevR;
            const prevY = centerY + Math.sin(prevAngle) * prevR;
            const cpX = (prevX + x) / 2;
            const cpY = (prevY + y) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
          }
        }

        ctx.closePath();

        // Layer gradient
        const fluidGrad = ctx.createLinearGradient(
          centerX - layerRadius,
          centerY - layerRadius,
          centerX + layerRadius,
          centerY + layerRadius
        );
        fluidGrad.addColorStop(0, colorPrimary + layer.alpha + ')');
        fluidGrad.addColorStop(0.5, colorSecondary + layer.alpha + ')');
        fluidGrad.addColorStop(1, colorAccent + (layer.alpha * 0.7) + ')');

        ctx.fillStyle = fluidGrad;
        ctx.shadowColor = colorPrimary + '0.7)';
        ctx.shadowBlur = 18 * dynamicScale;
        ctx.fill();
        ctx.restore();
      });

      // 4. Draw Core Inner Luminescence (Pulsing Center)
      const coreRadius = baseRadius * 0.42 * (1 + reactiveLevel * 0.35);
      const coreGrad = ctx.createRadialGradient(
        centerX - coreRadius * 0.2,
        centerY - coreRadius * 0.2,
        0,
        centerX,
        centerY,
        coreRadius
      );
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, colorPrimary + '0.95)');
      coreGrad.addColorStop(0.7, colorSecondary + '0.7)');
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.save();
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.restore();

      // 5. Draw Fine Ring Waves (Speaking & Listening Ripple Echoes)
      if (state === 'speaking' || state === 'listening') {
        const ringCount = 2;
        for (let r = 0; r < ringCount; r++) {
          const ringProgress = (time * 0.6 + r * 0.5) % 1;
          const ringRadius = baseRadius * (1 + ringProgress * 0.9);
          const ringAlpha = (1 - ringProgress) * 0.45 * (0.4 + reactiveLevel);

          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
          ctx.strokeStyle = colorPrimary + ringAlpha + ')';
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel, frequencyData, size]);

  return (
    <div className="relative flex items-center justify-center">
      {/* Decorative radial backlight blur */}
      <div
        className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-700 pointer-events-none ${
          state === 'listening'
            ? 'bg-cyan-500/25 dark:bg-cyan-500/35'
            : state === 'thinking'
            ? 'bg-violet-600/30 dark:bg-violet-600/40'
            : state === 'speaking'
            ? 'bg-fuchsia-500/30 dark:bg-fuchsia-500/40'
            : 'bg-amber-500/15 dark:bg-amber-500/20'
        }`}
        style={{
          width: size * 0.9,
          height: size * 0.9,
          margin: 'auto',
        }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="relative z-10 transition-transform duration-300"
      />
    </div>
  );
};
