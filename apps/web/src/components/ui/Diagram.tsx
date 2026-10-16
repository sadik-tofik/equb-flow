// apps/web/src/components/ui/Diagram.tsx
import React from 'react';

export interface DiagramBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  isHighlight?: boolean;
}

export interface DiagramProps {
  title: string;
  boxes: DiagramBox[];
  textAlternative: string;
  className?: string;
}

export function Diagram({
  title,
  boxes,
  textAlternative,
  className = '',
}: DiagramProps) {
  return (
    <figure className={`bg-paper-1 border border-line p-6 ${className}`}>
      <figcaption className="font-sans text-secondary font-semibold text-ink-900 mb-4">
        {title}
      </figcaption>

      {/* SVG Diagram Canvas */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox="0 0 400 120"
          className="w-full max-w-[500px] h-auto"
          fill="none"
          stroke="var(--ink-900)"
          strokeWidth="1.5"
          strokeLinecap="square"
          strokeLinejoin="miter"
          aria-hidden={true}
        >
          {boxes.map((b) => (
            <g key={b.id}>
              <rect
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                fill={b.isHighlight ? 'var(--persimmon-100)' : 'var(--paper-1)'}
                stroke={b.isHighlight ? 'var(--persimmon-600)' : 'var(--ink-900)'}
              />
              <text
                x={b.x + b.width / 2}
                y={b.y + b.height / 2 + 4}
                textAnchor="middle"
                fill={b.isHighlight ? 'var(--persimmon-700)' : 'var(--ink-900)'}
                stroke="none"
                fontFamily="var(--font-ibm-plex-mono)"
                fontSize="12"
                fontWeight="500"
              >
                {b.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Required Text Alternative in Prose Below (Section 5.19) */}
      <div className="mt-4 pt-3 border-t border-line text-meta text-ink-700 leading-relaxed">
        <strong>Diagram description:</strong> {textAlternative}
      </div>
    </figure>
  );
}
