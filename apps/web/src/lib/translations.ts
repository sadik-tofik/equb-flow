// apps/web/src/lib/translations.ts
import type { Locale } from './i18n';

export interface SiteHeaderCopy {
  navLinks: { label: string; href: string }[];
  trySandbox: string;
  enterApp: string;
  navigationSheetTitle: string;
}

export interface SiteFooterCopy {
  tagline: string;
  status: string;
  colProduct: string;
  howItWorks: string;
  proof: string;
  safety: string;
  sandbox: string;
  evidence: string;
  colBuild: string;
  openSource: string;
  docs: string;
  systemStatus: string;
  changelog: string;
  colLegal: string;
  terms: string;
  privacy: string;
  security: string;
  accessibility: string;
  contact: string;
  disclaimer: string;
}

export interface LandingPageCopy {
  hero: {
    mono: string;
    title: string;
    workEm: string;
    subtitle: string;
    ctaSandbox: string;
    ctaEvidence: string;
    disclaimer: string;
  };
  s02: {
    mono: string;
    title: string;
    stageLabel: string;
    verifiedLabel: string;
    activeStateLabel: string;
    steps: {
      step: number;
      label: string;
      sentence: string;
      badge: string;
    }[];
  };
  s03: {
    mono: string;
    title: string;
    subtitle: string;
    verifierLabel: string;
    hashingText: string;
    intactSuffix: string;
    brokenPrefix: string;
    btnTamperActive: string;
    btnTamperInactive: string;
    alertTitle: string;
    alertDesc: string;
  };
  s04: {
    mono: string;
    title: string;
    colSituation: string;
    colMayChoose: string;
    colCodeForbids: string;
    exampleLabel: string;
    footerNote: string;
    situations: {
      title: string;
      mayChoose: string;
      codeForbids: string;
      example: string;
    }[];
  };
  s05: {
    mono: string;
    title: string;
    pipelineLabel: string;
    stepAssistant: string;
    stepAssistantSub: string;
    stepChecker: string;
    stepCheckerSub: string;
    stepAuthorizer: string;
    stepAuthorizerSub: string;
    stepExecutor: string;
    stepExecutorSub: string;
    stepPot: string;
    rule1: string;
    rule2: string;
    rule3: string;
    rule4: string;
    honestNoteLabel: string;
    honestNoteText: string;
  };
  s06: {
    mono: string;
    title: string;
    fact1: string;
    fact1Link: string;
    fact2: string;
    fact2Link: string;
    fact3: string;
    fact3Sub: string;
    fact4: string;
    fact4Link: string;
    readNotesLink: string;
  };
  s07: {
    mono: string;
    title: string;
    colMetric: string;
    colReal: string;
    colSimulated: string;
    notYet: string;
    metrics: {
      name: string;
      simulated: string;
    }[];
    lastGenerated: string;
    howWeCount: string;
    footerNote: string;
  };
  s08: {
    mono: string;
    title: string;
    colIs: string;
    colIsNot: string;
    rows: {
      is: string;
      isNot: string;
    }[];
  };
  s09: {
    mono: string;
    title: string;
    reusableTitle: string;
    parts: string[];
    runTestsText: string;
  };
  s10: {
    mono: string;
    title: string;
    btnSandbox: string;
    btnDocs: string;
    btnApp: string;
  };
}

export const siteHeaderTranslations: Record<Locale, SiteHeaderCopy> = {
  en: {
    navLinks: [
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Proof', href: '/proof' },
      { label: 'Safety', href: '/safety' },
      { label: 'Evidence', href: '/evidence' },
      { label: 'Open source', href: '/open-source' },
    ],
    trySandbox: 'Try the sandbox',
    enterApp: 'Enter app',
    navigationSheetTitle: 'Navigation',
  },
  am: {
    navLinks: [
      { label: 'አሰራሩ', href: '/how-it-works' },
      { label: 'ማስረጃ', href: '/proof' },
      { label: 'ደህንነት', href: '/safety' },
      { label: 'ተጨባጭ ማስረጃዎች', href: '/evidence' },
      { label: 'ክፍት ምንጭ', href: '/open-source' },
    ],
    trySandbox: 'የሙከራ ሳጥኑን ይሞክሩ',
    enterApp: 'ወደ መተግበሪያው ግባ',
    navigationSheetTitle: 'አሰሳ',
  },
  om: {
    navLinks: [
      { label: 'Haala Hojiisaa', href: '/how-it-works' },
      { label: 'Mirkaneessa', href: '/proof' },
      { label: 'Nageenya', href: '/safety' },
      { label: 'Ragaalee', href: '/evidence' },
      { label: 'Madda Banaa', href: '/open-source' },
    ],
    trySandbox: 'Sanduuqa yaalii ilaalaa',
    enterApp: 'Gara app seenaa',
    navigationSheetTitle: 'Navigeeshinii',
  },
};

