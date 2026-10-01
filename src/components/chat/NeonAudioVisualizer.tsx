import React, { useEffect, useRef, useState } from 'react';
import { Activity, Disc } from 'lucide-react';

interface NeonAudioVisualizerProps {
  rmsLevel: number;
}

export const NeonAudioVisualizer: React.FC<NeonAudioVisualizerProps> = ({ rmsLevel }) => {
  const [visualMode, setVisualMode] = useState<'orb' | 'waveform'>('orb');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    let phase = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const clampedRms = Math.min(10, Math.max(0.1, rmsLevel));
      phase += 0.05 + clampedRms * 0.015;

      if (visualMode === 'orb') {
        // Quantum Neon Audio Orb
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = 14 + clampedRms * 3.5;

        // Outer Glow Auras
        const outerGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          baseRadius * 0.4,
          centerX,
          centerY,
          baseRadius * 2.2
        );
        outerGrad.addColorStop(0, 'rgba(0, 229, 255, 0.4)');
        outerGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.25)');
        outerGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing Rings with Waves
        ctx.lineWidth = 2;
        for (let ring = 0; ring < 3; ring++) {
          const r = baseRadius * (1 + ring * 0.35 + Math.sin(phase + ring) * 0.1);
          ctx.beginPath();
          ctx.strokeStyle = ring === 0 ? '#00e5ff' : ring === 1 ? '#8b5cf6' : '#ec4899';
          ctx.globalAlpha = 0.5 - ring * 0.12;

          for (let a = 0; a < Math.PI * 2; a += 0.2) {
            const ripple = Math.sin(a * 6 + phase * 2) * (clampedRms * 1.5);
            const x = centerX + Math.cos(a) * (r + ripple);
            const y = centerY + Math.sin(a) * (r + ripple);
            if (a === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // Core Quantum Sphere
        const coreGrad = ctx.createRadialGradient(
          centerX - baseRadius * 0.3,
          centerY - baseRadius * 0.3,
          2,
          centerX,
          centerY,
          baseRadius
        );
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, '#00e5ff');
        coreGrad.addColorStop(0.8, '#8b5cf6');
        coreGrad.addColorStop(1, '#1e1b4b');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Neon Gradient Waveform
        const barCount = 20;
        const step = width / barCount;
        const barWidth = Math.min(10, Math.max(3, step * 0.5));
        const centerY = height / 2;

        for (let i = 0; i < barCount; i++) {
          const sinVal = Math.sin(phase + i * 0.42);
          const barHeight = Math.min(
            height * 0.9,
            Math.max(4, centerY * 0.3 + clampedRms * 3.8 * (0.5 + 0.5 * sinVal))
          );
          const x = i * step + step / 2;

          const gradient = ctx.createLinearGradient(
            0,
            centerY - barHeight / 2,
            0,
            centerY + barHeight / 2
          );
          gradient.addColorStop(0, '#00e5ff');
          gradient.addColorStop(0.6, '#8b5cf6');
          gradient.addColorStop(1, '#ec4899');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x - barWidth / 2, centerY - barHeight / 2, barWidth, barHeight, barWidth / 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [rmsLevel, visualMode]);

  return (
    <div className="w-full flex items-center justify-between py-1 px-2 bg-[#0d121d] border border-[#00e5ff]/20 rounded-xl my-1 shadow-inner">
      <div className="flex-1 flex justify-center">
        <canvas
          ref={canvasRef}
          width={280}
          height={48}
          className="w-full max-w-[280px] h-12"
        />
      </div>

      <button
        type="button"
        onClick={() => setVisualMode(visualMode === 'orb' ? 'waveform' : 'orb')}
        title={visualMode === 'orb' ? 'Przełącz na falę (Waveform)' : 'Przełącz na kwantową kulę (Neon Orb)'}
        className="p-1.5 rounded-lg bg-[#1e2638] text-gray-400 hover:text-[#00e5ff] text-xs transition-colors shrink-0"
      >
        {visualMode === 'orb' ? (
          <Activity className="w-3.5 h-3.5 text-[#00e5ff]" />
        ) : (
          <Disc className="w-3.5 h-3.5 text-[#8b5cf6]" />
        )}
      </button>
    </div>
  );
};
