// apps/web/src/app/page.tsx
'use client';

import React from 'react';
import { api } from '../../lib/api-client';
import type {
  GroupSummary,
  MyObligation,
  RoundView,
  ProposalView,
  DiscrepancyView,
  DecisionRecordView,
  UserSession,
  OrganizerMember,
  InviteLinkItem,
} from '../../lib/types';
import { AppShell, NavItemKey } from '../../components/AppShell';
import { GroupHomeView } from '../../components/GroupHomeView';
import { RoundDetailView } from '../../components/RoundDetailView';
import { ApprovalInboxView } from '../../components/ApprovalInboxView';
import { DiscrepancyLedgerView } from '../../components/DiscrepancyLedgerView';
import { DecisionLogView } from '../../components/DecisionLogView';
import { OrganizerConsoleView } from '../../components/OrganizerConsoleView';
import { ReceiptsView, ReceiptItem } from '../../components/ReceiptsView';
import { SettingsView } from '../../components/SettingsView';
import { PayFlowModal } from '../../components/PayFlowModal';
import { SignInView } from '../../components/SignInView';
import { CreateGroupWizardModal } from '../../components/CreateGroupWizardModal';
import { SlipSkeleton, Stamp, Link, Sheet, TextInput, Button } from '../../components/ui';
import { useLocale } from '../../lib/i18n';
import { rightColumnTranslations } from '../../lib/translations';

