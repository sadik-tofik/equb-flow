// apps/web/src/lib/app-translations.ts
import type { Locale } from './i18n';

/* ------------------------------------------------------------------
 * 1. ROUND DETAIL VIEW
 * ------------------------------------------------------------------ */
export interface RoundDetailCopy {
  mono: (r: number) => string;
  title: (r: number, total: number) => string;
  statusSentence: (alias: string) => string;
  deadlineGrace: (deadline: string, grace: string) => string;
  thePot: string;
  paidPot: (display: string) => string;
  whenComplete: string;
  contributions: string;
  time: string;
  openReceipt: string;
  payout: string;
  payoutTo: (alias: string) => string;
  payoutReleased: string;
  openPayoutReceipt: string;
  notPaidYet: string;
  differencesInRound: (count: number) => string;
  chipPaid: string;
  chipWaiting: string;
  chipPartial: string;
  chipLate: string;
  chipProblem: string;
}

export const roundDetailTranslations: Record<Locale, RoundDetailCopy> = {
  en: {
    mono: (r) => `No. 00${r} · Round Detail`,
    title: (r, total) => `Round ${r} of ${total}`,
    statusSentence: (alias) => `${alias} receives this pot.`,
    deadlineGrace: (deadline, grace) => `Deadline ${deadline} · Grace until ${grace}`,
    thePot: 'The Pot',
    paidPot: (display) => `Paid ${display}`,
    whenComplete: 'USDC (when complete)',
    contributions: 'Contributions',
    time: 'Time',
    openReceipt: 'Open',
    payout: 'Payout',
    payoutTo: (alias) => `Payout to ${alias}`,
    payoutReleased: 'Released after all contributions matched.',
    openPayoutReceipt: 'Open payout receipt',
    notPaidYet: 'Not paid yet. It is released when every contribution is matched or covered.',
    differencesInRound: (count) => `Differences in this round (${count})`,
    chipPaid: 'Paid',
    chipWaiting: 'Waiting',
    chipPartial: 'Partial',
    chipLate: 'Late 40 min',
    chipProblem: 'Problem',
  },
  am: {
    mono: (r) => `ቁ. 00${r} · የዙር ዝርዝር`,
    title: (r, total) => `ዙር ${r} ከ ${total}`,
    statusSentence: (alias) => `ይህንን ዕጣ ${alias} ይቀበላሉ።`,
    deadlineGrace: (deadline, grace) => `የመጨረሻ ቀን ${deadline} · የእፎይታ ጊዜ እስከ ${grace}`,
    thePot: 'ዕጣው',
    paidPot: (display) => `የተከፈለው ${display}`,
    whenComplete: 'USDC (ሲጠናቀቅ)',
    contributions: 'ዕጣ ክፍያዎች',
    time: 'ሰዓት',
    openReceipt: 'ክፈት',
    payout: 'የዕጣ ክፍያ',
    payoutTo: (alias) => `ለ${alias} የተደረገ ክፍያ`,
    payoutReleased: 'ሁሉም የዕጣ ክፍያዎች ከተጣጣሙ በኋላ ተለቋል።',
    openPayoutReceipt: 'የክፍያ ደረሰኝ ክፈት',
    notPaidYet: 'እስካሁን አልተከፈለም። ሁሉም ክፍያዎች ሲጣጣሙ ወይም ሲሸፈኑ ይለቀቃል።',
    differencesInRound: (count) => `በዚህ ዙር ያሉ ልዩነቶች (${count})`,
    chipPaid: 'ተከፍሏል',
    chipWaiting: 'በመጠበቅ ላይ',
    chipPartial: 'ከፊል',
    chipLate: '40 ደቂቃ ዘግይቷል',
    chipProblem: 'ችግር',
  },
  om: {
    mono: (r) => `Lak. 00${r} · Bal'ina Marsaa`,
    title: (r, total) => `Marsaa ${r} keessaa ${total}`,
    statusSentence: (alias) => `Qodaa kana ${alias} fudhatu.`,
    deadlineGrace: (deadline, grace) => `Yeroo dhumaa ${deadline} · Yeroo dabalataa hanga ${grace}`,
    thePot: 'Qodaa',
    paidPot: (display) => `Kaffalame ${display}`,
    whenComplete: 'USDC (yommuu xumuramu)',
    contributions: 'Gumaatawwan',
    time: 'Yeroo',
    openReceipt: 'Bani',
    payout: 'Kaffaltii Qodaa',
    payoutTo: (alias) => `Kaffaltii gara ${alias}`,
    payoutReleased: 'Gumaatni hundi erga walsimee booda gadhifame.',
    openPayoutReceipt: 'Nagahee kaffaltii bani',
    notPaidYet: 'Hanga ammaatti hin kaffalamne. Gumaatni hundi yoo walsime yookiin uwwifame gadhifama.',
    differencesInRound: (count) => `Garaagarummaa marsaa kanaa (${count})`,
    chipPaid: 'Kaffalameera',
    chipWaiting: 'Eegaa jira',
    chipPartial: 'Gartokkee',
    chipLate: 'Daqiiqaa 40 tureera',
    chipProblem: 'Rakkina',
  },
};

/* ------------------------------------------------------------------
 * 2. APPROVAL INBOX VIEW
 * ------------------------------------------------------------------ */
