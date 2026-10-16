// apps/web/src/components/site/RoundPlayer.tsx
'use client';

import React from 'react';
import {
  Button,
  Slip,
  Stamp,
  Tape,
  TapeEntry,
  Banner,
  Link,
  Icon,
} from '../ui';

import { useLocale } from '../../lib/i18n';

interface RoundPlayerProps {
  demoData?: any;
  className?: string;
}

export function RoundPlayer({ demoData, className = '' }: RoundPlayerProps) {
  const locale = useLocale();
  const [data, setData] = React.useState<any>(demoData || null);
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState<1 | 2>(1);

  React.useEffect(() => {
    if (!data) {
      fetch('/demo/sandbox-run-1.json')
        .then((res) => res.json())
        .then((json) => setData(json))
        .catch(() => {});
    }
  }, [data]);

  // Autoplay ticker
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && data?.events) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= data.events.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3000 / speed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, speed, data]);

  if (!data || !data.events) {
    return (
      <div className="p-8 text-center bg-paper-1 border border-line font-mono text-secondary text-ink-500 animate-pulse">
        {locale === 'am' ? 'የሙከራ መረጃው በመጫን ላይ ነው...' : locale === 'om' ? 'Odeeffannoo yaalii fe\'aa jira...' : 'Loading sandbox replay data...'}
      </div>
    );
  }

  const currentEvent = data.events[currentStepIndex] || data.events[0];
  const totalEvents = data.events.length;

  const tapeEntries: TapeEntry[] = data.decisionRecords
    .slice(0, currentStepIndex + 2)
    .map((rec: any) => ({
      id: String(rec.seq),
      time: '9:0' + (rec.seq) + ' AM',
      sentence: `${rec.kind.replace(/_/g, ' ')}: ${rec.reason}`,
      hash: rec.hash,
      isVerified: true,
    }));

  const bannerMsg = locale === 'am'
    ? 'የተመሰለ ዙር። የሙከራ ገንዘብ። በArc Testnet ላይ የተመዘገበው ዙር ማሳያ።'
    : locale === 'om'
    ? 'Yaalii marsaa. Qarshii yaalii. Marsaa Arc Testnet irratti galmaa\'e deebisee taphachiisa.'
    : 'Simulated run. Test money. Replaying recorded Arc Testnet round.';

  return (
    <div className={`space-y-4 select-none ${className}`}>
      {/* Persistent Simulated Run Banner (Section 4.1) */}
      <Banner
        type="simulated"
        message={bannerMsg}
      />

      {/* Player Header & Controls */}
      <div className="bg-paper-1 border border-line p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <span className="font-mono text-meta uppercase text-ink-500">
              {locale === 'am' ? `ክስተት ${currentStepIndex + 1} ከ ${totalEvents}: ${currentEvent.name}` :
               locale === 'om' ? `Taatee ${currentStepIndex + 1} keessaa ${totalEvents}: ${currentEvent.name}` :
               `Event ${currentStepIndex + 1} of ${totalEvents}: ${currentEvent.name}`}
            </span>
            <h3 className="font-sans text-lead font-semibold text-ink-900 mt-0.5">
              {currentEvent.title}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-1.5 border border-ink-900 font-sans text-secondary font-semibold hover:bg-paper-2 flex items-center gap-1.5"
              aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
            >
              <Icon name={isPlaying ? 'pause' : 'play'} size={14} ariaHidden={true} />
              <span>{isPlaying ? (locale === 'am' ? 'አቁም' : locale === 'om' ? 'Dhaabi' : 'Pause') : (locale === 'am' ? 'አጫውት' : locale === 'om' ? 'Taphachiisi' : 'Play')}</span>
            </button>

            <button
              type="button"
              onClick={() => setSpeed(speed === 1 ? 2 : 1)}
              className="px-2.5 py-1.5 border border-line font-mono text-meta font-medium hover:bg-paper-2"
              aria-label={`Toggle playback speed: currently ${speed}x`}
            >
              {speed}x
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(0);
              }}
              className="px-2.5 py-1.5 text-secondary text-ink-500 hover:text-ink-900 underline font-sans"
            >
              {locale === 'am' ? 'እንደገና ጀምር' : locale === 'om' ? 'Haaromsi' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div>
          <label htmlFor="round-scrubber" className="sr-only">
            Timeline scrubber
          </label>
          <input
            id="round-scrubber"
            type="range"
            min={0}
            max={totalEvents - 1}
            value={currentStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStepIndex(Number(e.target.value));
            }}
            className="w-full accent-spruce-700 h-2 bg-paper-2 rounded-none cursor-pointer"
          />
          <div className="flex justify-between text-meta font-mono text-ink-500 mt-1">
            <span>{locale === 'am' ? '1. መሰብሰብ' : locale === 'om' ? '1. Walitti Qabuu' : '1. Collect'}</span>
            <span>{locale === 'am' ? '2. ማጣጣም' : locale === 'om' ? '2. Walsimsiisuu' : '2. Match'}</span>
            <span>{locale === 'am' ? '3. መወሰን' : locale === 'om' ? '3. Murteessuu' : '3. Decide'}</span>
            <span>{locale === 'am' ? '4. መልቀቅ' : locale === 'om' ? '4. Gadhiisuu' : '4. Release'}</span>
            <span>{locale === 'am' ? '5. መመዝገብ' : locale === 'om' ? '5. Galmeessuu' : '5. Record'}</span>
          </div>
        </div>
      </div>

      {/* Main Display: Real App Slip & Active Event Context */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: App Component Slip */}
        <div className="space-y-4">
          <Slip
            slipNumber={`No. STEP-0${currentEvent.step}`}
            date={currentEvent.timeDisplay}
            title={
              currentEvent.step === 4
                ? 'Round 1 Pot Released'
                : `Round 1 Contribution: ${currentEvent.activeMember}`
            }
            amount={currentEvent.slip?.amount || '0.10'}
            amountSubtext={currentEvent.slip?.statusText}
            isStamped={currentEvent.step >= 4}
            stampText={currentEvent.step === 4 ? 'RELEASED' : 'VERIFIED'}
            actions={
              <div className="flex items-center justify-between text-secondary">
                <span className="font-mono text-meta text-ink-500">
                  Arc Testnet Block 192840
                </span>
                {currentEvent.receipt?.txUrl && (
                  <Link
                    href={currentEvent.receipt.txUrl}
                    isExternal
                    className="text-spruce-700 underline text-meta font-medium"
                  >
                    {locale === 'am' ? 'ደረሰኝ ክፈት >>' : locale === 'om' ? 'Ragaa bani >>' : 'Open receipt >>'}
                  </Link>
                )}
              </div>
            }
          >
            <p className="font-sans text-secondary text-ink-700 leading-relaxed">
              {currentEvent.description}
            </p>

            {currentEvent.proposal && (
              <div className="p-3 bg-paper-2 border border-line mt-3 space-y-1 font-sans text-secondary">
                <div className="font-mono text-meta font-semibold uppercase text-ink-500">
                  {locale === 'am' ? 'የረዳት የውሳኔ ሃሳብ' : locale === 'om' ? 'Yaada Gargaaraa' : 'Assistant Recommendation'} ({currentEvent.proposal.id})
                </div>
                <div className="font-semibold text-ink-900">
                  {currentEvent.proposal.title}
                </div>
                <div className="text-meta text-ink-700">
                  {currentEvent.proposal.reasoning}
                </div>
                <div className="text-meta font-mono text-spruce-700 font-semibold pt-1">
                  {locale === 'am' ? 'ሁኔታ:' : locale === 'om' ? 'Haala:' : 'Status:'} {currentEvent.proposal.status} ({currentEvent.proposal.votes})
                </div>
              </div>
            )}
          </Slip>
        </div>

        {/* Right: Append-Only Record Tape */}
        <div className="bg-paper-1 border border-line p-5">
          <div className="flex justify-between items-center mb-3">
            <span className="font-mono text-meta font-semibold uppercase text-ink-500">
              {locale === 'am' ? 'የተረጋገጠ የማይበረዝ ቴፕ' : locale === 'om' ? 'Sanjata Mirkanaa\'e' : 'Verified Append-Only Tape'}
            </span>
            <span className="text-meta font-mono text-ink-500">
              {tapeEntries.length} {locale === 'am' ? 'ምዝገባዎች' : locale === 'om' ? 'galmee' : 'entries recorded'}
            </span>
          </div>

          <div className="max-h-[360px] overflow-y-auto pr-2">
            <Tape entries={tapeEntries} />
          </div>
        </div>
      </div>
    </div>
  );
}
