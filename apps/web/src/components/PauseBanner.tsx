// apps/web/src/components/PauseBanner.tsx
'use client';

import React from 'react';
import { Banner } from './ui';

interface PauseBannerProps {
  paused: boolean;
  onResumeClick?: () => void;
  canResume?: boolean;
}

export function PauseBanner({
  paused,
  onResumeClick,
  canResume,
}: PauseBannerProps) {
  if (!paused) return null;

  return (
    <Banner
      type="paused"
      message="The organizer paused this circle. No payments will move until it resumes."
      actionText={canResume && onResumeClick ? 'Resume circle' : undefined}
      onAction={onResumeClick}
    />
  );
}