export default function GroupHomePage() {
  const locale = useLocale();
  const rc = rightColumnTranslations[locale] || rightColumnTranslations.en;

  const [user, setUser] = React.useState<UserSession | null>(null);
  const [group, setGroup] = React.useState<GroupSummary | null>(null);
  const [obligation, setObligation] = React.useState<MyObligation | null>(null);
  const [nextActionText, setNextActionText] = React.useState<string>('');
  const [round, setRound] = React.useState<RoundView | null>(null);
  const [proposals, setProposals] = React.useState<ProposalView[]>([]);
  const [discrepancies, setDiscrepancies] = React.useState<DiscrepancyView[]>([]);
  const [decisions, setDecisions] = React.useState<DecisionRecordView[]>([]);
  const [organizerMembers, setOrganizerMembers] = React.useState<OrganizerMember[]>([]);
  const [inviteLinks, setInviteLinks] = React.useState<InviteLinkItem[]>([]);

  const [activeNav, setActiveNav] = React.useState<NavItemKey>('home');
  const [payModalOpen, setPayModalOpen] = React.useState(false);
  const [wizardModalOpen, setWizardModalOpen] = React.useState(false);
  const [onboardingOpen, setOnboardingOpen] = React.useState(false);
  const [nicknameInput, setNicknameInput] = React.useState('');
  const [savingNickname, setSavingNickname] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [isRevalidating, setIsRevalidating] = React.useState(false);

  const loadData = React.useCallback(async (isBackground = false) => {
    try {
      if (isBackground) setIsRevalidating(true);

      // 1. Check real authentication session
      const sessionRes = await fetch('/api/auth/session').catch(() => null);
      if (!sessionRes || !sessionRes.ok) {
        setUser(null);
        setLoading(false);
        setIsRevalidating(false);
        return;
      }

      const sessionJson = await sessionRes.json().catch(() => ({}));
      const sessionUser = sessionJson.data?.user || sessionJson.user;
      if (!sessionUser || !sessionUser.userId) {
        setUser(null);
        setLoading(false);
        setIsRevalidating(false);
        return;
      }

      // Check local storage for nickname if not yet in database
      const localNickname = typeof window !== 'undefined' ? localStorage.getItem('equbflow_nickname') : null;
      const effectiveAlias = sessionUser.alias || localNickname || null;

      // Only prompt onboarding on initial interactive load, never during background polling, and only if no alias exists
      if (!isBackground && !effectiveAlias) {
        setOnboardingOpen(true);
      }

      const userSession: UserSession = {
        userId: sessionUser.userId,
        alias: effectiveAlias || 'Member',
        walletAddress: sessionUser.walletAddress || '0xeb21103e749d682c3f0e36a23852f246b1b4d016',
        role: sessionUser.role || 'member',
        groupId: sessionUser.groupId || 'grp-alpha-001',
        lastSignInAt: sessionUser.lastSignInAt || new Date().toISOString(),
      };
      setUser(userSession);

      const targetGroupId = sessionUser.groupId || 'grp-alpha-001';
      const groupRes = await api.getGroup(targetGroupId);
      setGroup({ ...groupRes.group });
      setObligation({ ...groupRes.myObligation });
      setNextActionText(groupRes.nextActionText);

      const roundRes = await api.getRound(targetGroupId, 1);
      setRound({ ...roundRes });

      const propRes = await api.getProposals(targetGroupId);
      setProposals([...propRes]);

      const discRes = await api.getDiscrepancies(targetGroupId);
      setDiscrepancies([...discRes]);

      const decRes = await api.getDecisions(targetGroupId);
      setDecisions([...decRes]);

      const mems = await api.getOrganizerMembers(targetGroupId);
      setOrganizerMembers([...mems]);

      const invites = await api.getInviteLinks(targetGroupId);
      setInviteLinks([...invites]);
    } catch (err) {
      console.error('Error loading session or group data:', err);
      setUser(null);
    } finally {
      setLoading(false);
      setIsRevalidating(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
    // Poll every 15 seconds for real-time progress
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSignInSuccess = async (_email: string) => {
    setLoading(true);
    await loadData();
  };

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    const alias = nicknameInput.trim();
    if (!alias) return;
    setSavingNickname(true);
    setOnboardingOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('equbflow_nickname', alias);
    }
    setUser((prev) => (prev ? { ...prev, alias } : null));
    try {
      await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias }),
      });
    } catch (err) {
      console.error('Failed to save nickname on server:', err);
    } finally {
      setSavingNickname(false);
    }
  };

  const handleTogglePause = async (reason?: string) => {
    if (!group) return;
    await api.togglePause(group.id, !group.paused, reason);
    await loadData();
  };

  const handleStartCycle = async () => {
    if (!group) return;
    await api.startCycle(group.id);
    await loadData();
  };

  const handleGroupCreated = async (newGroup: GroupSummary) => {
    setGroup({ ...newGroup });
    await loadData();
    setActiveNav('organizer');
  };

  const awaitingApprovalsCount = proposals.filter(
    (p) => p.status === 'awaiting_approval'
  ).length;

  // Signed out state -> Section A1 Sign in view
  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-paper-0 flex flex-col justify-center px-4 py-8">
        <SignInView onSignInSuccess={handleSignInSuccess} />
      </div>
    );
  }

  // Loading skeleton state
  if (loading || !user || !group || !obligation || !round) {
    return (
      <div className="min-h-screen bg-paper-0 max-w-[480px] mx-auto px-5 pt-20">
        <div className="masthead-rule mb-6" />
        <div className="text-center mb-6">
          <div className="font-mono text-meta font-medium text-ink-500 uppercase tracking-wider mb-2">
            EqubFlow
          </div>
          <p className="text-secondary text-ink-700">Loading circle ledger...</p>
        </div>
        <SlipSkeleton />
      </div>
    );
  }

  // Build receipts list for user
  const receiptsList: ReceiptItem[] = [
    {
      id: 'rcpt-r1-contrib',
      roundNumber: 1,
      date: 'Oct 16, 9:00 PM',
      kind: 'contribution',
      amountDisplay: obligation.display,
      isConfirmed: obligation.state === 'paid',
      txHash: '0x4b1c77ae9801beef42',
      txUrl: 'https://testnet.arcscan.io/tx/0x4b1c77ae9801beef42',
    },
    {
      id: 'rcpt-r0-payout',
      roundNumber: 0,
      date: 'Oct 12, 9:02 PM',
      kind: 'payout',
      amountDisplay: round.potDisplay.replace(/ \/ .*$/, ' USDC'),
      isConfirmed: true,
      txHash: '0xa3f912c98401beef42',
      txUrl: 'https://testnet.arcscan.io/tx/0xa3f912c98401beef42',
    },
  ];

  // Right column contextual explanation (never decoration, Section A0)
  const renderRightColumn = () => {
    switch (activeNav) {
      case 'home':
      case 'rounds':
        return (
          <div className="space-y-6">
            <div>
              <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500 mb-2">
                {rc.whyDeadlineTitle}
              </div>
              <p className="text-secondary text-ink-700 leading-relaxed mb-3">
                {rc.whyDeadlineDesc}
              </p>
            </div>

            <div className="border-t border-line pt-4">
              <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500 mb-2">
                {rc.latestReceiptTitle}
              </div>
              <div className="p-3 bg-paper-1 border border-line space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-meta text-ink-500">Round 1</span>
                  <Stamp text="PAID" />
                </div>
                <div className="font-sans text-[20px] font-semibold tabular text-ink-900">
                  {obligation.display}
                </div>
                <div className="font-mono text-[11px] text-ink-500 break-all">
                  Ref: 0x4b1c…77ae
                </div>
              </div>
            </div>

            <div className="border-t border-line pt-4 text-meta text-ink-500">
              <Link href="/audit/grp-alpha-001" isExternal className="text-spruce-700 underline">
                {rc.openAuditLink}
              </Link>
            </div>
          </div>
        );

      case 'inbox':
        return (
          <div className="space-y-4">
            <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500">
              {rc.whyHumanTitle}
            </div>
            <p className="text-secondary text-ink-700 leading-relaxed">
              {rc.whyHumanDesc}
            </p>
            <div className="p-3 bg-paper-2 border border-line text-meta text-ink-700 font-mono">
              {rc.consensusReq}
            </div>
          </div>
        );

      case 'differences':
        return (
          <div className="space-y-4">
            <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500">
              {rc.zeroRoundingTitle}
            </div>
            <p className="text-secondary text-ink-700 leading-relaxed">
              {rc.zeroRoundingDesc}
            </p>
          </div>
        );

      case 'record':
        return (
          <div className="space-y-4">
            <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500">
              {rc.tamperTitle}
            </div>
            <p className="text-secondary text-ink-700 leading-relaxed">
              {rc.tamperDesc}
            </p>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div className="font-mono text-meta font-semibold uppercase tracking-wider text-ink-500">
              {rc.safetyTitle}
            </div>
            <p className="text-secondary text-ink-700 leading-relaxed">
              {rc.safetyDesc}
            </p>
          </div>
        );
    }
  };

  return (
    <>
      <AppShell
        user={user}
        group={group}
        activeNav={activeNav}
        onNavigate={(nav: NavItemKey) => setActiveNav(nav)}
        inboxBadgeCount={awaitingApprovalsCount}
        rightColumnContent={renderRightColumn()}
        isRevalidating={isRevalidating}
      >
        {activeNav === 'home' && (
          <GroupHomeView
            user={user}
            group={group}
            obligation={obligation}
            round={round}
            nextActionText={nextActionText}
            onPayClick={() => setPayModalOpen(true)}
            onNavigate={(v: string) => setActiveNav(v as NavItemKey)}
          />
        )}

        {activeNav === 'rounds' && (
          <RoundDetailView
            round={round}
            onNavigateToDifferences={() => setActiveNav('differences')}
          />
        )}

        {activeNav === 'inbox' && (
          <ApprovalInboxView
            proposals={proposals}
            onProposalUpdated={loadData}
          />
        )}

        {activeNav === 'differences' && (
          <DiscrepancyLedgerView
            discrepancies={discrepancies}
            onNavigateToInbox={() => setActiveNav('inbox')}
          />
        )}

        {activeNav === 'record' && (
          <DecisionLogView decisions={decisions} />
        )}

        {activeNav === 'organizer' && (
          <OrganizerConsoleView
            group={group}
            members={organizerMembers}
            inviteLinks={inviteLinks}
            onPauseClick={() => handleTogglePause()}
            onStartCycleClick={() => handleStartCycle()}
            onCreateGroupClick={() => setWizardModalOpen(true)}
          />
        )}

        {activeNav === 'receipts' && (
          <ReceiptsView
            receipts={receiptsList}
            currentRoundNumber={round.roundNo}
          />
        )}

        {activeNav === 'settings' && (
          <SettingsView
            user={user}
            isCycleStarted={group.status === 'running'}
            onUpdateNickname={async (newNickname) => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('equbflow_nickname', newNickname);
              }
              await fetch('/api/auth/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alias: newNickname }),
              });
              setUser((prev) => (prev ? { ...prev, alias: newNickname } : null));
            }}
            onSignOut={async () => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('equbflow_nickname');
              }
              await fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => {});
              setUser(null);
            }}
          />
        )}
      </AppShell>

      {/* Choose Nickname Onboarding Modal */}
      <Sheet
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        title={locale === 'am' ? 'የእርስዎን ቅጽል ስም ይምረጡ' : locale === 'om' ? 'Maqaa Masoo Filadhaa' : 'Choose your nickname'}
      >
        <form onSubmit={handleSaveNickname} className="space-y-5 pt-3 select-none">
          <p className="text-secondary text-ink-700 leading-relaxed">
            {locale === 'am'
              ? 'ይህ ቅጽል ስም በዕቁቡ አባላት ዘንድ ክፍያዎችዎን፣ ድምጽዎን እና የዕጣ ተራዎን ለመለየት ይጠቅማል።'
              : locale === 'om'
              ? 'Maqaan kun miseensota iqubii biratti kaffaltii fi sagalee keessan adda baasuuf gargaara.'
              : 'This nickname will identify your contributions, votes, and payout slot to other circle members.'}
          </p>

          <TextInput
            id="user-nickname"
            label={locale === 'am' ? 'ቅጽል ስም / መጠሪያ' : locale === 'om' ? 'Maqaa Masoo' : 'Nickname / Alias'}
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            placeholder={locale === 'am' ? 'ለምሳሌ፡ ዳዊት ወይም አበበ ጫማ' : locale === 'om' ? 'Fkn: Dawit ykn Abebe' : 'e.g. Dawit, Abebe, or ShoesCustomer'}
            required
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={savingNickname}
            disabled={!nicknameInput.trim() || savingNickname}
          >
            {locale === 'am' ? 'አስቀምጥና ወደ ዕቁቡ ግባ' : locale === 'om' ? 'Galmeessiitii Seeni' : 'Save and enter circle'}
          </Button>
        </form>
      </Sheet>

      {/* Pay Flow Modal (A4) */}
      <PayFlowModal
        obligation={obligation}
        user={user}
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Create Group Wizard Modal (A9.1) */}
      <CreateGroupWizardModal
        isOpen={wizardModalOpen}
        onClose={() => setWizardModalOpen(false)}
        onCreated={handleGroupCreated}
      />
    </>
  );
}
