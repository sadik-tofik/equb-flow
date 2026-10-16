// apps/web/src/components/three/RingCanvas.tsx
'use client';

import React from 'react';

interface RingCanvasProps {
  progress?: number; // 0 to 1
  className?: string;
  onStepChange?: (step: number) => void;
}

export function RingCanvas({
  progress = 0,
  className = '',
  onStepChange,
}: RingCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isPaused, setIsPaused] = React.useState(false);
  const [useFallback, setUseFallback] = React.useState(false);

  // Check reduced motion or device constraints
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mediaQuery.matches) {
        setUseFallback(true);
      }
    }
  }, []);

  // Ceramic disc geometry and render loop
  React.useEffect(() => {
    if (useFallback) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angleOffset = 0;

    const memberCount = 6;
    const radius = 140;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Subtle idle breathing rotation unless paused
      if (!isPaused) {
        angleOffset += 0.003;
      }

      // Draw subtle contact shadow on ground
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 45, radius + 50, radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(21, 32, 27, 0.08)';
      ctx.fill();

      // Draw central pot disc (spruce-700)
      const potY = centerY + (progress >= 0.55 && progress < 0.75 ? -15 : 0);
      ctx.beginPath();
      ctx.ellipse(centerX, potY + 8, 48, 24, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#104032'; // Shadow tone
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(centerX, potY, 48, 24, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1B4D3E'; // spruce-700
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#15201B';
      ctx.stroke();

      // Pot notch (persimmon-600)
      ctx.beginPath();
      ctx.arc(centerX + 18, potY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#D64028';
      ctx.fill();

      // Draw 6 ceramic member discs
      for (let i = 0; i < memberCount; i++) {
        const theta = (i * (Math.PI * 2)) / memberCount + angleOffset;
        const discX = centerX + Math.cos(theta) * radius;
        const discY = centerY + Math.sin(theta) * (radius * 0.48);

        // Rim color states per Section 3.1 & 3.2
        let rimColor = '#414D47'; // ink-700
        if (progress >= 0.15 && i !== 2) {
          rimColor = '#246B56'; // spruce-600
        }
        if (i === 2) {
          // Late member (Charlie)
          if (progress >= 0.35 && progress < 0.5) {
            rimColor = '#9A6B1F'; // ochre-700 (late)
          } else if (progress >= 0.5) {
            rimColor = '#246B56'; // approved
          }
        }
        if (progress >= 0.55 && i === 0) {
          rimColor = '#B8321D'; // persimmon-700 (recipient)
        }

        // Ceramic disc thickness shadow
        ctx.beginPath();
        ctx.ellipse(discX, discY + 6, 28, 14, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#E5E0D5'; // paper-2 shadow
        ctx.fill();

        // Ceramic disc top face (paper-1 with handmade tone variation)
        const toneVariance = i % 2 === 0 ? '#F8F6F1' : '#F4F1EA';
        ctx.beginPath();
        ctx.ellipse(discX, discY, 28, 14, 0, 0, Math.PI * 2);
        ctx.fillStyle = toneVariance;
        ctx.fill();

        // Rim band
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = rimColor;
        ctx.stroke();

        // Member slot number
        ctx.fillStyle = '#15201B';
        ctx.font = '500 11px IBM Plex Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`0${i + 1}`, discX, discY);

        // Animated coins travelling during collect phase (0.15 to 0.35)
        if (progress >= 0.15 && progress < 0.45) {
          const coinP = Math.min(1, (progress - 0.15) / 0.25);
          const coinX = discX + (centerX - discX) * coinP;
          const coinY = discY + (potY - discY) * coinP;

          ctx.beginPath();
          ctx.ellipse(coinX, coinY, 8, 4, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#E5E0D5';
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#246B56';
          ctx.stroke();
        }
      }

      ctx.restore();

      if (!isPaused) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [progress, isPaused, useFallback]);

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {useFallback ? (
        <div
          className="w-full max-w-[480px] h-[340px] bg-paper-1 border border-line flex flex-col items-center justify-center p-6 text-center"
          role="img"
          aria-label="EqubFlow ceramic disc ring representing six members and a central pot"
        >
          <div className="w-48 h-48 border border-line flex items-center justify-center bg-paper-0">
            <span className="font-mono text-meta text-ink-500 uppercase">
              The Ring Poster (Reduced Motion)
            </span>
          </div>
          <p className="font-sans text-meta text-ink-700 mt-4">
            Six ceramic discs around a deterministic safety lock.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-[520px] h-[340px] sm:h-[380px] relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Accessible Pause Motion button (Section 2 & 3.4) */}
      {!useFallback && (
        <button
          type="button"
          onClick={() => setIsPaused(!isPaused)}
          className="mt-2 text-[12px] font-sans text-ink-500 hover:text-ink-900 underline select-none"
        >
          {isPaused ? 'Resume 3D motion' : 'Pause motion'}
        </button>
      )}
    </div>
  );
}