export interface ApprovalInboxCopy {
  mono: string;
  title: string;
  statusSentence: string;
  emptySentence: string;
  approvalsSoFar: (soFar: number, req: number) => string;
  agentSuggests: string;
  open: string;
  whatHappened: string;
  suggestedByAssistant: string;
  evidence: string;
  ruleRef: string;
  ifYouApprove: string;
  optionalNote: string;
  notePlaceholder: string;
  approve: string;
  sendBack: string;
  reject: string;
  decidedStamp: string;
  decidedOnChain: string;
  beneficiaryLock: string;
  confirmTitle: (decision: string) => string;
  confirmPrompt: (decision: string, title: string) => string;
  confirmEffect: string;
  back: string;
  confirmDecision: string;
  voteRecorded: (decision: string) => string;
  needsDecision: string;
}

export const approvalInboxTranslations: Record<Locale, ApprovalInboxCopy> = {
  en: {
    mono: 'INBOX',
    title: 'Approvals',
    statusSentence: 'Decisions that need human review, with reasoning and evidence.',
    emptySentence: 'Nothing needs your decision right now.',
    approvalsSoFar: (soFar, req) => `${soFar} of ${req} approvals so far`,
    agentSuggests: 'The agent suggests: accept it.',
    open: 'Open',
    whatHappened: 'What Happened',
    suggestedByAssistant: "Suggested by the group's assistant",
    evidence: 'Evidence',
    ruleRef: 'Rule 2: late payments',
    ifYouApprove: 'If You Approve',
    optionalNote: 'Optional note',
    notePlaceholder: 'Reason for your decision',
    approve: 'Approve',
    sendBack: 'Send back',
    reject: 'Reject',
    decidedStamp: 'DECIDED',
    decidedOnChain: 'Decision recorded on chain.',
    beneficiaryLock: 'You cannot decide this one because it involves you.',
    confirmTitle: (decision) => `Confirm ${decision}`,
    confirmPrompt: (decision, title) => `You are about to submit your vote: ${decision.toUpperCase()} for "${title}".`,
    confirmEffect: 'Effect:',
    back: 'Back',
    confirmDecision: 'Confirm decision',
    voteRecorded: (decision) => `Vote recorded: ${decision}`,
    needsDecision: 'Needs your decision',
  },
  am: {
    mono: 'የውሳኔ ሳጥን',
    title: 'ይሁንታዎች',
    statusSentence: 'የሰው ውሳኔ የሚሹ ጉዳዮች ከበቂ ማብራሪያና ማስረጃ ጋር።',
    emptySentence: 'አሁን ምንም የእርስዎን ውሳኔ የሚጠይቅ ነገር የለም።',
    approvalsSoFar: (soFar, req) => `እስካሁን ${soFar} ከ ${req} ይሁንታዎች ተሰጥተዋል`,
    agentSuggests: 'ረዳቱ ሃሳብ አቅርቧል: ተቀበሉት።',
    open: 'ክፈት',
    whatHappened: 'ምን ተፈጠረ',
    suggestedByAssistant: 'በቡድኑ ረዳት የቀረበ ሃሳብ',
    evidence: 'ማስረጃ',
    ruleRef: 'ደንብ 2: የዘገዩ ክፍያዎች',
    ifYouApprove: 'ካጸደቁት የሚሆነው',
    optionalNote: 'አማራጭ ማስታወሻ',
    notePlaceholder: 'የውሳኔዎ ምክንያት',
    approve: 'አጽድቅ',
    sendBack: 'መልስ',
    reject: 'ውድቅ አድርግ',
    decidedStamp: 'ተወስኗል',
    decidedOnChain: 'ውሳኔው በብሎክቼይን ላይ ተመዝግቧል።',
    beneficiaryLock: 'ይህ ውሳኔ እርስዎን የሚመለከት በመሆኑ መወሰን አይችሉም።',
    confirmTitle: (decision) => `ውሳኔውን አረጋግጥ (${decision})`,
    confirmPrompt: (decision, title) => `የእርስዎን ድምጽ ሊያስገቡ ነው: ${decision.toUpperCase()} ለ "${title}"።`,
    confirmEffect: 'ውጤት:',
    back: 'ተመለስ',
    confirmDecision: 'ውሳኔውን አረጋግጥ',
    voteRecorded: (decision) => `ድምጽዎ ተመዝግቧል: ${decision}`,
    needsDecision: 'የእርስዎን ውሳኔ ይሻል',
  },
  om: {
    mono: 'SANDUUQA MURTII',
    title: 'Mirkaneessitoota',
    statusSentence: 'Murtiiwwan gamaaggama namaa barbaadan, sababa fi ragaa waliin.',
    emptySentence: 'Yeroo ammaa wanti murtii keessan barbaadu hin jiru.',
    approvalsSoFar: (soFar, req) => `Hanga ammaatti mirkaneessa ${soFar} keessaa ${req}`,
    agentSuggests: 'Gargaaraan yaada dhiyeesseera: fudhadhaa.',
    open: 'Bani',
    whatHappened: 'Maaltu Ta\'e',
    suggestedByAssistant: 'Gargaaraa iqubiitiin kan yaadame',
    evidence: 'Ragaa',
    ruleRef: 'Heera 2: Kaffaltiiwwan turan',
    ifYouApprove: 'Yoo Mirkaneessitan',
    optionalNote: 'Yaada dabalataa',
    notePlaceholder: 'Sababa murtii keessanii',
    approve: 'Mirkaneessi',
    sendBack: 'Deebisi',
    reject: 'Kufaa godhi',
    decidedStamp: 'MURTEEFAMEERA',
    decidedOnChain: 'Murtiin toora irratti galmaa\'eera.',
    beneficiaryLock: 'Murtiin kun si waan ilaallatuuf murtii kennuu hin dandeessu.',
    confirmTitle: (decision) => `Mirkaneessa Mirkaneessi (${decision})`,
    confirmPrompt: (decision, title) => `Sagalee keessan galchuuf jirtu: ${decision.toUpperCase()} mata duree "${title}" tiif.`,
    confirmEffect: 'Bu\'aa:',
    back: 'Duubatti',
    confirmDecision: 'Murtii mirkaneessi',
    voteRecorded: (decision) => `Sagaleen galmaa'eera: ${decision}`,
    needsDecision: 'Murtii keessan barbaada',
  },
};

