// apps/web/src/components/SettingsView.tsx
'use client';

import React from 'react';
import type { UserSession } from '../lib/types';
import { PageHeader, Button, TextInput, Sheet, Icon } from './ui';
import { useLocale, setGlobalLocale, type Locale } from '../lib/i18n';

interface SettingsViewProps {
  user: UserSession;
  isCycleStarted?: boolean;
  onUpdateNickname?: (newNickname: string) => Promise<void>;
  onSignOut: () => void;
}

const settingsCopy = {
  en: {
    title: 'Settings',
    subtitle: 'Preferences, identity, and personal data controls.',
    identityTitle: 'Identity',
    identityDesc: 'Your pseudonym visible to other members of your circle.',
    nicknameLabel: 'Nickname',
    walletLabel: 'Wallet address:',
    saveNickname: 'Save nickname',
    nicknameSaved: 'Nickname saved.',
    languageTitle: 'Language',
    languageDesc: 'Choose your interface language.',
    dataTitle: 'Your data',
    dataDesc: 'Request an archive of your transaction history or account deletion.',
    downloadData: 'Download my data',
    deleteData: 'Delete my data',
    legalTitle: 'Legal and safety',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    security: 'Security Architecture',
    signOut: 'Sign out',
    downloadSheetTitle: 'Download my data',
    deleteSheetTitle: 'Request data deletion',
    downloadSheetDesc:
      'We will compile your cryptographic contribution receipts, decision records, and payout transactions into a verifiable JSON archive.',
    deleteSheetDesc:
      'Submit a request to remove your off-chain pseudonym and session data according to our privacy policy. Public on-chain transactions cannot be deleted.',
    confirmEmailLabel: 'Confirmation email address',
    reqReceived: 'Request received. A confirmation link has been sent to your email.',
    cancel: 'Cancel',
    submitDeletion: 'Submit deletion request',
    sendArchive: 'Send download archive',
  },
  am: {
    title: 'ቅንብሮች',
    subtitle: 'ምርጫዎች፣ ማንነት እና የግል መረጃ ቁጥጥሮች።',
    identityTitle: 'ማንነት',
    identityDesc: 'ለሌሎች የዕቁብዎ አባላት የሚታየው ቅጽል ስምዎ።',
    nicknameLabel: 'ቅጽል ስም',
    walletLabel: 'የኪስ ቦርሳ አድራሻ:',
    saveNickname: 'ቅጽል ስም አስቀምጥ',
    nicknameSaved: 'ቅጽል ስም ተቀምጧል።',
    languageTitle: 'ቋንቋ',
    languageDesc: 'የመተግበሪያውን ቋንቋ ይምረጡ።',
    dataTitle: 'የእርስዎ መረጃ',
    dataDesc: 'የግብይት ታሪክዎን ፋይል ወይም የሂሳብ ስረዛ ይጠይቁ።',
    downloadData: 'መረጃዬን አውርድ',
    deleteData: 'መረጃዬን ሰርዝ',
    legalTitle: 'ህጋዊና ደህንነት',
    terms: 'የአጠቃቀም ደንቦች',
    privacy: 'የግላዊነት ፖሊሲ',
    security: 'የደህንነት መዋቅር',
    signOut: 'ውጣ',
    downloadSheetTitle: 'መረጃዬን አውርድ',
    deleteSheetTitle: 'የመረጃ ስረዛ ጥያቄ',
    downloadSheetDesc:
      'የክፍያ ደረሰኞችዎን፣ የውሳኔ መዝገቦችዎን እና የገንዘብ ዝውውሮችዎን በማይበረዝ የJSON ማህደር አዘጋጅተን እንልክልዎታለን።',
    deleteSheetDesc:
      'ከኦን-ቼይን ውጭ ያሉ ቅጽል ስሞችንና ክፍለ-ጊዜዎችን ለማስወገድ ጥያቄ ያቅርቡ። ይፋዊ የኦን-ቼይን ዝውውሮች ሊሰረዙ አይችሉም።',
    confirmEmailLabel: 'የማረጋገጫ ኢሜይል አድራሻ',
    reqReceived: 'ጥያቄዎ ደርሷል። የማረጋገጫ ማስፈንጠሪያ ወደ ኢሜይልዎ ተልኳል።',
    cancel: 'ሰርዝ',
    submitDeletion: 'የስረዛ ጥያቄ አስገባ',
    sendArchive: 'የማውረጃ ፋይሉን ላክ',
  },
  om: {
    title: 'Qindaa\'inoota',
    subtitle: 'Filannoowwan, eenyummaa fi to\'annoo odeeffannoo dhuunfaa.',
    identityTitle: 'Eenyummaa',
    identityDesc: 'Maqaa fakkeessaa miseensota iqubii keessaniif mul\'atu.',
    nicknameLabel: 'Maqaa fakkeessaa',
    walletLabel: 'Teessoo boorsaa:',
    saveNickname: 'Maqaa fakkeessaa olkaayi',
    nicknameSaved: 'Maqaan fakkeessaa olkaawameera.',
    languageTitle: 'Afaan',
    languageDesc: 'Afaan tajaajilaa filadhaa.',
    dataTitle: 'Odeeffannoo keessan',
    dataDesc: 'Galmee seenaa kaffaltii keessanii buufachuuf yookiin herreega haquuf gaafadhaa.',
    downloadData: 'Odeeffannoo koo buufadhu',
    deleteData: 'Odeeffannoo koo haqi',
    legalTitle: 'Seeraa fi nageenya',
    terms: 'Qajeelfama fayyadamaa',
    privacy: 'Imaammata dhuunfaa',
    security: 'Ijaarsa nageenyaa',
    signOut: 'Ba\'aa',
    downloadSheetTitle: 'Odeeffannoo koo buufadhu',
    deleteSheetTitle: 'Odeeffannoo akka haqamu gaafadhu',
    downloadSheetDesc:
      'Nagaheewwan gumaataa, galmee murtee fi kaffaltiiwwan kuusaa JSON mirkanaa\'e keessatti qindeessinee isiniif ergina.',
    deleteSheetDesc:
      'Maqaa fi odeeffannoo toora irraa alaa haquuf gaaffii dhiyeessaa. Kaffaltiiwwan toora irraa haqamuu hin danda\'an.',
    confirmEmailLabel: 'Teessoo imeelii mirkaneessaa',
    reqReceived: 'Gaaffiin keessan qaqqabeera. Hidhannoon mirkaneessaa imeelii keessaniin ergameera.',
    cancel: 'Haqi',
    submitDeletion: 'Gaaffii haquu dhiyeessi',
    sendArchive: 'Kuusaa buufannaa ergi',
  },
};