export const landingTranslations: Record<Locale, LandingPageCopy> = {
  en: {
    hero: {
      mono: 'No. 01 · A savings circle on Arc',
      title: 'A savings circle that shows its',
      workEm: 'work.',
      subtitle:
        'EqubFlow runs a rotating savings group on Arc. It checks that every contribution really arrived, explains each decision in plain words, and can only pay the person whose turn it is.',
      ctaSandbox: 'Try the sandbox',
      ctaEvidence: 'Read the evidence',
      disclaimer: 'Test money. No real value. Built for the Tameion hackathon.',
    },
    s02: {
      mono: 'No. 02 · How a round works',
      title: 'How a round works.',
      stageLabel: 'STAGE:',
      verifiedLabel: 'ARC TESTNET VERIFIED',
      activeStateLabel: 'Active state:',
      steps: [
        {
          step: 1,
          badge: 'Step 1 of 5',
          label: 'Collect',
          sentence: "Each member sends their share to the group's safety lock.",
        },
        {
          step: 2,
          badge: 'Step 2 of 5',
          label: 'Match',
          sentence:
            "Software reads the network, not anyone's word, and matches each payment to a member and a round.",
        },
        {
          step: 3,
          badge: 'Step 3 of 5',
          label: 'Decide',
          sentence:
            'If a payment is late, short or unknown, the assistant suggests what to do and explains why. Members approve.',
        },
        {
          step: 4,
          badge: 'Step 4 of 5',
          label: 'Release',
          sentence:
            'When every share is matched or covered, the pot goes to the member whose turn it is. Only that member.',
        },
        {
          step: 5,
          badge: 'Step 5 of 5',
          label: 'Record',
          sentence: 'Every step is written to a record anyone can check.',
        },
      ],
    },
    s03: {
      mono: 'No. 03 · Check it yourself',
      title: 'Do not take our word for it.',
      subtitle:
        'Pick a demo circle. Your browser re-computes the record from the first entry and tells you whether anything was changed.',
      verifierLabel: 'In-Browser WebCrypto Verifier',
      hashingText: 'Hashing chain with SHA-256...',
      intactSuffix: 'entries intact. Record matches Arc Testnet ledger.',
      brokenPrefix: 'Chain broken at entry #',
      btnTamperActive: 'Reset to valid chain',
      btnTamperInactive: 'Change one entry and check again',
      alertTitle: 'Failure detected in-browser:',
      alertDesc:
        'Entry #3 was intentionally altered. Because each entry embeds the SHA-256 hash of its predecessor, modifying a single character broke the fingerprint for all subsequent entries.',
    },
    s04: {
      mono: 'No. 04 · Where the assistant decides',
      title: 'Where the assistant decides.',
      colSituation: 'Situation',
      colMayChoose: 'The assistant may choose',
      colCodeForbids: 'Code forbids',
      exampleLabel: 'An example from a real run:',
      footerNote:
        'The assistant never moves money. Software checks every choice, and a separate process sends payments.',
      situations: [
        {
          title: 'A payment is short',
          mayChoose: 'Ask for the rest, hold, or escalate',
          codeForbids: 'Counting the full amount',
          example:
            'Example from run #12: Hana sent 0.065 USDC against 0.10 expected. Assistant proposed D1: Record difference of -0.035 USDC and request top-up. Payout was locked until covered.',
        },
        {
          title: 'A payment is late',
          mayChoose: "Accept it with the lateness recorded, apply the group's late rule, or escalate",
          codeForbids: 'Accepting without a decision',
          example:
            'Example from run #8: Selam paid 40 minutes after block deadline. Assistant cited Rule 3 and proposed accepting with 40-minute lateness recorded. Group approved 2/2.',
        },
        {
          title: 'A payment comes from an unknown sender',
          mayChoose: 'Hold it, or ask who sent it',
          codeForbids: 'Crediting any member',
          example:
            'Example from run #4: Transfer from 0x98a... arrived. Classified as unknown_sender. Kept in safety lock without crediting round.',
        },
        {
          title: 'A member missed the deadline',
          mayChoose: 'Cover from reserve, delay the payout, pay a reduced pot, or escalate',
          codeForbids: 'Paying more than was collected plus approved cover',
          example:
            'Example from run #15: Member missed deadline. Assistant proposed delaying payout 2 hours. Rejected attempt to borrow unauthorized funds.',
        },
        {
          title: 'A member asks to swap turns',
          mayChoose: 'Recommend yes or no',
          codeForbids: 'Swapping without the approvals the rules require',
          example:
            'Example from run #6: Dawit requested slot 3 swap. Assistant recommended approval contingent on both parties signing on-chain.',
        },
        {
          title: 'Idle money sits between rounds',
          mayChoose: 'Keep it liquid, move a bounded share, or redeem',
          codeForbids: 'Moving money when a round is live or locked',
          example:
            'Example from run #19: Circle had 48 hours idle between cycles. Assistant proposed keeping 100% liquid because next round opens within 3 days.',
        },
      ],
    },
    s05: {
      mono: 'No. 05 · What it cannot do',
      title: 'What it cannot do.',
      pipelineLabel: 'Deterministic Safety Pipeline',
      stepAssistant: 'Assistant',
      stepAssistantSub: 'Suggests',
      stepChecker: 'Checker',
      stepCheckerSub: 'Is choice allowed?',
      stepAuthorizer: 'Authorizer',
      stepAuthorizerSub: 'Writes record',
      stepExecutor: 'Executor',
      stepExecutorSub: 'Only part that pays',
      stepPot: 'Pot',
      rule1: '1. It cannot choose who gets paid.',
      rule2: '2. It cannot pay twice for one round.',
      rule3: '3. It cannot act while the circle is paused.',
      rule4: '4. It cannot change the rules during a cycle.',
      honestNoteLabel: 'Honest note: ',
      honestNoteText:
        'Today the pot is held by a wallet that the executor controls. A small contract on Arc that limits even a compromised executor is designed in the project documents and is being tested on testnet.',
    },
    s06: {
      mono: 'No. 06 · Built on Arc',
      title: 'Built on Arc.',
      fact1: '1. Payments settle in USDC on Arc, with a public receipt link.',
      fact1Link: 'Arc Explorer >>',
      fact2: "2. Member and pot wallets are created with Circle's developer-controlled wallets.",
      fact2Link: 'Circle Documentation >>',
      fact3: '3. Idle funds were tested with USYC on Arc testnet: a deposit and a redemption both completed.',
      fact3Sub: 'Teller: 0x9fdF…105A',
      fact4: '4. The code and tests are public under Apache-2.0.',
      fact4Link: 'GitHub Repository >>',
      readNotesLink: 'Read the technical notes >>',
    },
    s07: {
      mono: 'No. 07 · The evidence so far',
      title: 'The evidence so far.',
      colMetric: 'Metric',
      colReal: 'Real group',
      colSimulated: 'Simulated runs',
      notYet: 'Not yet',
      metrics: [
        { name: 'People taking part', simulated: '4' },
        { name: 'Rounds completed', simulated: '1' },
        { name: 'USDC moved (test money)', simulated: '0.40 USDC' },
        { name: 'Decisions recorded', simulated: '20' },
        { name: 'Discrepancies resolved', simulated: '1 (Late)' },
        { name: 'Automated tests passing', simulated: '73 of 73' },
      ],
      lastGenerated: 'Last generated: 2026-10-12T13:34:29Z',
      howWeCount: 'How we count >>',
      footerNote: 'Only real people making their own decisions count as real.',
    },
    s08: {
      mono: 'No. 08 · Honest limits',
      title: 'What this demo is, and what it is not.',
      colIs: 'This demo is',
      colIsNot: 'It is not',
      rows: [
        {
          is: 'A small circle of six people using test money',
          isNot: 'A bank, a lender or a real-money product',
        },
        {
          is: 'Rounds sped up from weeks to hours',
          isNot: 'A normal savings schedule',
        },
        {
          is: 'Software that checks payments and writes a record anyone can verify',
          isNot: 'Reviewed by an outside security firm',
        },
        {
          is: 'Open source under Apache-2.0',
          isNot: 'Finished: some parts are planned, and the page says which',
        },
      ],
    },
    s09: {
      mono: 'No. 09 · Run it yourself',
      title: 'Run it yourself.',
      reusableTitle: 'Reusable parts:',
      parts: [
        'The payment classifier (pure TypeScript, 0 I/O)',
        'The record verifier (WebCrypto SHA-256)',
        'The payout authorizer (deterministic gate)',
        'The database permission and RLS test suite',
      ],
      runTestsText: 'Run the tests with one command: pnpm test',
    },
    s10: {
      mono: 'No. 10 · See a full cycle in two minutes',
      title: 'See a full cycle in two minutes.',
      btnSandbox: 'Try the sandbox',
      btnDocs: 'Read the documents',
      btnApp: 'Enter the app',
    },
  },
  am: {
    hero: {
      mono: 'ቁ. 01 · በArc ላይ የተመሰረተ የዕቁብ ማህበር',
      title: 'ስራውን በግልጽ የሚያሳይ የቁጠባ',
      workEm: 'ዕቁብ።',
      subtitle:
        'EqubFlow በArc ላይ የተመሰረተ የዕቁብ ማህበርን ይመራል። እያንዳንዱ መዋጮ በትክክል መድረሱን ያረጋግጣል፤ ውሳኔዎችን በግልጽ ቋንቋ ያብራራል፤ ክፍያንም ለተረኛው አባል ብቻ ያስረክባል።',
      ctaSandbox: 'የሙከራ ሳጥኑን ይሞክሩ',
      ctaEvidence: 'ማስረጃዎችን ይመልከቱ',
      disclaimer: 'የሙከራ ገንዘብ። እውነተኛ ዋጋ የለውም። ለTameion Hackathon የተሰራ።',
    },
    s02: {
      mono: 'ቁ. 02 · አንድ ዙር እንዴት እንደሚሰራ',
      title: 'አንድ ዙር እንዴት እንደሚሰራ።',
      stageLabel: 'ደረጃ:',
      verifiedLabel: 'በARC TESTNET የተረጋገጠ',
      activeStateLabel: 'አሁን ያለበት ሁኔታ:',
      steps: [
        {
          step: 1,
          badge: 'ደረጃ 1 ከ 5',
          label: 'መሰብሰብ',
          sentence: 'እያንዳንዱ አባል የዕጣ መዋጮውን ወደ ዕቁቡ የጋራ የደህንነት ሳጥን ገቢ ያደርጋል።',
        },
        {
          step: 2,
          badge: 'ደረጃ 2 ከ 5',
          label: 'ማመሳከር',
          sentence: 'ሶፍትዌሩ አውታረ መረቡን በማንበብ እያንዳንዱን ክፍያ ከአባሉ እና ከዙሩ ጋር ያዛምዳል።',
        },
        {
          step: 3,
          badge: 'ደረጃ 3 ከ 5',
          label: 'መወሰን',
          sentence: 'ክፍያው ከዘገየ ወይም ከጎደለ ረዳቱ መፍትሄ አቅርቦ ምክንያቱን ያብራራል። አባላት ያጸድቃሉ።',
        },
        {
          step: 4,
          badge: 'ደረጃ 4 ከ 5',
          label: 'ክፍያ መስጠት',
          sentence: 'ሁሉም ድርሻ ተሟልቶ ሲገኝ፣ አጠቃላይ ገንዘቡ ለተረኛው አባል ብቻ ይተላለፋል።',
        },
        {
          step: 5,
          badge: 'ደረጃ 5 ከ 5',
          label: 'መመዝገብ',
          sentence: 'እያንዳንዱ እርምጃ ማንኛውም ሰው ሊያረጋግጠው በሚችል ቋሚ መዝገብ ላይ ይጻፋል።',
        },
      ],
    },
    s03: {
      mono: 'ቁ. 03 · እራስዎ ያረጋግጡ',
      title: 'በቃላችን ብቻ አይመኑ።',
      subtitle:
        'የማሳያ ዕቁብ ይምረጡ። የእርስዎ ማሰሻ (ብሮውዘር) ከመጀመሪያው ጀምሮ መዝገቡን እንደገና በማስላት ምንም አይነት መረጃ እንዳልተለወጠ ያረጋግጣል።',
      verifierLabel: 'በማሰሻዎ የሚሰራ የWebCrypto ማረጋገጫ',
      hashingText: 'በSHA-256 በማረጋገጥ ላይ...',
      intactSuffix: 'ምዝገባዎች አልተበረዙም። መዝገቡ ከArc Testnet መረጃ ጋር ይጣጣማል።',
      brokenPrefix: 'የተበላሸበት የምዝገባ ቁጥር #',
      btnTamperActive: 'ወደ ትክክለኛው ሰንሰለት መልስ',
      btnTamperInactive: 'አንድ ምዝገባ ለውጠው ውጤቱን ይፈትሹ',
      alertTitle: 'ስህተት በማሰሻዎ ተገኝቷል:',
      alertDesc:
        'ምዝገባ ቁጥር #3 ሆን ተብሎ እንዲቀየር ተደርጓል። እያንዳንዱ ምዝገባ የቀደመውን የSHA-256 አሻራ ስለሚይዝ፣ አንዲት ፊደል መቀየር ተከታዮቹን በሙሉ ያፈርሳቸዋል።',
    },
    s04: {
      mono: 'ቁ. 04 · ረዳቱ የሚወስንባቸው ሁኔታዎች',
      title: 'ረዳቱ የሚወስንባቸው ሁኔታዎች።',
      colSituation: 'ሁኔታ',
      colMayChoose: 'ረዳቱ ሊመርጣቸው የሚችላቸው',
      colCodeForbids: 'ህጉ በጥብቅ የሚከለክለው',
      exampleLabel: 'ከተከናወነ ዙር የተገኘ ትክክለኛ ምሳሌ:',
      footerNote:
        'ረዳቱ በራሱ ፈቃድ ገንዘብ አያንቀሳቅስም። ሶፍትዌሩ እያንዳንዱን ምርጫ ያጣራል፤ ክፍያ የሚፈጸመውም በሌላ የተለየ አሰራር ነው።',
      situations: [
        {
          title: 'ክፍያ ሲጎድል',
          mayChoose: 'ቀሪውን መጠየቅ፣ ለጊዜው ማቆየት፣ ወይም ለአባላት ማሳወቅ',
          codeForbids: 'ያልተሟላ ክፍያን እንደ ሙሉ መቁጠር',
          example:
            'ከዙር 12 የተገኘ ምሳሌ: ሃና ከሚጠበቀው 0.10 USDC ፈንታ 0.065 USDC ላከች። ረዳቱ የ-0.035 USDC ጉድለት መዝግቦ ቀሪው እንዲሞላ ጠየቀ። ክፍያው እስኪሞላ ድረስ ታገደ።',
        },
        {
          title: 'ክፍያ ሲዘገይ',
          mayChoose: 'መዘግየቱን መዝግቦ መቀበል፣ የዕቁቡን የመዘግየት ህግ መተግበር፣ ወይም ማሳወቅ',
          codeForbids: 'ያለ ውሳኔ መዝገብ በጭፍን መቀበል',
          example:
            'ከዙር 8 የተገኘ ምሳሌ: ሰላም ከጊዜ ገደቡ 40 ደቂቃ አሳልፋ ከፈለች። ረዳቱ ህግ 3ን ጠቅሶ በ40 ደቂቃ መዘግየት እንዲመዘገብ ሃሳብ አቀረበ። አባላት በ2/2 ድምጽ አጸደቁት።',
        },
        {
          title: 'ክፍያ ካልታወቀ ላኪ ሲመጣ',
          mayChoose: 'ክፍያውን ማገድ፣ ወይም ላኪው ማን እንደሆነ ማጣራት',
          codeForbids: 'ለማንኛውም አባል በስህተት ገቢ ማድረግ',
          example:
            'ከዙር 4 የተገኘ ምሳሌ: ከ0x98a... ክፍያ ደረሰ። እንደ ያልታወቀ ላኪ ተመደበ። ወደ ዕቁቡ ሳይገባ በደህንነት ቁልፍ ውስጥ ተያዘ።',
        },
        {
          title: 'አባል የጊዜ ገደቡን ሲያሳልፍ',
          mayChoose: 'ከተቀማጭ መሸፈን፣ ክፍያውን ማዘግየት፣ የቀነሰ ዕጣ መስጠት፣ ወይም ማሳወቅ',
          codeForbids: 'ከተሰበሰበው በላይ ወይም ካልተፈቀደ ገንዘብ መክፈል',
          example:
            'ከዙር 15 የተገኘ ምሳሌ: አባል ክፍያ አሳለፈ። ረዳቱ የዕጣ መስጫውን ለ2 ሰዓታት እንዲራዘም ሃሳብ አቀረበ። ያልተፈቀደ ገንዘብ የማበደር ሙከራ ውድቅ ተደረገ።',
        },
        {
          title: 'አባል ተራ ለመቀያየር ሲጠይቅ',
          mayChoose: 'ተቀባይነት እንዲያገኝ ወይም ውድቅ እንዲሆን አስተያየት መስጠት',
          codeForbids: 'አስፈላጊው የአባላት ይሁንታ ሳይገኝ ተራ መቀየር',
          example:
            'ከዙር 6 የተገኘ ምሳሌ: ዳዊት ተራ 3ን ለመቀየር ጠየቀ። ረዳቱ ሁለቱም ወገኖች በኦን-ቼይን እስከተስማሙ ድረስ እንዲፈቀድ ሃሳብ ሰጠ።',
        },
        {
          title: 'በዙሮች መካከል ክፍት ገንዘብ ሲኖር',
          mayChoose: 'ሙሉ በሙሉ ዝግጁ ማድረግ፣ የተወሰነውን ማስተዳደር፣ ወይም መመለስ',
          codeForbids: 'ዙሩ በስራ ላይ እያለ ገንዘብ ማንቀሳቀስ',
          example:
            'ከዙር 19 የተገኘ ምሳሌ: ዕቁቡ በዙሮች መካከል 48 ሰዓታት ነበረው። ቀጣዩ ዙር በ3 ቀናት ውስጥ ስለሚከፈት ረዳቱ 100% ዝግጁ ሆኖ እንዲቆይ ሃሳብ አቀረበ።',
        },
      ],
    },
    s05: {
      mono: 'ቁ. 05 · ማድረግ የማይችላቸው ነገሮች',
      title: 'ማድረግ የማይችላቸው ነገሮች።',
      pipelineLabel: 'የደህንነት ማረጋገጫ መስመር',
      stepAssistant: 'ረዳት',
      stepAssistantSub: 'ሃሳብ ያቀርባል',
      stepChecker: 'አጣሪ',
      stepCheckerSub: 'ምርጫው ተፈቅዷል?',
      stepAuthorizer: 'አጽዳቂ',
      stepAuthorizerSub: 'መዝገብ ይጽፋል',
      stepExecutor: 'ፈጻሚ',
      stepExecutorSub: 'ብቸኛው ከፋይ',
      stepPot: 'የዕቁብ ገንዘብ',
      rule1: '1. ክፍያው ለማን እንደሚሰጥ መወሰን አይችልም።',
      rule2: '2. ለአንድ ዙር ሁለት ጊዜ መክፈል አይችልም።',
      rule3: '3. ዕቁቡ በቆመበት ጊዜ ምንም እርምጃ መውሰድ አይችልም።',
      rule4: '4. በዙር ሂደት ወቅት ህጎችን መለወጥ አይችልም።',
      honestNoteLabel: 'ግልጽ ማስታወሻ: ',
      honestNoteText:
        'በአሁኑ ወቅት የዕቁቡ ገንዘብ የሚቀመጠው በፈጻሚው ቁጥጥር ስር ባለው የኪስ ቦርሳ ውስጥ ነው። በፈጻሚው ላይ የሚደርስን አደጋ እንኳን የሚገድብ ስማርት ኮንትራት በፕሮጀክቱ ሰነዶች ውስጥ ተቀርጾ በሙከራ ላይ ይገኛል።',
    },
    s06: {
      mono: 'ቁ. 06 · በArc የተገነባ',
      title: 'በArc የተገነባ።',
      fact1: '1. ክፍያዎች በArc ላይ በUSDC ይፈጸማሉ፤ ይፋዊ የደረሰኝ ማስፈንጠሪያም አላቸው።',
      fact1Link: 'የArc መረጃ መመልከቻ >>',
      fact2: '2. የአባላት እና የዕቁቡ የኪስ ቦርሳዎች በCircle ቴክኖሎጂ የተገነቡ ናቸው።',
      fact2Link: 'የCircle ሰነዶች >>',
      fact3: '3. ክፍት ገንዘብ በArc testnet በUSYC ተሞክሯል: ገቢ የማድረግ እና የመመለስ ሂደት ተጠናቋል።',
      fact3Sub: 'ቴለር: 0x9fdF…105A',
      fact4: '4. ኮዱ እና የፈተና ውጤቶቹ በApache-2.0 ፈቃድ ስር ይፋ ሆነዋል።',
      fact4Link: 'የGitHub መረጃ ቋት >>',
      readNotesLink: 'ቴክኒካዊ ማስታወሻዎችን ያንብቡ >>',
    },
    s07: {
      mono: 'ቁ. 07 · እስካሁን የተገኙ ማስረጃዎች',
      title: 'እስካሁን የተገኙ ማስረጃዎች።',
      colMetric: 'መለኪያ',
      colReal: 'እውነተኛ ቡድን',
      colSimulated: 'የሙከራ ሂደቶች',
      notYet: 'እስካሁን የለም',
      metrics: [
        { name: 'የተሳተፉ ሰዎች', simulated: '4' },
        { name: 'የተጠናቀቁ ዙሮች', simulated: '1' },
        { name: 'የተንቀሳቀሰ USDC (የሙከራ)', simulated: '0.40 USDC' },
        { name: 'የተመዘገቡ ውሳኔዎች', simulated: '20' },
        { name: 'የተፈቱ ልዩነቶች', simulated: '1 (የዘገየ)' },
        { name: 'ያለፉ የራስ-ሰር ፈተናዎች', simulated: '73 ከ 73' },
      ],
      lastGenerated: 'የመጨረሻ ማሻሻያ: 2026-10-12T13:34:29Z',
      howWeCount: 'አቆጣጠራችን >>',
      footerNote: 'እውነተኛ ተብለው የሚቆጠሩት እውነተኛ ሰዎች በራሳቸው የወሰኑት ውሳኔዎች ብቻ ናቸው።',
    },
    s08: {
      mono: 'ቁ. 08 · ግልጽ ገደቦች',
      title: 'ይህ ማሳያ ምን እንደሆነ እና ምን እንዳልሆነ።',
      colIs: 'ይህ ማሳያ:',
      colIsNot: 'ያልሆነው:',
      rows: [
        {
          is: 'የሙከራ ገንዘብ የሚጠቀም የስድስት ሰዎች አነስተኛ ዕቁብ ነው',
          isNot: 'ባንክ፣ አበዳሪ ወይም የእውነተኛ ገንዘብ ምርት አይደለም',
        },
        {
          is: 'ሳምንታት የሚወስዱ ዙሮች ወደ ሰዓታት እንዲፈጥኑ የተደረገበት ነው',
          isNot: 'መደበኛ የቁጠባ የጊዜ ሰሌዳ አይደለም',
        },
        {
          is: 'ክፍያዎችን የሚያረጋግጥ እና ማንኛውም ሰው ሊፈትሸው የሚችል መዝገብ የሚያዘጋጅ ሶፍትዌር ነው',
          isNot: 'በውጭ የደህንነት ድርጅት የተመረመረ አይደለም',
        },
        {
          is: 'በApache-2.0 ፈቃድ ስር ክፍት ምንጭ ነው',
          isNot: 'ሙሉ በሙሉ የተጠናቀቀ አይደለም: አንዳንድ የታቀዱ ክፍሎች አሉ',
        },
      ],
    },
    s09: {
      mono: 'ቁ. 09 · እራስዎ ይሞክሩት',
      title: 'እራስዎ ይሞክሩት።',
      reusableTitle: 'እንደገና ጥቅም ላይ ሊውሉ የሚችሉ ክፍሎች:',
      parts: [
        'የክፍያ መለያ ስርዓት (ንጹህ TypeScript፣ 0 I/O)',
        'የመዝገብ ማረጋገጫ (WebCrypto SHA-256)',
        'የክፍያ ፈቃድ ሰጪ (የደህንነት በር)',
        'የዳታቤዝ ፈቃድ እና የRLS የፈተና ስብስብ',
      ],
      runTestsText: 'ፈተናዎችን በአንድ ትዕዛዝ ያሂዱ: pnpm test',
    },
    s10: {
      mono: 'ቁ. 10 · ሙሉውን ሂደት በሁለት ደቂቃ ውስጥ ይመልከቱ',
      title: 'ሙሉውን ሂደት በሁለት ደቂቃ ውስጥ ይመልከቱ።',
      btnSandbox: 'የሙከራ ሳጥን',
      btnDocs: 'ሰነዶችን ያንብቡ',
      btnApp: 'ወደ መተግበሪያው ግባ',
    },
  },
  om: {
    hero: {
      mono: 'Lakk. 01 · Waldaa qusannaa Arc irratti',
      title: 'Waldaa qusannaa hojii isaa ifatti',
      workEm: 'agarsiisu.',
      subtitle:
        'EqubFlow waldaa iqubii marsaa kan Arc Testnet irratti geggeessa. Gumaatni hunduu sirriitti gahuu isaa mirkaneessa; murteewwan jechoota ifa ta\'aniin ibsa; kaffaltiis nama dabaree qabuuf qofa kaffala.',
      ctaSandbox: 'Sanduuqa yaalii ilaalaa',
      ctaEvidence: 'Ragaalee dubbisaa',
      disclaimer: 'Qarshii yaalii. Gatii dhugaa hin qabu. Tameion Hackathoniif kan hojjetame.',
    },
    s02: {
      mono: 'Lakk. 02 · Marsaan tokko akkamitti hojjeta',
      title: 'Marsaan tokko akkamitti hojjeta.',
      stageLabel: 'SADARKAA:',
      verifiedLabel: 'ARC TESTNET IRRATTI MIRKANAA\'EERA',
      activeStateLabel: 'Haala ammaa:',
      steps: [
        {
          step: 1,
          badge: 'Sadarkaa 1 / 5',
          label: 'Walitti qabuu',
          sentence: 'Miseensi hundinuu gumaata isaa kuusaa eegumsa iqubii waliiniitti galii godha.',
        },
        {
          step: 2,
          badge: 'Sadarkaa 2 / 5',
          label: 'Walsimsiisuu',
          sentence: 'Sooftiweerichi netwoorkii dubbisuun kaffaltii hunda miseensaa fi marsaa wajjin walsimsiisa.',
        },
        {
          step: 3,
          badge: 'Sadarkaa 3 / 5',
          label: 'Murteessuu',
          sentence: 'Kaffaltiin yoo ture yookiin hir\'ate gargaaraan furmaata dhiyeessee sababa isaa ibsa. Miseensonni ni mirkaneessu.',
        },
        {
          step: 4,
          badge: 'Sadarkaa 4 / 5',
          label: 'Kaffaluu',
          sentence: 'Qarshiin hundi yommuu guutamu, qabeenyi walitti qabame nama dabaree qabuuf qofa darba.',
        },
        {
          step: 5,
          badge: 'Sadarkaa 5 / 5',
          label: 'Galmeessuu',
          sentence: 'Tarkaanfiin hundinuu galmee eenyullee mirkaneeffachuu danda\'u irratti barreeffama.',
        },
      ],
    },
    s03: {
      mono: 'Lakk. 03 · Ofumaan mirkaneessaa',
      title: 'Jecha keenya qofa hin amaninaa.',
      subtitle:
        'Iqubii yaalii filadhaa. Biriwuzariin keessan galmee sana jalqabaa kaasee irra deebiin herregee wanti jijjiirame jiraachuu isaa isinitti hima.',
      verifierLabel: 'Mirkaneessaa WebCrypto Biriwuzarii Keessatti',
      hashingText: 'SHA-256 fayyadamuun herregamaa jira...',
      intactSuffix: 'galmeewwan hin tuqamne. Galmeen Arc Testnet wajjin walsima.',
      brokenPrefix: 'Sanjatni galmee lakk. # irratti cite',
      btnTamperActive: 'Gara galmee sirriitti deebisi',
      btnTamperInactive: 'Galmee tokko jijjiiriitii ilaali',
      alertTitle: 'Dogoggorri biriwuzarii keessatti argameera:',
      alertDesc:
        'Galmeen lakk. #3 ta\'e jedhamee jijjiirame. Galmeen hundi mallattoo SHA-256 isa duraa waan qabuuf, qubee tokko jijjiiruun kanneen itti aanan hunda balleessa.',
    },
    s04: {
      mono: 'Lakk. 04 · Bakka gargaaraan AI itti murteessu',
      title: 'Bakka gargaaraan AI itti murteessu.',
      colSituation: 'Haala',
      colMayChoose: 'Gargaaraan filachuu kan danda\'u',
      colCodeForbids: 'Koodiin kan dhowwu',
      exampleLabel: 'Fakkeenya marsaa dhugaa irraa fudhatame:',
      footerNote:
        'Gargaaraan AI ofumaan qarshii hin sochoosu. Sooftiweerichi filannoo hunda ni qorata; kaffaltiin karaa biraatiin raawwatama.',
      situations: [
        {
          title: 'Kaffaltiin yoo hir\'ate',
          mayChoose: 'Isa hafe gaafachuu, tursiisuu, yookiin beeksisuu',
          codeForbids: 'Kaffaltii hanquu akka guutuutti lakkaa\'uu',
          example:
            'Fakkeenya marsaa 12: Haanaan 0.10 USDC irraa 0.065 USDC ergite. Gargaaraan hanqina -0.035 USDC galmeessee akka guutamu gaafate. Kaffaltiin hanga guutamutti hidhame.',
        },
        {
          title: 'Kaffaltiin yoo ture',
          mayChoose: 'Turitii galmeessee fudhachuu, seera adabbii hojiirra oolchuu, yookiin kufaa gochuu',
          codeForbids: 'Galmee murtee malee akkasumatti fudhachuu',
          example:
            'Fakkeenya marsaa 8: Salaam daangaa yeroo booda daqiiqaa 40 turtee kaffalte. Gargaaraan seera 3 caqasee turitii daqiiqaa 40 wajjin akka fudhatamu dhiyeesse. Miseensonni 2/2 mirkaneessan.',
        },
        {
          title: 'Kaffaltiin nama hin beekamne irraa yoo dhufe',
          mayChoose: 'Tursiisuu, yookiin eenyu akka erge qorachuu',
          codeForbids: 'Miseensa kamiyyuuf dogoggoraan galii gochuu',
          example:
            'Fakkeenya marsaa 4: Kaffaltiin 0x98a... irraa dhufe. Akka nama hin beekamneetti ramadame. Qabeenya iqubiitti osoo hin dabalamiin eegumsa keessa tursiifame.',
        },
        {
          title: 'Miseensi yoo daangaa yeroo dabarse',
          mayChoose: 'Qabeenya kuusaa irraa uwwisuu, kaffaltii tursiisuu, kaffaltii hir\'isuu, yookiin beeksisuu',
          codeForbids: 'Wanta walitti qabamee olitti qarshii hin heyyamamne kaffaluu',
          example:
            'Fakkeenya marsaa 15: Miseensi daangaa yeroo dabarse. Gargaaraan kaffaltiin sa\'aatii 2f akka dhiibamu yaada dhiyeesse. Qarshii hin heyyamamne liqeessuun kufaa ta\'e.',
        },
        {
          title: 'Miseensi dabaree jijjiirrachuu yoo gaafate',
          mayChoose: 'Akka hayyamamu yookiin kufaa ta\'u yaada kennuu',
          codeForbids: 'Hayyama miseensotaa malee dabaree jijjiiruu',
          example:
            'Fakkeenya marsaa 6: Daawwit dabaree 3ffaa jijjiirrachuu gaafate. Gargaaraan qaamonni lachuu toora irra yoo mallatteessan akka mirkanaa\'u yaada kenne.',
        },
        {
          title: 'Qarshiin marsaalee gidduutti duwwaa yoo taa\'e',
          mayChoose: 'Qophii gochuu, hamma murtaa\'e bulchuu, yookiin deebisuu',
          codeForbids: 'Marsaan hojii irra osoo jiruu qarshii sochoosuu',
          example:
            'Fakkeenya marsaa 19: Iqubiin marsaalee gidduutti sa\'aatii 48 qaba ture. Marsaan itti aanu guyyaa 3 keessatti waan jalqabuuf gargaaraan 100% qophii ta\'ee akka turu yaada dhiyeesse.',
        },
      ],
    },
    s05: {
      mono: 'Lakk. 05 · Wanta gochuu hin dandeenye',
      title: 'Wanta gochuu hin dandeenye.',
      pipelineLabel: 'Sarara Nageenyaa Mirkanaa\'aa',
      stepAssistant: 'Gargaaraa',
      stepAssistantSub: 'Yaada dhiyeessa',
      stepChecker: 'Sakatta\'aa',
      stepCheckerSub: 'Heyyamameeraa?',
      stepAuthorizer: 'Mirkaneessaa',
      stepAuthorizerSub: 'Galmee barreessa',
      stepExecutor: 'Raawwataa',
      stepExecutorSub: 'Isa kaffalu qofa',
      stepPot: 'Qabeenya Iqubii',
      rule1: '1. Kaffaltiin eenyuuf akka kennamu murteessuu hin danda\'u.',
      rule2: '2. Marsaa tokkoof kaffaltii lammata baasuu hin danda\'u.',
      rule3: '3. Iqubiin yeroof yommuu dhaabbatu tarkaanfii fudhachuu hin danda\'u.',
      rule4: '4. Adeemsa marsaa keessatti seera jijjiiruu hin danda\'u.',
      honestNoteLabel: 'Hubachiisa dhugaa: ',
      honestNoteText:
        'Yeroo ammaa qabeenyi iqubii boorsaa raawwataan to\'atu keessa taa\'a. Kontiraatni Arc kan raawwataa miidhame illee daangessu sanadoota keessatti qophaa\'ee yaalii irra jira.',
    },
    s06: {
      mono: 'Lakk. 06 · Arc irratti kan ijaarame',
      title: 'Arc irratti kan ijaarame.',
      fact1: '1. Kaffaltiin Arc irratti USDC tiin raawwatama; hidhannoo nagahee ifaas qaba.',
      fact1Link: 'Sakatta\'aa Arc >>',
      fact2: '2. Boorsaan miseensotaa fi iqubii teeknooloojii Circle tiin kan to\'atamuudha.',
      fact2Link: 'Sanadoota Circle >>',
      fact3: '3. Qarshiin boqonnaa qabu USYC tiin Arc testnet irratti yaalamee milkaa\'eera.',
      fact3Sub: 'Teellerii: 0x9fdF…105A',
      fact4: '4. Koodiin fi qormaanni heyyama Apache-2.0 jalatti ifa ta\'aniiru.',
      fact4Link: 'Kuusaa GitHub >>',
      readNotesLink: 'Ibsa teeknikaa dubbisaa >>',
    },
    s07: {
      mono: 'Lakk. 07 · Ragaalee hanga ammaatti argaman',
      title: 'Ragaalee hanga ammaatti argaman.',
      colMetric: 'Safartuu',
      colReal: 'Garee dhugaa',
      colSimulated: 'Yaalii agarsiisaa',
      notYet: 'Ammaaf hin jiru',
      metrics: [
        { name: 'Namoota hirmaatan', simulated: '4' },
        { name: 'Marsaalee xumuraman', simulated: '1' },
        { name: 'USDC socho\'e (yaalii)', simulated: '0.40 USDC' },
        { name: 'Murteewwan galmaa\'an', simulated: '20' },
        { name: 'Garaagarummaa furame', simulated: '1 (Kan ture)' },
        { name: 'Qormaata darban', simulated: '73 keessaa 73' },
      ],
      lastGenerated: 'Kan yeroo dhihoo: 2026-10-12T13:34:29Z',
      howWeCount: 'Akkamitti akka lakkoofnu >>',
      footerNote: 'Namoonni dhugaa murtee ofii isaanii murteessan qofti akka dhugaatti lakkaa\'amu.',
    },
    s08: {
      mono: 'Lakk. 08 · Daangaawwan dhugaa',
      title: 'Agarsiifni kun maali, maalis miti.',
      colIs: 'Agarsiifni kun:',
      colIsNot: 'Wanta inni hin taane:',
      rows: [
        {
          is: 'Iqubii namoota ja\'aa qarshii yaalii fayyadamuudha',
          isNot: 'Baankii, liqeessaa yookiin oomisha qarshii dhugaa miti',
        },
        {
          is: 'Marsaaleen torbanoota irraa gara sa\'aatiitti saffisiifamaniiru',
          isNot: 'Sagantaa qusannaa idilee miti',
        },
        {
          is: 'Sooftiweerii kaffaltii sakatta\'ee galmee eenyullee mirkaneeffatu uumuudha',
          isNot: 'Dhaabbata nageenyaa alatiin kan qorame miti',
        },
        {
          is: 'Heyyama Apache-2.0 jalatti madda banaadha',
          isNot: 'Guutummaatti kan xumurame miti: kutaaleen tokko tokko karoorfamaa jiru',
        },
      ],
    },
    s09: {
      mono: 'Lakk. 09 · Ofumaan yaalaa',
      title: 'Ofumaan yaalaa.',
      reusableTitle: 'Kutaalee irra deebi\'amee fayyadamuun danda\'amu:',
      parts: [
        'Ramadaa kaffaltii (TypeScript qulqulluu, 0 I/O)',
        'Mirkaneessaa galmee (WebCrypto SHA-256)',
        'Heyyamsiisaa kaffaltii (balbala nageenyaa)',
        'Heyyama daataabeesii fi qormaata RLS',
      ],
      runTestsText: 'Qormaata ajaja tokkoon geggeessaa: pnpm test',
    },
    s10: {
      mono: 'Lakk. 10 · Marsaa guutuu daqiiqaa lama keessatti ilaalaa',
      title: 'Marsaa guutuu daqiiqaa lama keessatti ilaalaa.',
      btnSandbox: 'Sanduuqa yaalii',
      btnDocs: 'Sanadoota dubbisaa',
      btnApp: 'Gara app seenaa',
    },
  },
};