/* ------------------------------------------------------------------
 * 3. DISCREPANCY LEDGER VIEW
 * ------------------------------------------------------------------ */
export interface DiscrepancyLedgerCopy {
  title: string;
  loadingStatus: string;
  noDifferences: string;
  needAttention: (count: number) => string;
  smallNote: string;
  whatHappensNow: string;
  assistantSuggestsResolution: string;
  seeDecision: string;
  expected: string;
  received: string;
  resolved: string;
  short: string;
  over: string;
  wrongCurrency: string;
  unknownSender: string;
  duplicate: string;
  attention: string;
  shortBy: (amt: string) => string;
  overBy: (amt: string) => string;
  diffOf: (amt: string) => string;
  resolvedSection: string;
  resolvedStamp: string;
}

export const discrepancyLedgerTranslations: Record<Locale, DiscrepancyLedgerCopy> = {
  en: {
    title: 'Differences',
    loadingStatus: 'Checking the ledger for differences...',
    noDifferences: 'No differences. Every payment matched.',
    needAttention: (count) => `${count} payment${count === 1 ? '' : 's'} need attention.`,
    smallNote: 'Small note: We show every difference exactly, to the last unit.',
    whatHappensNow: 'What happens now:',
    assistantSuggestsResolution: "The group's assistant suggests a resolution.",
    seeDecision: 'See the decision',
    expected: 'Expected',
    received: 'Received',
    resolved: 'Resolved',
    short: 'Short',
    over: 'Over',
    wrongCurrency: 'Wrong currency',
    unknownSender: 'Unknown sender',
    duplicate: 'Duplicate',
    attention: 'Attention',
    shortBy: (amt) => `Short by ${amt} USDC`,
    overBy: (amt) => `Over by ${amt} USDC`,
    diffOf: (amt) => `Difference of ${amt} USDC`,
    resolvedSection: 'Resolved',
    resolvedStamp: 'RESOLVED',
  },
  am: {
    title: 'ልዩነቶች',
    loadingStatus: 'በመዝገቡ ውስጥ ልዩነቶችን በማጣራት ላይ...',
    noDifferences: 'ምንም ልዩነት የለም። እያንዳንዱ ክፍያ ተጣጥሟል።',
    needAttention: (count) => `${count} ክፍያ${count === 1 ? '' : 'ዎች'} ትኩረት ይሻሉ/ይሻል።`,
    smallNote: 'ማስታወሻ: እያንዳንዱን ልዩነት ያለማጠጋጋት እስከ መጨረሻው ክፍልፋይ በትክክል እናሳያለን።',
    whatHappensNow: 'ቀጥሎ የሚሆነው:',
    assistantSuggestsResolution: 'የቡድኑ ረዳት የመፍትሄ ሃሳብ ያቀርባል።',
    seeDecision: 'ውሳኔውን ይመልከቱ',
    expected: 'የሚጠበቀው',
    received: 'የደረሰው',
    resolved: 'የተፈታ',
    short: 'ጎድሏል',
    over: 'በልጧል',
    wrongCurrency: 'የተሳሳተ ገንዘብ',
    unknownSender: 'ያልታወቀ ላኪ',
    duplicate: 'የተደገመ',
    attention: 'ትኩረት ይሻል',
    shortBy: (amt) => `በ ${amt} USDC ጎድሏል`,
    overBy: (amt) => `በ ${amt} USDC በልጧል`,
    diffOf: (amt) => `የ ${amt} USDC ልዩነት`,
    resolvedSection: 'የተፈቱ ልዩነቶች',
    resolvedStamp: 'ተፈቷል',
  },
  om: {
    title: 'Garaagarummaa',
    loadingStatus: 'Galmee keessatti garaagarummaan qoratamaa jira...',
    noDifferences: 'Garaagarummaan tokkollee hin jiru. Kaffaltiin hundi walsimeera.',
    needAttention: (count) => `Kaffaltiin ${count} xiyyeeffannoo barbaada.`,
    smallNote: 'Hubachiisa: Garaagarummaa hunda tokkoon tokkoon herregaan ifa goona.',
    whatHappensNow: 'Amma maaltu ta\'a:',
    assistantSuggestsResolution: 'Gargaaraan iqubii yaada furmaataa dhiyeessa.',
    seeDecision: 'Murtii ilaalaa',
    expected: 'Kan eegamu',
    received: 'Kan qaqqabe',
    resolved: 'Kan furame',
    short: 'Hir\'ateera',
    over: 'Caaleera',
    wrongCurrency: 'Gosa qarshii dogoggoraa',
    unknownSender: 'Nama hin beekamne',
    duplicate: 'Lama dhufe',
    attention: 'Xiyyeeffannoo',
    shortBy: (amt) => `${amt} USDC hir'ateera`,
    overBy: (amt) => `${amt} USDC caaleera`,
    diffOf: (amt) => `Garaagarummaa ${amt} USDC`,
    resolvedSection: 'Kanneen Furaman',
    resolvedStamp: 'FURAMEERA',
  },
};

