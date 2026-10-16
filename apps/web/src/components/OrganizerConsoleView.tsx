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
        monoLabel={`No. ${group.id.slice(0, 4)} · Organizer console`}
        title={group.name}
        statusSentence={
          group.paused
            ? 'The circle is paused. No payments will move until you resume.'
            : isRunning
            ? `Cycle ${group.cycleNo} is active and running.`
            : 'Pre-cycle preparation. Invite members and verify readiness to start.'
        }
        action={
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={onCreateGroupClick}
            >
              New circle
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
              {group.paused ? 'Resume the circle' : 'Pause the circle'}
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
                Start the circle
              </h3>
              <p className="font-sans text-secondary text-ink-500 mt-0.5">
                {allReady
                  ? 'All member slots are filled and accounts are ready.'
                  : `Waiting for ${group.memberCount - readyMembers.length} member slot(s) to be joined and prepared.`}
              </p>
            </div>

            <div>
              <Button
                variant="primary"
                size="md"
                disabled={!allReady}
                onClick={() => setIsStartSheetOpen(true)}
              >
                Start the circle
              </Button>
            </div>
          </div>
          {!allReady && (
            <p className="font-sans text-meta text-ink-500 mt-2 italic">
              All {group.memberCount} members must join, fund their wallets, and acknowledge rules before starting.
            </p>
          )}
        </div>
      )}

      {/* READINESS LIST (A9.2) */}
      <div className="bg-paper-1 border border-line p-5">
        <div className="font-mono text-meta font-semibold text-ink-500 uppercase tracking-wider mb-3">
          READINESS
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
                    Slot {idx + 1}
                  </span>
                  <span className="text-ink-900 font-semibold">
                    {mem ? mem.alias : 'Not joined yet'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {mem ? (
                    mem.ready ? (
                      <div className="flex items-center gap-2">
                        <span className="text-ink-500 text-meta">
                          Joined · account ready
                        </span>
                        <Stamp text="VERIFIED" />
                      </div>
                    ) : (
                      <span className="text-ochre-700 text-meta font-medium">
                        Joined · account being prepared
                      </span>
                    )
                  ) : (
                    <span className="text-ink-500 text-meta">
                      Waiting for invite
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Funding Status Row */}
            <div className="py-3.5 flex justify-between items-center flex-wrap gap-2 text-secondary font-sans bg-paper-2/50 px-2">
              <span className="text-ink-900 font-medium">Funding status</span>
              <span className="text-meta font-mono text-ink-700">
                Each member needs 1 USDC test money. ({readyMembers.length}/{group.memberCount} funded)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* INVITES SECTION (A9.2) */}
      <div className="bg-paper-1 border border-line p-5">
        <div className="font-mono text-meta font-semibold text-ink-500 uppercase tracking-wider mb-3">
          INVITES
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
                      Invite link {idx + 1}
                    </span>
                    <span
                      className={`text-meta font-mono uppercase px-1.5 py-0.5 rounded-sm ${
                        isUsed
                          ? 'bg-paper-2 text-ink-500'
                          : 'bg-spruce-100 text-spruce-700'
                      }`}
                    >
                      {isUsed ? `Used by ${inv.claimedBy}` : 'Active'}
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
                      {copiedToken === inv.token ? 'Copied' : 'Copy link'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => shareInvite(inv.token, inv.url)}
                    >
                      Share
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
        title={group.paused ? 'Resume the circle' : 'Pause the circle'}
      >
        <div className="space-y-5">
          <p className="font-sans text-lead font-normal text-ink-900 leading-snug">
            {group.paused
              ? 'Resuming enables the group to accept scheduled payments and continue rotating pot payouts.'
              : 'No payments will move until you resume. Payments already sent are not undone.'}
          </p>

          <div className="p-3 bg-paper-2 border border-line text-meta font-mono text-ink-700">
            {group.paused
              ? 'Safety lock will be disengaged on Arc Testnet.'
              : 'Safety lock will engage on Arc Testnet to fail-closed all transfers.'}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setIsPauseSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant={group.paused ? 'primary' : 'destructive'}
              size="md"
              fullWidth
              onClick={handleConfirmPause}
            >
              {group.paused ? 'Confirm resume' : 'Confirm pause'}
            </Button>
          </div>
        </div>
      </Sheet>

      {/* START CYCLE CONFIRMATION SHEET (A9.3) */}
      <Sheet
        isOpen={isStartSheetOpen}
        onClose={() => setIsStartSheetOpen(false)}
        title="Start the circle"
      >
        <div className="space-y-5">
          <p className="font-sans text-lead font-normal text-ink-900 leading-snug">
            Starting freezes the rules and the order. They cannot change during the cycle.
          </p>

          <div className="p-4 bg-paper-2 border border-line space-y-2">
            <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider">
              Rules fingerprint to freeze:
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
            I understand that rules and payout order will freeze permanently.
          </ConsentControl>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setIsStartSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!freezeConsent}
              onClick={handleConfirmStart}
            >
              Confirm and start circle
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