export interface GroupHomeCopy {
  roundOf: (r: number, m: number) => string;
  circleCompleteTitle: string;
  circleCompleteSub: string;
  seeRecord: string;
  yourTurnTitle: string;
  yourTurnSub: string;
  contributionsCollected: string;
  contribTransitTitle: string;
  contribTransitSub: string;
  yourContribTitle: string;
  yourContribSubPaid: (r: number) => string;
  receiptConfirmed: string;
  openReceipt: string;
  lateSub: string;
  payBtn: string;
  lateChip: string;
  dueByChip: (d: string) => string;
  thisRoundTitle: string;
  potGoesTo: string;
  paidSoFar: string;
  nextDeadline: string;
  circleRollTitle: string;
  receivesThisRound: string;
  chipPaid: string;
  chipLate: string;
  chipWaiting: string;
}

export const groupHomeTranslations: Record<Locale, GroupHomeCopy> = {
  en: {
    roundOf: (r, m) => `Round ${r} of ${m}`,
    circleCompleteTitle: 'The circle is complete',
    circleCompleteSub: 'All rounds have concluded successfully.',
    seeRecord: 'See complete record',
    yourTurnTitle: 'Your turn to receive',
    yourTurnSub: 'Paid out when everyone has paid.',
    contributionsCollected: 'Contributions collected:',
    contribTransitTitle: 'Contribution in transit',
    contribTransitSub: 'Sent. We are waiting for the network to confirm it.',
    yourContribTitle: 'Your contribution',
    yourContribSubPaid: (r) => `Next: round ${r + 1} opens soon.`,
    receiptConfirmed: 'Receipt confirmed on chain',
    openReceipt: 'Open receipt',
    lateSub: 'The group may still accept it if members vote to approve.',
    payBtn: 'Pay my contribution',
    lateChip: 'Late by 40 min',
    dueByChip: (d) => `Due by ${d}`,
    thisRoundTitle: 'This Round',
    potGoesTo: 'Pot goes to',
    paidSoFar: 'Paid so far',
    nextDeadline: 'Next deadline',
    circleRollTitle: 'The Circle Roll',
    receivesThisRound: 'receives this round',
    chipPaid: 'Paid',
    chipLate: 'Late',
    chipWaiting: 'Waiting',
  },
  am: {
    roundOf: (r, m) => `ዙር ${r} ከ ${m}`,
    circleCompleteTitle: 'ዕቁቡ ተጠናቋል',
    circleCompleteSub: 'ሁሉም ዙሮች በተሳካ ሁኔታ ተጠናቀዋል።',
    seeRecord: 'ሙሉውን መዝገብ ይመልከቱ',
    yourTurnTitle: 'የዚህ ዙር እጣ ተቀባይ ነዎት',
    yourTurnSub: 'ሁሉም አባላት ከፍለው ሲያጠናቅቁ የሚሰጥ።',
    contributionsCollected: 'የተሰበሰቡ መዋጮዎች:',
    contribTransitTitle: 'ክፍያው በመተላለፍ ላይ ነው',
    contribTransitSub: 'ተልኳል። አውታረ መረቡ እስኪያረጋግጥ እየጠበቅን ነው።',
    yourContribTitle: 'የዕጣ ክፍያዎ',
    yourContribSubPaid: (r) => `ቀጣይ: ዙር ${r + 1} በቅርቡ ይከፈታል።`,
    receiptConfirmed: 'ደረሰኝ በሰንሰለቱ ላይ ተረጋግጧል',
    openReceipt: 'ደረሰኙን ክፈት',
    lateSub: 'አባላት ድምፅ ከሰጡበት ዕቁቡ አሁንም ሊቀበለው ይችላል።',
    payBtn: 'የዕጣ ክፍያዬን ክፈል',
    lateChip: 'በ40 ደቂቃ ዘግይቷል',
    dueByChip: (d) => `የመጨረሻ ጊዜ: ${d}`,
    thisRoundTitle: 'ይህ ዙር',
    potGoesTo: 'ዕጣው የሚሰጠው ለ',
    paidSoFar: 'እስካሁን የተከፈለው',
    nextDeadline: 'ቀጣይ የጊዜ ገደብ',
    circleRollTitle: 'የዕቁቡ አባላት ዝርዝር',
    receivesThisRound: 'የዚህ ዙር ተረኛ',
    chipPaid: 'ተከፍሏል',
    chipLate: 'ዘግይቷል',
    chipWaiting: 'በመጠበቅ ላይ',
  },
  om: {
    roundOf: (r, m) => `Marsaa ${r} / ${m}`,
    circleCompleteTitle: 'Iqubiin xumurameera',
    circleCompleteSub: "Marsaaleen hundinuu milkaa'inaan xumuramaniiru.",
    seeRecord: 'Galmee guutuu ilaalaa',
    yourTurnTitle: 'Dabaree keessan kan marsaa kanaa',
    yourTurnSub: 'Yommuu hunduu kaffalu kan kaffalamu.',
    contributionsCollected: 'Gumaata walitti qabame:',
    contribTransitTitle: 'Kaffaltiin adeemsa irra jira',
    contribTransitSub: 'Ergameera. Netwoorkiin hanga mirkaneessutti eegaa jirra.',
    yourContribTitle: 'Gumaata keessan',
    yourContribSubPaid: (r) => `Itti aanee: marsaan ${r + 1} dhihootti banama.`,
    receiptConfirmed: "Nagaheen toora irratti mirkanaa'eera",
    openReceipt: 'Nagahee bani',
    lateSub: "Miseensonni yoo sagalee kennan iqubiin ammas fudhachuu danda'a.",
    payBtn: 'Gumaata koo kaffali',
    lateChip: 'Daqiiqaa 40 tureera',
    dueByChip: (d) => `Daangaa: ${d}`,
    thisRoundTitle: 'Marsaa Kana',
    potGoesTo: 'Qarshiin kan kennamuuf',
    paidSoFar: 'Hanga ammaatti kan kaffalame',
    nextDeadline: 'Daangaa yeroo itti aanu',
    circleRollTitle: 'Tarree Miseensota Iqubii',
    receivesThisRound: 'marsaa kana fudhata',
    chipPaid: 'Kaffalameera',
    chipLate: 'Tureera',
    chipWaiting: 'Eegaa jira',
  },
};

