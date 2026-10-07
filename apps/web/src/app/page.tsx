// apps/web/src/app/page.tsx
'use client';

import React from 'react';
import { api } from '../lib/api-client';
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
} from '../lib/types';
import { Header } from '../components/Header';
import { PauseBanner } from '../components/PauseBanner';
import { GroupSummaryCard } from '../components/GroupSummaryCard';
import { MyObligationCard } from '../components/MyObligationCard';
import { MemberAvatarRow } from '../components/MemberAvatarRow';
import { RoundDetailView } from '../components/RoundDetailView';
import { ApprovalInboxView } from '../components/ApprovalInboxView';
import { DiscrepancyLedgerView } from '../components/DiscrepancyLedgerView';
import { DecisionLogView } from '../components/DecisionLogView';
import { OrganizerConsoleView } from '../components/OrganizerConsoleView';
import { PayFlowModal } from '../components/PayFlowModal';
import { SignInView } from '../components/SignInView';
import { PauseSwitchModal } from '../components/PauseSwitchModal';
import { RulesFreezeModal } from '../components/RulesFreezeModal';
import { CreateGroupWizardModal } from '../components/CreateGroupWizardModal';
import { Loader2 } from 'lucide-react';

export default function GroupHomePage() {
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

  const [activeTab, setActiveTab] = React.useState<
    'round' | 'approvals' | 'discrepancies' | 'decisions' | 'organizer'
  >('round');

  const [payModalOpen, setPayModalOpen] = React.useState(false);
  const [signInOpen, setSignInOpen] = React.useState(false);
  const [pauseModalOpen, setPauseModalOpen] = React.useState(false);
  const [freezeModalOpen, setFreezeModalOpen] = React.useState(false);
  const [wizardModalOpen, setWizardModalOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    try {
      const currentUser = api.getUser();
      setUser({ ...currentUser });

      const groupRes = await api.getGroup('grp-alpha-001');
      setGroup({ ...groupRes.group });
      setObligation({ ...groupRes.myObligation });
      setNextActionText(groupRes.nextActionText);

      const roundRes = await api.getRound('grp-alpha-001', 1);
      setRound({ ...roundRes });

      const propRes = await api.getProposals('grp-alpha-001');
      setProposals([...propRes]);

      const discRes = await api.getDiscrepancies('grp-alpha-001');
      setDiscrepancies([...discRes]);

      const decRes = await api.getDecisions('grp-alpha-001');
      setDecisions([...decRes]);

      const mems = await api.getOrganizerMembers('grp-alpha-001');
      setOrganizerMembers([...mems]);

      const invites = await api.getInviteLinks('grp-alpha-001');
      setInviteLinks([...invites]);
    } catch (err) {
      console.error('Error loading group data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
    // Poll every 10 seconds for real-time progress per Section 4
    const interval = setInterval(() => {
      loadData();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleRefreshAuth = () => {
    api.refreshSignIn();
    const updated = api.getUser();
    setUser({ ...updated });
  };

  const handleSignInSuccess = (email: string) => {
    handleRefreshAuth();
    setSignInOpen(false);
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
    setActiveTab('organizer');
  };

  if (loading || !user || !group || !obligation || !round) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <Loader2 size={36} className="spin" color="var(--moss)" />
        <p style={{ marginTop: '16px', color: 'var(--charcoal-muted)' }}>
          Loading EqubFlow dashboard...
        </p>
      </div>
    );
  }

  const awaitingApprovalsCount = proposals.filter(
    (p) => p.status === 'awaiting_approval'
  ).length;

  const openDiscrepanciesCount = discrepancies.filter(
    (d) => d.status === 'open' || d.status === 'proposed'
  ).length;

  return (
    <div>
      {/* Persistent Pause Banner */}
      <PauseBanner
        paused={group.paused}
        onResumeClick={() => setPauseModalOpen(true)}
        canResume={user.role === 'organizer'}
      />

      <Header
        user={user}
        group={group}
        onRefreshAuth={() => setSignInOpen(true)}
      />

      <main className="container" style={{ paddingTop: '24px', paddingBottom: '60px' }}>
        {/* Hero Card */}
        <GroupSummaryCard group={group} />

        {/* What's Next For You */}
        <MyObligationCard
          obligation={obligation}
          nextActionText={nextActionText}
          onPayClick={() => setPayModalOpen(true)}
        />

        {/* Member Avatar Row */}
        <MemberAvatarRow contributions={round.contributions} />

        {/* Navigation Tabs */}
        <div className="tabs-nav" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'round'}
            className={`tab-btn ${activeTab === 'round' ? 'active' : ''}`}
            onClick={() => setActiveTab('round')}
          >
            Round Details
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'approvals'}
            className={`tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
            onClick={() => setActiveTab('approvals')}
          >
            Approvals
            {awaitingApprovalsCount > 0 && (
              <span
                style={{
                  background: 'var(--clay)',
                  color: '#FFFFFF',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.72rem',
                  marginLeft: '6px',
                }}
              >
                {awaitingApprovalsCount}
              </span>
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'discrepancies'}
            className={`tab-btn ${activeTab === 'discrepancies' ? 'active' : ''}`}
            onClick={() => setActiveTab('discrepancies')}
          >
            Something Doesn&apos;t Add Up
            {openDiscrepanciesCount > 0 && (
              <span
                style={{
                  background: 'var(--warning)',
                  color: '#FFFFFF',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.72rem',
                  marginLeft: '6px',
                }}
              >
                {openDiscrepanciesCount}
              </span>
            )}
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'decisions'}
            className={`tab-btn ${activeTab === 'decisions' ? 'active' : ''}`}
            onClick={() => setActiveTab('decisions')}
          >
            Decision Log
          </button>

          {user.role === 'organizer' && (
            <button
              role="tab"
              aria-selected={activeTab === 'organizer'}
              className={`tab-btn ${activeTab === 'organizer' ? 'active' : ''}`}
              onClick={() => setActiveTab('organizer')}
            >
              Organizer Console
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'round' && <RoundDetailView round={round} />}
        {activeTab === 'approvals' && (
          <ApprovalInboxView
            proposals={proposals}
            onProposalUpdated={loadData}
          />
        )}
        {activeTab === 'discrepancies' && (
          <DiscrepancyLedgerView discrepancies={discrepancies} />
        )}
        {activeTab === 'decisions' && (
          <DecisionLogView decisions={decisions} />
        )}
        {activeTab === 'organizer' && (
          <OrganizerConsoleView
            group={group}
            members={organizerMembers}
            inviteLinks={inviteLinks}
            onPauseClick={() => setPauseModalOpen(true)}
            onStartCycleClick={() => setFreezeModalOpen(true)}
            onCreateGroupClick={() => setWizardModalOpen(true)}
          />
        )}
      </main>

      {/* Pay Flow Modal */}
      <PayFlowModal
        obligation={obligation}
        user={user}
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Sign In Modal */}
      {signInOpen && (
        <div className="modal-overlay" onClick={() => setSignInOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: 0 }}>
            <SignInView
              onSignInSuccess={handleSignInSuccess}
              onCancel={() => setSignInOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Pause Switch Modal */}
      <PauseSwitchModal
        isOpen={pauseModalOpen}
        isPaused={group.paused}
        onClose={() => setPauseModalOpen(false)}
        onConfirm={handleTogglePause}
      />

      {/* Rules Freeze & Start Cycle Modal */}
      <RulesFreezeModal
        isOpen={freezeModalOpen}
        group={group}
        onClose={() => setFreezeModalOpen(false)}
        onConfirm={handleStartCycle}
      />

      {/* Create Group Wizard Modal */}
      <CreateGroupWizardModal
        isOpen={wizardModalOpen}
        onClose={() => setWizardModalOpen(false)}
        onCreated={handleGroupCreated}
      />
    </div>
  );
}
