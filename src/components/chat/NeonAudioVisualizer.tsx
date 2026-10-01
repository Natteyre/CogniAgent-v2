import React, { useEffect, useRef } from 'react';

interface NeonAudioVisualizerProps {
  rmsLevel: number;
}

export const NeonAudioVisualizer: React.FC<NeonAudioVisualizerProps> = ({ rmsLevel }) => {
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

      const barCount = 18;
      const step = width / barCount;
      const barWidth = Math.min(12, Math.max(4, step * 0.5));
      const centerY = height / 2;
      const clampedRms = Math.min(10, Math.max(0.2, rmsLevel));

      phase += 0.08;

      for (let i = 0; i < barCount; i++) {
        const sinVal = Math.sin(phase + i * 0.45);
        const barHeight = Math.min(
          height * 0.9,
          Math.max(4, centerY * 0.35 + clampedRms * 3.5 * (0.5 + 0.5 * sinVal))
        );
        const x = i * step + step / 2;

        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        gradient.addColorStop(0, '#00e5ff');
        gradient.addColorStop(1, '#8b5cf6');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x - barWidth / 2, centerY - barHeight / 2, barWidth, barHeight, barWidth / 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [rmsLevel]);

  return (
    <div className="w-full flex justify-center py-1">
      <canvas
        ref={canvasRef}
        width={320}
        height={36}
        className="w-full max-w-sm h-9"
      />
    </div>
  );
};
