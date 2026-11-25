import { computed, nextTick, ref } from 'vue'

import i18next from 'i18next'

import { en } from './locales/en'
import { it } from './locales/it'
import { RTL_LOCALES, buildLocaleMap, pickLocale } from './locales'
import { UI_STRINGS } from './translations'
import type { IUiStrings } from './translations'

export type TLocaleCode = string

declare global {
  interface Window {
    /** Set by the inline <head> script (see vite.config.ts) before the app boots. */
    __LOCALE__?: string
  }
}

/** Language chosen from the browser's preferences; English when nothing matches. No UI to change it. */
export function detectLocale(): string {
  if (typeof navigator === 'undefined') {
    return 'en'
  }
  if (typeof window !== 'undefined' && window.__LOCALE__) {
    return window.__LOCALE__
  }
  const list = navigator.languages?.length ? navigator.languages : [navigator.language]
  return pickLocale(list, buildLocaleMap())
}

void i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'it'],
  resources: {
    en: { translation: en },
    it: { translation: it },
  },
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
})

// Always start in English so the client hydrates the prerendered markup without mismatches;
// the real language is applied right after mount (the inline script hides the page until then).
const currentLocale = ref<string>('en')

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.includes(locale)
}

export function syncBrowserLocale(): void {
  const detected = detectLocale()
  currentLocale.value = detected
  if (typeof document !== 'undefined') {
    document.documentElement.lang = detected === 'sr' ? 'sr' : detected
    document.documentElement.dir = isRtl(detected) ? 'rtl' : 'ltr'
    // Reveal the page once Vue has rendered the translated text.
    void nextTick(() => requestAnimationFrame(() => document.documentElement.classList.remove('i18n-pending')))
  }
}

function t(key: string, fallback?: string): string {
  const lng = currentLocale.value === 'it' ? 'it' : 'en'
  const value: unknown = i18next.t(key, { lng, defaultValue: fallback })
  return typeof value === 'string' ? value : key
}

type TUiKey = Exclude<keyof IUiStrings, 'banner'>

/** Translated UI string for the current locale (English when the bundle lacks it). */
export function uiString(key: TUiKey, locale: string = currentLocale.value, vars?: Record<string, string>): string {
  const raw = UI_STRINGS[locale]?.[key] ?? UI_STRINGS.en![key]
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m) : raw
}

export function useI18n() {
  return {
    t,
    ui: (key: TUiKey, vars?: Record<string, string>) => uiString(key, currentLocale.value, vars),
    locale: computed(() => currentLocale.value),
    dir: computed(() => (isRtl(currentLocale.value) ? 'rtl' : 'ltr')),
  }
}
