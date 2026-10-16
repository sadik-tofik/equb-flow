// apps/web/src/components/SettingsView.tsx
'use client';

import React from 'react';
import type { UserSession } from '../lib/types';
import { PageHeader, Button, TextInput, Sheet, Icon } from './ui';

interface SettingsViewProps {
  user: UserSession;
  isCycleStarted?: boolean;
  onUpdateNickname?: (newNickname: string) => Promise<void>;
  onSignOut: () => void;
}

export function SettingsView({
  user,
  isCycleStarted = false,
  onUpdateNickname,
  onSignOut,
}: SettingsViewProps) {
  const [nickname, setNickname] = React.useState(user.alias);
  const [savingNickname, setSavingNickname] = React.useState(false);
  const [nicknameSuccess, setNicknameSuccess] = React.useState(false);
  const [selectedLanguage, setSelectedLanguage] = React.useState<'en' | 'am' | 'om'>('en');

  const [dataSheet, setDataSheet] = React.useState<'download' | 'delete' | null>(null);
  const [contactEmail, setContactEmail] = React.useState('');
  const [dataRequestSent, setDataRequestSent] = React.useState(false);

  const handleSaveNickname = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCycleStarted || !nickname.trim() || nickname === user.alias) return;
    setSavingNickname(true);
    try {
      if (onUpdateNickname) {
        await onUpdateNickname(nickname.trim());
      }
      setNicknameSuccess(true);
      setTimeout(() => setNicknameSuccess(false), 3000);
    } finally {
      setSavingNickname(false);
    }
  };

  const handleDataRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setDataRequestSent(true);
    setTimeout(() => {
      setDataSheet(null);
      setDataRequestSent(false);
      setContactEmail('');
    }, 2000);
  };

  return (
    <div className="select-none space-y-8">
      <PageHeader
        title="Settings"
        statusSentence="Preferences, identity, and personal data controls."
      />

      {/* Identity & Nickname */}
      <div className="bg-paper-1 border border-line p-5">
        <h3 className="font-sans text-lead font-semibold text-ink-900 mb-1">
          Identity
        </h3>
        <p className="font-sans text-secondary text-ink-500 mb-4">
          Your pseudonym visible to other members of your circle.
        </p>

        <form onSubmit={handleSaveNickname} className="space-y-4 max-w-md">
          <TextInput
            id="nickname-input"
            label="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={isCycleStarted}
            helperText={
              isCycleStarted
                ? 'Nickname is locked because the circle cycle has started.'
                : 'You can change your nickname before the circle starts.'
            }
          />

          <div className="font-mono text-meta text-ink-500">
            Wallet address: {user.walletAddress}
          </div>

          {!isCycleStarted && (
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                loading={savingNickname}
                disabled={nickname === user.alias || !nickname.trim()}
              >
                Save nickname
              </Button>
              {nicknameSuccess && (
                <span className="font-sans text-meta text-spruce-700 font-medium">
                  Nickname saved.
                </span>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Language */}
      <div className="bg-paper-1 border border-line p-5">
        <h3 className="font-sans text-lead font-semibold text-ink-900 mb-1">
          Language
        </h3>
        <p className="font-sans text-secondary text-ink-500 mb-4">
          Choose your interface language.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md">
          {(
            [
              { id: 'en', label: 'English', sub: 'Default' },
              { id: 'am', label: 'አማርኛ', sub: 'Amharic' },
              { id: 'om', label: 'Afaan Oromoo', sub: 'Oromo' },
            ] as const
          ).map((lang) => (
            <button
              key={lang.id}
              type="button"
              onClick={() => setSelectedLanguage(lang.id)}
              className={`p-3 text-left border transition-colors ${
                selectedLanguage === lang.id
                  ? 'border-ink-900 bg-ink-900 text-paper-0 font-semibold'
                  : 'border-line bg-paper-0 text-ink-900 hover:bg-paper-2'
              }`}
            >
              <div className="font-sans text-secondary font-medium">
                {lang.label}
              </div>
              <div
                className={`font-mono text-meta ${
                  selectedLanguage === lang.id
                    ? 'text-paper-1/70'
                    : 'text-ink-500'
                }`}
              >
                {lang.sub}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Data Requests */}
      <div className="bg-paper-1 border border-line p-5">
        <h3 className="font-sans text-lead font-semibold text-ink-900 mb-1">
          Your data
        </h3>
        <p className="font-sans text-secondary text-ink-500 mb-4">
          Request an archive of your transaction history or account deletion.
        </p>

        <div className="flex gap-3 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDataSheet('download')}
          >
            Download my data
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDataSheet('delete')}
          >
            Delete my data
          </Button>
        </div>
      </div>

      {/* Legal & Safety */}
      <div className="bg-paper-1 border border-line p-5">
        <h3 className="font-sans text-lead font-semibold text-ink-900 mb-2">
          Legal and safety
        </h3>
        <div className="flex gap-4 text-secondary text-ink-700 underline flex-wrap">
          <a href="/terms" className="hover:text-ink-900">
            Terms of Service
          </a>
          <span>·</span>
          <a href="/privacy" className="hover:text-ink-900">
            Privacy Policy
          </a>
          <span>·</span>
          <a href="/security" className="hover:text-ink-900">
            Security Architecture
          </a>
        </div>
      </div>

      {/* Sign out */}
      <div className="pt-2">
        <Button variant="secondary" size="md" onClick={onSignOut}>
          Sign out
        </Button>
      </div>

      {/* Data Request Sheet */}
      <Sheet
        isOpen={dataSheet !== null}
        onClose={() => setDataSheet(null)}
        title={
          dataSheet === 'download'
            ? 'Download my data'
            : 'Request data deletion'
        }
      >
        <form onSubmit={handleDataRequest} className="space-y-4">
          <p className="font-sans text-secondary text-ink-700">
            {dataSheet === 'download'
              ? 'We will compile your cryptographic contribution receipts, decision records, and payout transactions into a verifiable JSON archive.'
              : 'Submit a request to remove your off-chain pseudonym and session data according to our privacy policy. Public on-chain transactions cannot be deleted.'}
          </p>

          <TextInput
            id="data-email"
            label="Confirmation email address"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          {dataRequestSent ? (
            <div className="p-3 bg-spruce-100 text-spruce-700 font-sans text-secondary font-medium">
              Request received. A confirmation link has been sent to your email.
            </div>
          ) : (
            <div className="flex gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                type="button"
                onClick={() => setDataSheet(null)}
              >
                Cancel
              </Button>
              <Button
                variant={dataSheet === 'delete' ? 'destructive' : 'primary'}
                size="md"
                fullWidth
                disabled={!contactEmail.includes('@')}
              >
                {dataSheet === 'delete' ? 'Submit deletion request' : 'Send download archive'}
              </Button>
            </div>
          )}
        </form>
      </Sheet>
    </div>
  );
}
