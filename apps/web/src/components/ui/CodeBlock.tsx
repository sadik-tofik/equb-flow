// apps/web/src/components/ui/CodeBlock.tsx
import React from 'react';

export interface CodeBlockProps {
  filePath: string;
  code: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  filePath,
  code,
  showLineNumbers = false,
  className = '',
}: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split('\n');

  return (
    <div className={`bg-paper-2 border border-line rounded-none overflow-hidden ${className}`}>
      {/* Header strip with real file path and Copy button (No window dots or chrome) */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-line bg-paper-2 text-meta font-mono text-ink-700">
        <span className="font-medium">{filePath}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-spruce-700 underline underline-offset-2 hover:text-[#104032]"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Code Area */}
      <pre className="p-4 font-mono text-[14px] leading-relaxed text-ink-900 overflow-x-auto">
        <code>
          {lines.map((line, idx) => (
            <div key={idx} className="flex">
              {showLineNumbers && (
                <span className="w-8 select-none text-ink-500 text-right pr-4 flex-shrink-0">
                  {idx + 1}
                </span>
              )}
              <span className="flex-1 whitespace-pre">{line}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
