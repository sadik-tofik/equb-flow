import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    // Completely overwrite default colors so default tailwind colors cannot compile
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      paper: {
        0: 'var(--paper-0)',
        1: 'var(--paper-1)',
        2: 'var(--paper-2)',
      },
      ink: {
        900: 'var(--ink-900)',
        700: 'var(--ink-700)',
        500: 'var(--ink-500)',
      },
      line: 'var(--line)',
      spruce: {
        700: 'var(--spruce-700)',
        600: 'var(--spruce-600)',
        100: 'var(--spruce-100)',
      },
      persimmon: {
        700: 'var(--persimmon-700)',
        600: 'var(--persimmon-600)',
        100: 'var(--persimmon-100)',
      },
      slate: {
        600: 'var(--slate-600)',
        100: 'var(--slate-100)',
      },
      ochre: {
        700: 'var(--ochre-700)',
        100: 'var(--ochre-100)',
      },
      brick: {
        700: 'var(--brick-700)',
        100: 'var(--brick-100)',
      },
      scrim: 'var(--scrim)',
    },
    // No drop shadows
    boxShadow: {
      none: 'none',
    },
    // Controlled radius: 0 for slips/tables/sheets, 2px for controls, full only for monogram circle
    borderRadius: {
      none: '0',
      DEFAULT: '0',
      sm: '2px',
      full: '9999px',
    },
    screens: {
      sm: '360px',
      md: '480px',
      lg: '768px',
      xl: '1024px',
      '2xl': '1280px',
      '3xl': '1536px',
    },
    extend: {
      fontFamily: {
        display: ['var(--font-newsreader)', 'Newsreader', 'Georgia', 'serif'],
        sans: ['var(--font-instrument-sans)', 'Instrument Sans', 'system-ui', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        meta: ['14px', { lineHeight: '20px' }],
        secondary: ['16px', { lineHeight: '24px' }],
        body: ['18px', { lineHeight: '27px' }],
        lead: ['22px', { lineHeight: '30px' }],
        h3: ['28px', { lineHeight: '34px' }],
        h2: ['36px', { lineHeight: '42px' }],
        amount: ['44px', { lineHeight: '48px' }],
      },
      zIndex: {
        base: '0',
        sticky: '10',
        nav: '20',
        'sheet-scrim': '30',
        sheet: '40',
        toast: '50',
        'skip-link': '100',
      },
      transitionDuration: {
        instant: '90ms',
        fast: '160ms',
        base: '240ms',
        story: '750ms',
      },
      transitionTimingFunction: {
        'ease-out-ledger': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'ease-in-out-ledger': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