/* ------------------------------------------------------------------
 * 4. DECISION LOG VIEW
 * ------------------------------------------------------------------ */
export interface DecisionLogCopy {
  title: string;
  loadingStatus: string;
  statusSentence: (count: number) => string;
  checkRecordBtn: string;
  filterAll: string;
  filterPayments: string;
  filterDecisions: string;
  filterPayouts: string;
  tapeTitle: string;
  noEntries: string;
  showOlder: (count: number) => string;
  sheetTitle: string;
  checkingMessage: string;
  resultTitle: string;
  verifiedStamp: string;
  brokenStamp: string;
  intactMessage: (count: number) => string;
  brokenMessage: (seq: number) => string;
  fingerprintLabel: string;
  copyFingerprint: string;
  copied: string;
  firstEntryLabel: string;
  lastEntryLabel: string;
}

export const decisionLogTranslations: Record<Locale, DecisionLogCopy> = {
  en: {
    title: 'Record',
    loadingStatus: 'Loading append-only record...',
    statusSentence: (count) => `Append-only audit tape with ${count} cryptographic entries.`,
    checkRecordBtn: 'Check the record',
    filterAll: 'All',
    filterPayments: 'Payments',
    filterDecisions: 'Decisions',
    filterPayouts: 'Payouts',
    tapeTitle: 'TAPE',
    noEntries: 'No entries found matching this filter.',
    showOlder: (count) => `Show older (${count} more)`,
    sheetTitle: 'Check the record',
    checkingMessage: 'Checking hash chain and cryptographic signatures...',
    resultTitle: 'RESULT',
    verifiedStamp: 'VERIFIED',
    brokenStamp: 'BROKEN',
    intactMessage: (count) => `The record is intact. ${count} entries verified via WebCrypto SHA-256.`,
    brokenMessage: (seq) => `The record changed at entry #${seq}. Do not rely on anything after it.`,
    fingerprintLabel: 'Latest Chain Fingerprint (SHA-256):',
    copyFingerprint: 'Copy fingerprint',
    copied: 'Copied',
    firstEntryLabel: 'First entry:',
    lastEntryLabel: 'Last checked entry:',
  },
  am: {
    title: 'መዝገብ',
    loadingStatus: 'የማይበረዘውን መዝገብ በመጫን ላይ...',
    statusSentence: (count) => `በክሪፕቶግራፊክ ቴክኖሎጂ የተረጋገጡ ${count} ምዝገባዎች ያሉት ቋሚ መዝገብ።`,
    checkRecordBtn: 'መዝገቡን አረጋግጥ',
    filterAll: 'ሁሉም',
    filterPayments: 'ክፍያዎች',
    filterDecisions: 'ውሳኔዎች',
    filterPayouts: 'የዕጣ ክፍያዎች',
    tapeTitle: 'የምዝገባ ሰንሰለት',
    noEntries: 'ከዚህ ማጣሪያ ጋር የሚዛመድ መረጃ አልተገኘም።',
    showOlder: (count) => `የቀደሙትን አሳይ (${count} ተጨማሪ)`,
    sheetTitle: 'መዝገቡን ማረጋገጫ',
    checkingMessage: 'የሃሽ ሰንሰለቱንና የዲጂታል ፊርማዎችን በማጣራት ላይ...',
    resultTitle: 'ውጤት',
    verifiedStamp: 'የተረጋገጠ',
    brokenStamp: 'ተበርዟል',
    intactMessage: (count) => `መዝገቡ ያልተበረዘ ትክክለኛ ነው። ${count} ምዝገባዎች በWebCrypto SHA-256 ተረጋግጠዋል።`,
    brokenMessage: (seq) => `መዝገቡ በምዝገባ #${seq} ላይ ተቀይሯል። ከእሱ በኋላ ባለው መረጃ አይተማመኑ።`,
    fingerprintLabel: 'የቅርብ ጊዜ የሰንሰለት ዲጂታል አሻራ (SHA-256):',
    copyFingerprint: 'አሻራውን ቅዳ',
    copied: 'ተቀድቷል',
    firstEntryLabel: 'የመጀመሪያው ምዝገባ:',
    lastEntryLabel: 'የመጨረሻው የተረጋገጠ ምዝገባ:',
  },
  om: {
    title: 'Galmee',
    loadingStatus: 'Galmee hin jijjiiramne fe\'aa jira...',
    statusSentence: (count) => `Galmee mirkanaa'aa kiriiptoo galmeewwan ${count} qabu.`,
    checkRecordBtn: 'Galmee mirkaneessi',
    filterAll: 'Hunda',
    filterPayments: 'Kaffaltiiwwan',
    filterDecisions: 'Murtiiwwan',
    filterPayouts: 'Qodaa',
    tapeTitle: 'TARREE GALMEE',
    noEntries: 'Galmeen calaltuu kana wajjin walsimu hin argamne.',
    showOlder: (count) => `Kanneen duraa agarsiisi (${count} dabalataa)`,
    sheetTitle: 'Galmee mirkaneessi',
    checkingMessage: 'Sanjata haashii fi mallattoo kiriiptoo qorachaa jira...',
    resultTitle: 'BU\'AA',
    verifiedStamp: 'MIRKANAA\'EERA',
    brokenStamp: 'JALQABA IRRAA CITEE JIRA',
    intactMessage: (count) => `Galmeen kun kan hin tuqamneefi eegameedha. Galmeewwan ${count} WebCrypto SHA-256 tiin mirkanaa'aniiru.`,
    brokenMessage: (seq) => `Galmeen lakkoofsa #${seq} irratti jijjiirameera. Wanta sana booda jiru hin amaminaa.`,
    fingerprintLabel: 'Mallattoo Dhaabbataa Haashii (SHA-256):',
    copyFingerprint: 'Mallattoo garagalchi',
    copied: 'Garagalfameera',
    firstEntryLabel: 'Galmee jalqabaa:',
    lastEntryLabel: 'Galmee dhumaa qoratame:',
  },
};