export interface RightColumnCopy {
  whyDeadlineTitle: string;
  whyDeadlineDesc: string;
  latestReceiptTitle: string;
  openAuditLink: string;
  whyHumanTitle: string;
  whyHumanDesc: string;
  consensusReq: string;
  zeroRoundingTitle: string;
  zeroRoundingDesc: string;
  tamperTitle: string;
  tamperDesc: string;
  safetyTitle: string;
  safetyDesc: string;
}

export const rightColumnTranslations: Record<Locale, RightColumnCopy> = {
  en: {
    whyDeadlineTitle: 'Why this deadline?',
    whyDeadlineDesc: 'Deadlines use Arc Testnet block timestamps. If a contribution arrives within the 2-hour grace period, it may be accepted by consensus.',
    latestReceiptTitle: 'Latest confirmed receipt',
    openAuditLink: 'Open public audit view >>',
    whyHumanTitle: 'Why human approvals?',
    whyHumanDesc: 'EqubFlow pairs an AI assistant that analyzes discrepancies with a deterministic safety gate. Model recommendations never move funds without rule verification and group consensus.',
    consensusReq: 'Consensus requirement: 2 approvals',
    zeroRoundingTitle: 'Zero Rounding Policy',
    zeroRoundingDesc: 'Every difference is recorded to the exact 6-decimal USDC base unit. Differences are never rounded away or absorbed into fee margins.',
    tamperTitle: 'Cryptographic Tamper-Evidence',
    tamperDesc: 'Every record entry contains the SHA-256 hash of the preceding entry. Modifying any historical row breaks the cryptographic chain for all subsequent entries.',
    safetyTitle: 'Safety Architecture',
    safetyDesc: 'Built for Tameion Agents Hackathon on Arc Testnet. Funds are held in a deterministic safety gate.',
  },
  am: {
    whyDeadlineTitle: 'ይህ የጊዜ ገደብ ለምን አስፈለገ?',
    whyDeadlineDesc: 'የጊዜ ገደቦች የArc Testnet ብሎክ የጊዜ ማህተምን ይጠቀማሉ። መዋጮው በ2 ሰዓታት የይቅርታ ጊዜ ውስጥ ከደረሰ፣ በአባላት ይሁንታ ሊጸድቅ ይችላል።',
    latestReceiptTitle: 'የቅርብ ጊዜ የተረጋገጠ ደረሰኝ',
    openAuditLink: 'ይፋዊ የኦዲት መረጃ ይመልከቱ >>',
    whyHumanTitle: 'የሰው ውሳኔ ለምን አስፈለገ?',
    whyHumanDesc: 'EqubFlow ልዩነቶችን የሚመረምር የAI ረዳት ካልተማከለ የደህንነት በር ጋር አጣምሮ ይዟል። የረዳቱ ሃሳቦች ያለ ህግ ማረጋገጫ እና የአባላት ይሁንታ ገንዘብ አያንቀሳቅሱም።',
    consensusReq: 'የምልዓተ ጉባኤ መስፈርት: 2 ይሁንታዎች',
    zeroRoundingTitle: 'የማጠጋጋት መመሪያ የለም',
    zeroRoundingDesc: 'እያንዳንዱ ልዩነት በትክክለኛ ባለ 6-አሃዝ ዴሲማል USDC ይሰላል። ልዩነቶች በጭራሽ አይጠጋጉም ወይም በአገልግሎት ክፍያ ውስጥ አይድበሰበሱም።',
    tamperTitle: 'ሳይበረዝ የተጠበቀ የሃሽ ሰንሰለት',
    tamperDesc: 'እያንዳንዱ የምዝገባ መስመር የቀደመውን መስመር የSHA-256 አሻራ ይይዛል። የትኛውንም የኋላ መረጃ መቀየር ተከታዩን የሃሽ ሰንሰለት ያፈርሰዋል።',
    safetyTitle: 'የደህንነት መዋቅር',
    safetyDesc: 'ለTameion Agents Hackathon በArc Testnet ላይ የተሰራ። ገንዘብ በማይጣስ የደህንነት በር ውስጥ ይጠበቃል።',
  },
  om: {
    whyDeadlineTitle: 'Yeroon daangaa kun maaliif ta\'e?',
    whyDeadlineDesc: 'Daangaan yeroo mallattoo yeroo bilookii Arc Testnet fayyadama. Gumaatni yeroo dhiifamaa sa\'aatii 2 keessatti yoo dhufe, walii galteen fudhatamuu danda\'a.',
    latestReceiptTitle: 'Nagahee dhihoo mirkanaa\'e',
    openAuditLink: 'Galmee qorannoo banaa ilaali >>',
    whyHumanTitle: 'Murtii namaa maaliif barbaachise?',
    whyHumanDesc: 'EqubFlow gargaaraa AI garaagarummaa qoratu balbala nageenyaa murtaa\'aa wajjin walitti qabata. Yaanni gargaaraa heyyama seeraa fi miseensotaa malee qarshii hin sochoosu.',
    consensusReq: 'Ulaagaa walii galtee: mirkaneessa 2',
    zeroRoundingTitle: 'Imaammata Siirsuu Dhabuu',
    zeroRoundingDesc: 'Garaagarummaan hundi herrega USDC desimaalii 6 qabuun qabama. Garaagarummaan gonkumaa hin siirfamu yookiin kaffaltii keessatti hin dhokfamu.',
    tamperTitle: 'Mirkaneessa Eegumsa Kiriiptoo',
    tamperDesc: 'Galmeen hundinuu mallattoo SHA-256 isa duraa of keessatti qabata. Galmee darbe jijjiiruun sanjata isa boodaa hunda balleessa.',
    safetyTitle: 'Ijaarsa Nageenyaa',
    safetyDesc: 'Tameion Agents Hackathoniif Arc Testnet irratti kan hojjetame. Qarshiin balbala nageenyaa keessatti eegama.',
  },
};
