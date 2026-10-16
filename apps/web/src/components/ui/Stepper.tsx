// apps/web/src/components/ui/Stepper.tsx
import React from 'react';

export interface StepperProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function Stepper({ currentStep, totalSteps = 6, className = '' }: StepperProps) {
  const segments = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-meta font-medium text-ink-700">
          Step {currentStep} of {totalSteps}
        </span>
      </div>

      {/* Ruled segments */}
      <div className="flex items-center gap-1.5 w-full">
        {segments.map((step) => {
          const isFilled = step <= currentStep;
          return (
            <div
              key={step}
              className={`h-[3px] flex-1 transition-colors ${
                isFilled ? 'bg-ink-900' : 'bg-paper-2'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