/* ------------------------------------------------------------------
 * 5. ORGANIZER CONSOLE VIEW
 * ------------------------------------------------------------------ */
export interface OrganizerConsoleCopy {
  mono: (id: string) => string;
  pausedStatus: string;
  runningStatus: (cycle: number) => string;
  prepStatus: string;
  newCircle: string;
  pauseCircle: string;
  resumeCircle: string;
  startCycle: string;
  membersTitle: (ready: number, total: number) => string;
  inviteLink: string;
  copyLink: string;
  copied: string;
  shareLink: string;
  emptySlot: string;
  waitingForJoin: string;
  depositReady: string;
  waitingDeposit: string;
  rulesFreezeTitle: string;
  rulesFreezeDesc: string;
  consentCheckbox: string;
  confirmStartBtn: string;
  cancelBtn: string;
  pauseSheetTitle: string;
  pauseSheetDesc: string;
  confirmPauseBtn: string;
}

export const organizerConsoleTranslations: Record<Locale, OrganizerConsoleCopy> = {
  en: {
    mono: (id) => `No. ${id.slice(0, 4)} · Organizer console`,
    pausedStatus: 'The circle is paused. No payments will move until you resume.',
    runningStatus: (cycle) => `Cycle ${cycle} is active and running.`,
    prepStatus: 'Pre-cycle preparation. Invite members and verify readiness to start.',
    newCircle: 'New circle',
    pauseCircle: 'Pause circle',
    resumeCircle: 'Resume circle',
    startCycle: 'Start cycle',
    membersTitle: (ready, total) => `Circle Members (${ready}/${total} ready)`,
    inviteLink: 'Invite link',
    copyLink: 'Copy',
    copied: 'Copied',
    shareLink: 'Share',
    emptySlot: 'Empty slot',
    waitingForJoin: 'Waiting for member to join',
    depositReady: 'Ready',
    waitingDeposit: 'Awaiting deposit',
    rulesFreezeTitle: 'Freeze Circle Rules & Start',
    rulesFreezeDesc: 'Starting the circle locks all member slots, contribution amounts, schedule, and exception rules cryptographically into the decision tape.',
    consentCheckbox: 'I verify that all members have joined, approved the rules, and deposited their security stakes.',
    confirmStartBtn: 'Confirm and start circle',
    cancelBtn: 'Cancel',
    pauseSheetTitle: 'Pause circle safety lock',
    pauseSheetDesc: 'Pausing engages the deterministic safety lock. All ongoing and future payouts, contributions, and proposals are frozen until you resume.',
    confirmPauseBtn: 'Engage safety pause',
  },
  am: {
    mono: (id) => `ቁ. ${id.slice(0, 4)} · የአስተባባሪ መቆጣጠሪያ`,
    pausedStatus: 'ዕቁቡ ለጊዜው ቆሟል። እርስዎ እስኪቀጥሉት ድረስ ምንም ክፍያ አይንቀሳቀስም።',
    runningStatus: (cycle) => `ክፍለ-ጊዜ ${cycle} በስራ ላይ ይገኛል።`,
    prepStatus: 'ቅድመ-ዕቁብ ዝግጅት። አባላትን ይጋብዙና ለመጀመር ዝግጁነታቸውን ያረጋግጡ።',
    newCircle: 'አዲስ ዕቁብ',
    pauseCircle: 'ዕቁቡን አቁም',
    resumeCircle: 'ዕቁቡን ቀጥል',
    startCycle: 'ዕቁቡን ጀምር',
    membersTitle: (ready, total) => `የዕቁቡ አባላት (${ready}/${total} ዝግጁ ናቸው)`,
    inviteLink: 'የመጋበዣ ማስፈንጠሪያ',
    copyLink: 'ቅዳ',
    copied: 'ተቀድቷል',
    shareLink: 'አጋራ',
    emptySlot: 'ክፍት ቦታ',
    waitingForJoin: 'አባል እስኪቀላቀል በመጠባበቅ ላይ',
    depositReady: 'ዝግጁ',
    waitingDeposit: 'ተቀማጭ በመጠበቅ ላይ',
    rulesFreezeTitle: 'የዕቁቡን ደንቦች ቋሚ አድርግና ጀምር',
    rulesFreezeDesc: 'ዕቁቡን መጀመር ሁሉንም የአባላት ቦታዎች፣ የመዋጮ መጠኖች፣ የቀን መቁጠሪያ እና ደንቦችን በመዝገቡ ላይ በክሪፕቶግራፊ አሽጎ ያስቀምጣል።',
    consentCheckbox: 'ሁሉም አባላት መቀላቀላቸውን፣ ደንቦቹን ማጽደቃቸውንና ዋስትና ማስያዛቸውን አረጋግጣለሁ።',
    confirmStartBtn: 'አረጋግጥና ዕቁቡን ጀምር',
    cancelBtn: 'ሰርዝ',
    pauseSheetTitle: 'የደህንነት ማቆሚያውን አንቃ',
    pauseSheetDesc: 'ዕቁቡን ማቆም የደህንነት በሩን ይዘጋዋል። እርስዎ ዳግም እስኪጀምሩት ድረስ ሁሉም ክፍያዎች፣ ዕጣዎችና ውሳኔዎች ይታገዳሉ።',
    confirmPauseBtn: 'የደህንነት ማቆሚያውን አንቃ',
  },
  om: {
    mono: (id) => `Lak. ${id.slice(0, 4)} · To\'annoo Qindeessaa`,
    pausedStatus: 'Iqubiin yeroof dhaabbateera. Hanga deebistanitti kaffaltiin hin socho\'u.',
    runningStatus: (cycle) => `Marsaan ${cycle} hojii irra jira.`,
    prepStatus: 'Qophii dursaa. Miseensota affeeraa fi qophaa\'ummaa isaanii mirkaneessaa.',
    newCircle: 'Iqubii haaraa',
    pauseCircle: 'Iqubii dhaabi',
    resumeCircle: 'Iqubii itti fufi',
    startCycle: 'Iqubii jalqabi',
    membersTitle: (ready, total) => `Miseensota Iqubii (${ready}/${total} qophii)`,
    inviteLink: 'Hidhata affeerraa',
    copyLink: 'Garagalchi',
    copied: 'Garagalfameera',
    shareLink: 'Qoodi',
    emptySlot: 'Bakka duwwaa',
    waitingForJoin: 'Miseensi hanga seenutti eegamaa jira',
    depositReady: 'Qophii',
    waitingDeposit: 'Qarshii wabii eegaa jira',
    rulesFreezeTitle: 'Seera Iqubii Cufiitii Jalqabi',
    rulesFreezeDesc: 'Iqubii jalqabuun teessoo miseensotaa, hamma gumaataa, yeroo fi heera hunda galmee kiriiptoo irratti qadaada.',
    consentCheckbox: 'Miseensonni hundi akka seenan, seera akka mirkaneessanii fi qabeenya wabii akka qabsiisan nan mirkaneessa.',
    confirmStartBtn: 'Mirkaneessiitii iqubii jalqabi',
    cancelBtn: 'Haqi',
    pauseSheetTitle: 'Balbala Nageenyaa Cufi',
    pauseSheetDesc: 'Dhaabuun balbala nageenyaa cufa. Hanga isin banattanitti kaffaltii fi murtiiwwan hundi ni dhaabbatu.',
    confirmPauseBtn: 'Cufaa nageenyaa hojiirra oolchi',
  },
};

