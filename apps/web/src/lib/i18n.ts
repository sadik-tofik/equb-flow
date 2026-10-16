// apps/web/src/lib/i18n.ts
'use client';

import React from 'react';
import enMessages from '../../messages/en.json';
import amMessages from '../../messages/am.json';
import omMessages from '../../messages/om.json';

export type Locale = 'en' | 'am' | 'om';
export type MessageKey = keyof typeof enMessages;

const messageCatalog: Record<Locale, Record<string, string>> = {
  en: enMessages,
  am: amMessages,
  om: omMessages,
};

let globalLocale: Locale = 'en';

export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('equbflow_locale') as Locale | null;
    if (saved && (saved === 'en' || saved === 'am' || saved === 'om')) {
      return saved;
    }
  }
  return globalLocale;
}

export function setGlobalLocale(locale: Locale): void {
  globalLocale = locale;
  if (typeof window !== 'undefined') {
    localStorage.setItem('equbflow_locale', locale);
    document.documentElement.lang = locale;
  }
}

export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
  locale?: Locale
): string {
  const activeLocale = locale || getLocale();
  const dict = messageCatalog[activeLocale] || messageCatalog.en;
  let message = dict[key] || messageCatalog.en[key] || (key as string);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      message = message.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return message;
}

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = React.createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key, params) => t(key, params, 'en'),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>('en');

  React.useEffect(() => {
    const initial = getLocale();
    setLocaleState(initial);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = initial;
    }
  }, []);

  const changeLocale = React.useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setGlobalLocale(newLocale);
  }, []);

  const translate = React.useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => {
      return t(key, params, locale);
    },
    [locale]
  );

  return React.createElement(
    LanguageContext.Provider,
    { value: { locale, setLocale: changeLocale, t: translate } },
    children
  );
}

export function useLanguage() {
  return React.useContext(LanguageContext);
}
