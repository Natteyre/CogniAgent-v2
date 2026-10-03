import React, { useEffect, useState } from 'react';

interface GeminiLiveWaveProps {
  isSpeaking: boolean;
  isListening: boolean;
  isProcessing?: boolean;
  rmsLevel?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const GeminiLiveWave: React.FC<GeminiLiveWaveProps> = ({
  isSpeaking,
  isListening,
  isProcessing = false,
  rmsLevel = 0,
  size = 'md'
}) => {
  const [phase, setPhase] = useState(0);

  // Smooth animation frame cycle
  useEffect(() => {
    let animId: number;
    const animate = () => {
      setPhase((prev) => (prev + 0.08) % (Math.PI * 2));
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Compute 5 harmonic heights for Gemini Live aura ribbon
  const barCount = 5;
  const bars = Array.from({ length: barCount }).map((_, index) => {
    let heightPercent = 20;

    if (isSpeaking) {
      // Dynamic dancing wave during speech synthesis (Gemini Live speech amplitude)
      const freq = phase * 2.5 + index * 1.2;
      const baseAmp = 35 + Math.sin(freq) * 30 + Math.cos(freq * 0.7) * 20;
      heightPercent = Math.max(18, Math.min(100, baseAmp));
    } else if (isListening) {
      // Receptive microphone wave scaling with RMS speech volume
      const pulse = Math.sin(phase * 1.8 + index * 0.8);
      const rmsBoost = (rmsLevel || 0.5) * 12;
      heightPercent = Math.max(16, Math.min(95, 25 + pulse * 18 + rmsBoost));
    } else if (isProcessing) {
      // Thinking wave traveling from left to right
      const wave = Math.sin(phase * 3 - index * 0.9);
      heightPercent = Math.max(20, 45 + wave * 30);
    } else {
      // Subtle idle breathing wave
      const breathe = Math.sin(phase * 0.8 + index * 0.6);
      heightPercent = Math.max(14, 24 + breathe * 8);
    }

    return heightPercent;
  });

  // Size configurations
  const heightClass = size === 'sm' ? 'h-6 gap-0.5' : size === 'lg' ? 'h-14 gap-1.5' : 'h-8 gap-1';
  const barWidthClass = size === 'sm' ? 'w-1' : size === 'lg' ? 'w-2' : 'w-1.5';

  // Palette matching Google Gemini Live ribbon (Cyan -> Blue -> Violet -> Pink -> Amber)
  const barColors = [
    'from-[#00e5ff] to-[#3b82f6]',
    'from-[#3b82f6] to-[#8b5cf6]',
    'from-[#8b5cf6] to-[#ec4899]',
    'from-[#ec4899] to-[#f59e0b]',
    'from-[#00e5ff] to-[#10b981]'
  ];

  return (
    <div className={`flex items-center justify-center ${heightClass} px-1 select-none`}>
      {bars.map((h, i) => (
        <div
          key={i}
          className={`${barWidthClass} rounded-full bg-gradient-to-t ${barColors[i % barColors.length]} transition-all duration-75 ease-out shadow-[0_0_8px_rgba(0,229,255,0.35)]`}
          style={{
            height: `${h}%`,
            opacity: isSpeaking ? 1 : isListening ? 0.9 : 0.65
          }}
        />
      ))}
    </div>
  );
};