export function SettingsView({
  user,
  isCycleStarted = false,
  onUpdateNickname,
  onSignOut,
}: SettingsViewProps) {
  const locale = useLocale();
  const c = settingsCopy[locale] || settingsCopy.en;
  const [nickname, setNickname] = React.useState(user.alias);
  const [savingNickname, setSavingNickname] = React.useState(false);
  const [nicknameSuccess, setNicknameSuccess] = React.useState(false);

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
        title={c.title}
        statusSentence={c.subtitle}
      />

      {/* Identity & Nickname */}
      <div className="bg-paper-1 border border-line p-5">
        <h3 className="font-sans text-lead font-semibold text-ink-900 mb-1">
          {c.identityTitle}
        </h3>
        <p className="font-sans text-secondary text-ink-500 mb-4">
          {c.identityDesc}
        </p>

        <form onSubmit={handleSaveNickname} className="space-y-4 max-w-md">
          <TextInput
            id="nickname-input"
            label={c.nicknameLabel}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={isCycleStarted}
            helperText={
              isCycleStarted
                ? (locale === 'am' ? 'ዕቁቡ ስለጀመረ ቅጽል ስም መቀየር አይቻልም።' : locale === 'om' ? 'Marsaan iqubii waan jalqabeef maqaa jijjiiruun hin danda\'amu.' : 'Nickname is locked because the circle cycle has started.')
                : (locale === 'am' ? 'ዕቁቡ ከመጀመሩ በፊት ቅጽል ስምዎን መቀየር ይችላሉ።' : locale === 'om' ? 'Iqubiin eegaluun dura maqaa jijjiiruu dandeessu.' : 'You can change your nickname before the circle starts.')
            }
          />

          <div className="font-mono text-meta text-ink-500">
            {c.walletLabel} {user.walletAddress}
          </div>

          {!isCycleStarted && (
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="sm"
                loading={savingNickname}
                disabled={nickname === user.alias || !nickname.trim()}
              >
                {c.saveNickname}
              </Button>
              {nicknameSuccess && (
                <span className="font-sans text-meta text-spruce-700 font-medium">
                  {c.nicknameSaved}
                </span>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Language */}
      <div className="bg-paper-1 border border-line p-5">
        <h3 className="font-sans text-lead font-semibold text-ink-900 mb-1">
          {c.languageTitle}
        </h3>
        <p className="font-sans text-secondary text-ink-500 mb-4">
          {c.languageDesc}
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
              onClick={() => {
                setGlobalLocale(lang.id);
              }}
              className={`p-3 text-left border transition-colors ${
                locale === lang.id
                  ? 'border-ink-900 bg-ink-900 text-paper-0 font-semibold'
                  : 'border-line bg-paper-0 text-ink-900 hover:bg-paper-2'
              }`}
            >
              <div className="font-sans text-secondary font-medium">
                {lang.label}
              </div>
              <div
                className={`font-mono text-meta ${
                  locale === lang.id
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
          {c.dataTitle}
        </h3>
        <p className="font-sans text-secondary text-ink-500 mb-4">
          {c.dataDesc}
        </p>

        <div className="flex gap-3 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDataSheet('download')}
          >
            {c.downloadData}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDataSheet('delete')}
          >
            {c.deleteData}
          </Button>
        </div>
      </div>

      {/* Legal & Safety */}
      <div className="bg-paper-1 border border-line p-5">
        <h3 className="font-sans text-lead font-semibold text-ink-900 mb-2">
          {c.legalTitle}
        </h3>
        <div className="flex gap-4 text-secondary text-ink-700 underline flex-wrap">
          <a href="/terms" className="hover:text-ink-900">
            {c.terms}
          </a>
          <span>·</span>
          <a href="/privacy" className="hover:text-ink-900">
            {c.privacy}
          </a>
          <span>·</span>
          <a href="/security" className="hover:text-ink-900">
            {c.security}
          </a>
        </div>
      </div>

      {/* Sign out */}
      <div className="pt-2">
        <Button variant="secondary" size="md" onClick={onSignOut}>
          {c.signOut}
        </Button>
      </div>

      {/* Data Request Sheet */}
      <Sheet
        isOpen={dataSheet !== null}
        onClose={() => setDataSheet(null)}
        title={
          dataSheet === 'download'
            ? c.downloadSheetTitle
            : c.deleteSheetTitle
        }
      >
        <form onSubmit={handleDataRequest} className="space-y-4">
          <p className="font-sans text-secondary text-ink-700">
            {dataSheet === 'download'
              ? c.downloadSheetDesc
              : c.deleteSheetDesc}
          </p>

          <TextInput
            id="data-email"
            label={c.confirmEmailLabel}
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          {dataRequestSent ? (
            <div className="p-3 bg-spruce-100 text-spruce-700 font-sans text-secondary font-medium">
              {c.reqReceived}
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
                {c.cancel}
              </Button>
              <Button
                variant={dataSheet === 'delete' ? 'destructive' : 'primary'}
                size="md"
                fullWidth
                disabled={!contactEmail.includes('@')}
              >
                {dataSheet === 'delete' ? c.submitDeletion : c.sendArchive}
              </Button>
            </div>
          )}
        </form>
      </Sheet>
    </div>
  );
}