/* ------------------------------------------------------------------
 * 6. RECEIPTS VIEW
 * ------------------------------------------------------------------ */
export interface ReceiptsViewCopy {
  title: string;
  statusSentence: string;
  thisRound: (r: number) => string;
  allRounds: (c: number) => string;
  emptyThisRound: string;
  emptyAll: string;
  confirmedStamp: string;
  openExplorer: string;
  contribution: string;
  payout: string;
  roundPrefix: (r: number) => string;
}

export const receiptsViewTranslations: Record<Locale, ReceiptsViewCopy> = {
  en: {
    title: 'Receipts',
    statusSentence: 'Every contribution and payout receipt involving your account.',
    thisRound: (r) => `This round (Round ${r})`,
    allRounds: (c) => `All rounds (${c})`,
    emptyThisRound: 'No receipts recorded for this round yet.',
    emptyAll: 'No receipts recorded yet.',
    confirmedStamp: 'CONFIRMED',
    openExplorer: 'Open explorer',
    contribution: 'Contribution',
    payout: 'Payout',
    roundPrefix: (r) => `Round ${r}`,
  },
  am: {
    title: 'ደረሰኞች',
    statusSentence: 'ከእርስዎ ሂሳብ ጋር የተያያዙ ሁሉም የመዋጮ እና የዕጣ ክፍያ ደረሰኞች።',
    thisRound: (r) => `ይህ ዙር (ዙር ${r})`,
    allRounds: (c) => `ሁሉም ዙሮች (${c})`,
    emptyThisRound: 'ለዚህ ዙር እስካሁን የተመዘገበ ደረሰኝ የለም።',
    emptyAll: 'እስካሁን የተመዘገበ ደረሰኝ የለም።',
    confirmedStamp: 'ተረጋግጧል',
    openExplorer: 'በብሎክ ኤክስፕሎረር ክፈት',
    contribution: 'ዕጣ ክፍያ',
    payout: 'የዕጣ ክፍያ',
    roundPrefix: (r) => `ዙር ${r}`,
  },
  om: {
    title: 'Nagaheewwan',
    statusSentence: 'Nagaheewwan gumaataa fi kaffaltii herrega keessan ilaallatan hundi.',
    thisRound: (r) => `Marsaa kana (Marsaa ${r})`,
    allRounds: (c) => `Marsaalee hunda (${c})`,
    emptyThisRound: 'Marsaa kanaaf nagaheen galmaa\'e hin jiru.',
    emptyAll: 'Hanga ammaatti nagaheen galmaa\'e hin jiru.',
    confirmedStamp: 'MIRKANAA\'EERA',
    openExplorer: 'Toora eksploorerii irratti bani',
    contribution: 'Gumaata',
    payout: 'Kaffaltii Qodaa',
    roundPrefix: (r) => `Marsaa ${r}`,
  },
};

