// apps/web/src/components/OrganizerConsoleView.tsx
'use client';

import React from 'react';
import type { GroupSummary, OrganizerMember, InviteLinkItem } from '../lib/types';
import {
  PageHeader,
  Button,
  Stamp,
  Sheet,
  ConsentControl,
} from './ui';
import { useLocale } from '../lib/i18n';
import { organizerConsoleTranslations } from '../lib/app-translations';

interface OrganizerConsoleViewProps {
  group: GroupSummary;
  members: OrganizerMember[];
  inviteLinks: InviteLinkItem[];
  isLoading?: boolean;
  onPauseClick: () => void;
  onStartCycleClick: () => void;
  onCreateGroupClick: () => void;
}

export function OrganizerConsoleView({
  group,
  members,
  inviteLinks,
  isLoading = false,
  onPauseClick,
  onStartCycleClick,
  onCreateGroupClick,
}: OrganizerConsoleViewProps) {
  const locale = useLocale();
  const c = organizerConsoleTranslations[locale] || organizerConsoleTranslations.en;
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);
  const [isPauseSheetOpen, setIsPauseSheetOpen] = React.useState(false);
  const [isStartSheetOpen, setIsStartSheetOpen] = React.useState(false);
  const [freezeConsent, setFreezeConsent] = React.useState(false);

  const copyInvite = (token: string, url: string) => {
    navigator.clipboard?.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const shareInvite = async (token: string, url: string) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on EqubFlow`,
          text: `You are invited to join our rotating savings circle ${group.name}.`,
          url,
        });
        return;
      } catch {
        // Fallback to copy if cancelled or rejected
      }
    }
    copyInvite(token, url);
  };

  const readyMembers = members.filter((m) => m.ready);
  const isRunning = group.status === 'running' || group.status === 'paused';
  const allSlotsFilled = members.length >= group.memberCount;
  const allReady = allSlotsFilled && readyMembers.length === members.length;

  const handleConfirmPause = () => {
    setIsPauseSheetOpen(false);
    onPauseClick();
  };

  const handleConfirmStart = () => {
    if (!freezeConsent) return;
    setIsStartSheetOpen(false);
    onStartCycleClick();
  };

  const memberSlots = Array.from({ length: group.memberCount }, (_, i) => {
    return members[i] || null;
  });

  return (
    <div className="select-none space-y-8">
      {/* Page Header with Persistent Pause/Resume and New Circle actions */}
      <PageHeader
        monoLabel={c.mono(group.id)}
        title={group.name}
        statusSentence={
          group.paused
            ? c.pausedStatus
            : isRunning
            ? c.runningStatus(group.cycleNo)
            : c.prepStatus
        }
        action={
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={onCreateGroupClick}
            >
              {c.newCircle}
            </Button>

            <button
              type="button"
              onClick={() => setIsPauseSheetOpen(true)}
              className={`px-3 py-1.5 font-sans text-secondary font-semibold border rounded-sm transition-colors ${
                group.paused
                  ? 'border-spruce-700 text-spruce-700 hover:bg-spruce-100/50'
                  : 'border-brick-700 text-brick-700 hover:bg-brick-100/50'
              }`}
            >
              {group.paused ? c.resumeCircle : c.pauseCircle}
            </button>
          </div>
        }
      />

      {/* START CYCLE SECTION (A9.3) */}
      {!isRunning && (
        <div className="bg-paper-1 border border-line p-5">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="font-sans text-lead font-semibold text-ink-900">
                {c.startCycle}
              </h3>
              <p className="font-sans text-secondary text-ink-500 mt-0.5">
                {allReady
                  ? (locale === 'am' ? 'ሁሉም የአባላት ቦታዎች ተሞልተዋል፤ ሂሳቦች ዝግጁ ናቸው።' : locale === 'om' ? 'Iddoon miseensotaa hundinuu guutameera, qophii ta\'aniiru.' : 'All member slots are filled and accounts are ready.')
                  : (locale === 'am' ? `${group.memberCount - readyMembers.length} አባላት እስኪቀላቀሉ በመጠባበቅ ላይ።` : locale === 'om' ? `Miseensota ${group.memberCount - readyMembers.length} hanga seenanitti eegaa jira.` : `Waiting for ${group.memberCount - readyMembers.length} member slot(s) to be joined and prepared.`)}
              </p>
            </div>

            <div>
              <Button
                variant="primary"
                size="md"
                disabled={!allReady}
                onClick={() => setIsStartSheetOpen(true)}
              >
                {c.startCycle}
              </Button>
            </div>
          </div>
          {!allReady && (
            <p className="font-sans text-meta text-ink-500 mt-2 italic">
              {locale === 'am'
                ? `ሁሉም ${group.memberCount} አባላት ከመጀመሩ በፊት መቀላቀል፣ ዋስትና ማስገባትና ደንቦችን ማጽደቅ አለባቸው።`
                : locale === 'om'
                ? `Miseensonni ${group.memberCount} hundi iqubiin eegaluun dura seenuu, qarshii wabii galchuu fi heera mirkaneessuu qabu.`
                : `All ${group.memberCount} members must join, fund their wallets, and acknowledge rules before starting.`}
            </p>
          )}
        </div>
      )}

      {/* READINESS LIST (A9.2) */}
      <div className="bg-paper-1 border border-line p-5">
        <div className="font-mono text-meta font-semibold text-ink-500 uppercase tracking-wider mb-3">
          {c.membersTitle(readyMembers.length, group.memberCount)}
        </div>

        {isLoading ? (
          <div className="space-y-3 py-2 animate-pulse">
            {[...Array(group.memberCount)].map((_, i) => (
              <div key={i} className="h-10 bg-paper-2" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-line border-t border-b border-line">
            {memberSlots.map((mem, idx) => (
              <div
                key={idx}
                className="py-3 flex justify-between items-center flex-wrap gap-2 text-secondary font-sans"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-meta text-ink-500 w-16">
                    {locale === 'am' ? `ቦታ ${idx + 1}` : locale === 'om' ? `Bakka ${idx + 1}` : `Slot ${idx + 1}`}
                  </span>
                  <span className="text-ink-900 font-semibold">
                    {mem ? mem.alias : c.emptySlot}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {mem ? (
                    mem.ready ? (
                      <div className="flex items-center gap-2">
                        <span className="text-ink-500 text-meta">
                          {c.depositReady}
                        </span>
                        <Stamp text="VERIFIED" />
                      </div>
                    ) : (
                      <span className="text-ochre-700 text-meta font-medium">
                        {c.waitingDeposit}
                      </span>
                    )
                  ) : (
                    <span className="text-ink-500 text-meta">
                      {c.waitingForJoin}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Funding Status Row */}
            <div className="py-3.5 flex justify-between items-center flex-wrap gap-2 text-secondary font-sans bg-paper-2/50 px-2">
              <span className="text-ink-900 font-medium">
                {locale === 'am' ? 'የተቀማጭ ዋስትና ሁኔታ' : locale === 'om' ? 'Haala qarshii wabii' : 'Funding status'}
              </span>
              <span className="text-meta font-mono text-ink-700">
                {locale === 'am'
                  ? `እያንዳንዱ አባል 1 USDC የሙከራ ዋስትና ይሻል። (${readyMembers.length}/${group.memberCount} ዝግጁ)`
                  : locale === 'om'
                  ? `Miseensi hundi 1 USDC yaalii barbaada. (${readyMembers.length}/${group.memberCount} qophii)`
                  : `Each member needs 1 USDC test money. (${readyMembers.length}/${group.memberCount} funded)`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* INVITES SECTION (A9.2) */}
      <div className="bg-paper-1 border border-line p-5">
        <div className="font-mono text-meta font-semibold text-ink-500 uppercase tracking-wider mb-3">
          {c.inviteLink}
        </div>

        <div className="divide-y divide-line border-t border-b border-line">
          {inviteLinks.map((inv, idx) => {
            const isUsed = inv.claimed;
            return (
              <div
                key={inv.token}
                className="py-3 flex justify-between items-center flex-wrap gap-3 font-sans text-secondary"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-meta text-ink-500">
                      {locale === 'am' ? `የመጋበዣ ሊንክ ${idx + 1}` : locale === 'om' ? `Hidhata affeerraa ${idx + 1}` : `Invite link ${idx + 1}`}
                    </span>
                    <span
                      className={`text-meta font-mono uppercase px-1.5 py-0.5 rounded-sm ${
                        isUsed
                          ? 'bg-paper-2 text-ink-500'
                          : 'bg-spruce-100 text-spruce-700'
                      }`}
                    >
                      {isUsed
                        ? (locale === 'am' ? `በ ${inv.claimedBy} ተወስዷል` : locale === 'om' ? `${inv.claimedBy} itti fayyadameera` : `Used by ${inv.claimedBy}`)
                        : (locale === 'am' ? 'ዝግጁ' : locale === 'om' ? 'Qophii' : 'Active')}
                    </span>
                  </div>
                  <div className="font-mono text-[12px] text-ink-500 mt-1 break-all select-all">
                    {inv.url}
                  </div>
                </div>

                {!isUsed && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyInvite(inv.token, inv.url)}
                    >
                      {copiedToken === inv.token ? c.copied : c.copyLink}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => shareInvite(inv.token, inv.url)}
                    >
                      {c.shareLink}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PAUSE CONFIRMATION SHEET (A9.4) */}
      <Sheet
        isOpen={isPauseSheetOpen}
        onClose={() => setIsPauseSheetOpen(false)}
        title={group.paused ? c.resumeCircle : c.pauseSheetTitle}
      >
        <div className="space-y-5">
          <p className="font-sans text-lead font-normal text-ink-900 leading-snug">
            {group.paused
              ? (locale === 'am' ? 'ዕቁቡን መቀጠል የታቀዱ ክፍያዎችንና የዕጣ ክፍያዎችን እንዲቀጥሉ ያስችላል።' : locale === 'om' ? 'Itti fufuun kaffaltii fi qodaa akka itti fufu taasisa.' : 'Resuming enables the group to accept scheduled payments and continue rotating pot payouts.')
              : c.pauseSheetDesc}
          </p>

          <div className="p-3 bg-paper-2 border border-line text-meta font-mono text-ink-700">
            {group.paused
              ? (locale === 'am' ? 'የደህንነት ቁልፉ በArc Testnet ላይ ይነሳል።' : locale === 'om' ? 'Balballi nageenyaa Arc Testnet irratti banama.' : 'Safety lock will be disengaged on Arc Testnet.')
              : (locale === 'am' ? 'የደህንነት ቁልፉ በArc Testnet ላይ በማንቃት ሁሉንም ክፍያዎች ያቆማል።' : locale === 'om' ? 'Balballi nageenyaa Arc Testnet irratti cufamee kaffaltii hunda dhaaba.' : 'Safety lock will engage on Arc Testnet to fail-closed all transfers.')}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setIsPauseSheetOpen(false)}
            >
              {c.cancelBtn}
            </Button>
            <Button
              variant={group.paused ? 'primary' : 'destructive'}
              size="md"
              fullWidth
              onClick={handleConfirmPause}
            >
              {group.paused ? c.resumeCircle : c.confirmPauseBtn}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* START CYCLE CONFIRMATION SHEET (A9.3) */}
      <Sheet
        isOpen={isStartSheetOpen}
        onClose={() => setIsStartSheetOpen(false)}
        title={c.rulesFreezeTitle}
      >
        <div className="space-y-5">
          <p className="font-sans text-lead font-normal text-ink-900 leading-snug">
            {c.rulesFreezeDesc}
          </p>

          <div className="p-4 bg-paper-2 border border-line space-y-2">
            <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
              {locale === 'am' ? 'የሚታሸገው የደንቦች ዲጂታል አሻራ:' : locale === 'om' ? 'Mallattoo seeraa qadaadamu:' : 'Rules fingerprint to freeze:'}
            </div>
            <div className="font-mono text-[13px] text-ink-900 break-all select-all">
              {group.rulesHash || '3f9a72c918ae902148bf901b0849201948ba170cef'}
            </div>
          </div>

          <ConsentControl
            id="freeze-consent"
            checked={freezeConsent}
            onChange={setFreezeConsent}
          >
            {c.consentCheckbox}
          </ConsentControl>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setIsStartSheetOpen(false)}
            >
              {c.cancelBtn}
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!freezeConsent}
              onClick={handleConfirmStart}
            >
              {c.confirmStartBtn}
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