/* ------------------------------------------------------------------
 * 7. PAY FLOW MODAL
 * ------------------------------------------------------------------ */
export interface PayFlowCopy {
  modalTitleNormal: string;
  modalTitleSending: string;
  modalTitleConfirmed: string;
  pausedWarning: string;
  closeBtn: string;
  confirmedStamp: string;
  confirmedReceiptTitle: string;
  confirmedReceiptSub: (r: number) => string;
  paidStamp: string;
  receiptRef: string;
  openReceiptLink: string;
  backToCircleBtn: string;
  sendingDesc: string;
  sendingTapeMsg: string;
  closeKeepsWorking: string;
  timeoutWarning: string;
  checkStatusBtn: string;
  staleSessionMsg: string;
  reauthPrompt: (alias: string) => string;
  sendConfirmCodeBtn: string;
  confirmContinueBtn: string;
  amountLabel: string;
  fromLabel: string;
  fromValue: string;
  toLabel: string;
  toValue: string;
  roundLabel: string;
  roundValue: (r: number, total: number) => string;
  testMoneyBadge: string;
  whatHappensNextTitle: string;
  step1: string;
  step2: string;
  step3: string;
  freshCountdown: (time: string) => string;
  sendBtn: (display: string) => string;
}

export const payFlowTranslations: Record<Locale, PayFlowCopy> = {
  en: {
    modalTitleNormal: 'Send your contribution',
    modalTitleSending: 'Sending',
    modalTitleConfirmed: 'Contribution confirmed',
    pausedWarning: 'The organizer paused this circle. No payments will move until it resumes.',
    closeBtn: 'Close',
    confirmedStamp: 'CONFIRMED',
    confirmedReceiptTitle: 'Confirmed receipt',
    confirmedReceiptSub: (r) => `Confirmed. Your contribution for round ${r} is recorded.`,
    paidStamp: 'PAID',
    receiptRef: 'Receipt Reference',
    openReceiptLink: 'Open receipt',
    backToCircleBtn: 'Back to the circle',
    sendingDesc: 'Authorizing payment from your account to the safety lock.',
    sendingTapeMsg: 'Sent. We are waiting for the network to confirm it.',
    closeKeepsWorking: 'Close (it keeps working)',
    timeoutWarning: 'We could not confirm it yet. Do not pay again. The organizer can see it.',
    checkStatusBtn: 'Check status',
    staleSessionMsg: 'For your safety, please sign in again before sending money.',
    reauthPrompt: (alias) => `Send a quick confirmation code to ${alias} to authorize this contribution.`,
    sendConfirmCodeBtn: 'Send confirmation code',
    confirmContinueBtn: 'Confirm and continue',
    amountLabel: 'Amount',
    fromLabel: 'From',
    fromValue: 'Your account',
    toLabel: 'To',
    toValue: "The group's safety lock",
    roundLabel: 'Round',
    roundValue: (r, total) => `${r} of ${total}`,
    testMoneyBadge: 'Test money. No real value.',
    whatHappensNextTitle: 'What Happens Next',
    step1: 'We send the money from your account.',
    step2: 'The network confirms it, usually in seconds.',
    step3: "The group's record shows your receipt.",
    freshCountdown: (time) => `Your sign-in is fresh for ${time} more minutes.`,
    sendBtn: (display) => `Send ${display}`,
  },
  am: {
    modalTitleNormal: 'ዕጣ ክፍያዎን ይላኩ',
    modalTitleSending: 'በመላክ ላይ',
    modalTitleConfirmed: 'ዕጣ ክፍያው ተረጋግጧል',
    pausedWarning: 'አስተባባሪው ዕቁቡን ለጊዜው አቁሞታል። እስኪቀጥል ድረስ ምንም ክፍያ አይደረግም።',
    closeBtn: 'ዝጋ',
    confirmedStamp: 'ተረጋግጧል',
    confirmedReceiptTitle: 'የተረጋገጠ ደረሰኝ',
    confirmedReceiptSub: (r) => `ተረጋግጧል። የዙር ${r} ዕጣ ክፍያዎ ተመዝግቧል።`,
    paidStamp: 'ተከፍሏል',
    receiptRef: 'የደረሰኝ መለያ',
    openReceiptLink: 'ደረሰኝ ክፈት',
    backToCircleBtn: 'ወደ ዕቁቡ ተመለስ',
    sendingDesc: 'ከእርስዎ ሂሳብ ወደ ደህንነት መቆለፊያው ክፍያውን በማጽደቅ ላይ።',
    sendingTapeMsg: 'ተልኳል። አውታረ መረቡ እስኪያረጋግጠው እየጠበቅን ነው።',
    closeKeepsWorking: 'ዝጋ (ክፍያው በጀርባ መስራቱን ይቀጥላል)',
    timeoutWarning: 'ክፍያውን ማረጋገጥ አልቻልንም። ዳግም አይክፈሉ። አስተባባሪው ሊያየው ይችላል።',
    checkStatusBtn: 'ሁኔታውን ፈትሽ',
    staleSessionMsg: 'ለደህንነትዎ ሲባል ገንዘብ ከመላክዎ በፊት እባክዎ እንደገና ይግቡ።',
    reauthPrompt: (alias) => `ይህንን ክፍያ ለማጽደቅ ለ ${alias} አጭር የማረጋገጫ ኮድ ይላኩ።`,
    sendConfirmCodeBtn: 'የማረጋገጫ ኮድ ላክ',
    confirmContinueBtn: 'አረጋግጥና ቀጥል',
    amountLabel: 'መጠን',
    fromLabel: 'ከ',
    fromValue: 'የእርስዎ ሂሳብ',
    toLabel: 'ወደ',
    toValue: 'የቡድኑ የደህንነት መቆለፊያ',
    roundLabel: 'ዙር',
    roundValue: (r, total) => `${r} ከ ${total}`,
    testMoneyBadge: 'የሙከራ ገንዘብ። እውነተኛ ዋጋ የለውም።',
    whatHappensNextTitle: 'ቀጥሎ የሚሆነው',
    step1: 'ገንዘቡን ከእርስዎ ሂሳብ እንልካለን።',
    step2: 'አውታረ መረቡ በሰከንዶች ውስጥ ያረጋግጠዋል።',
    step3: 'የቡድኑ መዝገብ ደረሰኝዎን ያሳያል።',
    freshCountdown: (time) => `የመግቢያ ፈቃድዎ ለቀጣዮቹ ${time} ደቂቃዎች ያገለግላል።`,
    sendBtn: (display) => `${display} ላክ`,
  },
  om: {
    modalTitleNormal: 'Gumaata keessan ergaa',
    modalTitleSending: 'Ergaa jira',
    modalTitleConfirmed: 'Gumaatni mirkanaa\'eera',
    pausedWarning: 'Qindeessaan iqubii kana dhaabeera. Hanga deebi\'utti kaffaltiin hin raawwatamu.',
    closeBtn: 'Cufi',
    confirmedStamp: 'MIRKANAA\'EERA',
    confirmedReceiptTitle: 'Nagahee mirkanaa\'e',
    confirmedReceiptSub: (r) => `Mirkanaa'eera. Gumaatni keessan marsaa ${r} galmaa'eera.`,
    paidStamp: 'KAFFALAMEERA',
    receiptRef: 'Lakk. Eenyummaa Nagahee',
    openReceiptLink: 'Nagahee bani',
    backToCircleBtn: 'Gara iqubiitti deebi\'i',
    sendingDesc: 'Herrega keessan irraa gara balbala nageenyaatti kaffaltii heyyamaa jira.',
    sendingTapeMsg: 'Ergameera. Netwoorkiin hanga mirkaneessutti eegaa jirra.',
    closeKeepsWorking: 'Cufi (hojiin itti fufa)',
    timeoutWarning: 'Ammatti mirkaneessuu hin dandeenye. Irra deebitanii hin kaffalinaa. Qindeessaan ni arga.',
    checkStatusBtn: 'Haala isaa ilaali',
    staleSessionMsg: 'Nageenya keessaniif, qarshii erguu dura deebitanii seenaa.',
    reauthPrompt: (alias) => `Kaffaltii kana heyyamuuf koodii ariifachiisaa gara ${alias} tti ergaa.`,
    sendConfirmCodeBtn: 'Koodii mirkaneessaa ergi',
    confirmContinueBtn: 'Mirkaneessiitii itti fufi',
    amountLabel: 'Hamma',
    fromLabel: 'Irraa',
    fromValue: 'Herrega keessan',
    toLabel: 'Gara',
    toValue: 'Cufaa nageenyaa iqubii',
    roundLabel: 'Marsaa',
    roundValue: (r, total) => `${r} keessaa ${total}`,
    testMoneyBadge: 'Qarshii yaalii. Gatii dhugaa hin qabu.',
    whatHappensNextTitle: 'Itti Aanee Maaltu Ta\'a',
    step1: 'Qarshicha herrega keessan irraa ergina.',
    step2: 'Netwoorkiin seekondii muraasa keessatti mirkaneessa.',
    step3: 'Galmeen iqubii nagahee keessan agarsiisa.',
    freshCountdown: (time) => `Seensi keessan daqiiqaa ${time} f tajaajila.`,
    sendBtn: (display) => `${display} ergi`,
  },
};
