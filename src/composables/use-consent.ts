import 'vanilla-cookieconsent/dist/cookieconsent.css'

import * as CookieConsent from 'vanilla-cookieconsent'

import { LEGAL_LOCALES, legalContent } from '@/content/legal'
import type { LegalLocale } from '@/content/legal'
import { withBase } from '@/lib/base'
import { detectLocale } from '@/i18n'
import { RTL_LOCALES } from '@/i18n/locales'
import { UI_STRINGS } from '@/i18n/translations'
import type { IBannerStrings } from '@/i18n/translations'

import { setAnalyticsConsent } from './use-analytics'

type ConsentValue = 'granted' | 'denied'

// Window.dataLayer è già dichiarato in use-analytics.ts.
function gtag(...args: unknown[]): void {
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push(args as unknown as Record<string, unknown>)
}

/**
 * Consent Mode v2: tutto negato di default. DEVE essere eseguito prima che
 * GTM (e quindi GA4 / Meta Pixel) venga caricato — vedi ordine in main.ts.
 */
function setConsentDefaults(): void {
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    personalization_storage: 'denied',
    security_storage: 'granted',
    wait_for_update: 500,
  })
}

/** Propaga la scelta dell'utente a GA4/Pixel (Consent Mode) e a PostHog. */
function syncConsent(): void {
  const analytics = CookieConsent.acceptedCategory('analytics')
  const ads = CookieConsent.acceptedCategory('ads')

  const toValue = (granted: boolean): ConsentValue => (granted ? 'granted' : 'denied')

  gtag('consent', 'update', {
    analytics_storage: toValue(analytics),
    ad_storage: toValue(ads),
    ad_user_data: toValue(ads),
    ad_personalization: toValue(ads),
  })

  // Evento custom per i trigger GTM (Meta Pixel via cc_consent_update +
  // cc_advertisement). Inviato DOPO il consent update, così ad_storage è già
  // aggiornato quando il tag scatta.
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({
    event: 'cc_consent_update',
    cc_advertisement: ads,
    cc_analytics: analytics,
  })

  // PostHog vive fuori da GTM: opt-in/out diretto.
  setAnalyticsConsent(analytics)
}

/** Costruisce le traduzioni cookieconsent dai contenuti legali (5 lingue). */
function buildTranslation(b: Omit<IBannerStrings, 'cookiePolicyLabel' | 'privacyPolicyLabel'>, cookiePolicyLabel: string, privacyPolicyLabel: string) {
  const c = { cookiePolicyLabel, privacyPolicyLabel }
  return {
    consentModal: {
      title: b.title,
      description: b.description,
      acceptAllBtn: b.acceptAll,
      acceptNecessaryBtn: b.reject,
      showPreferencesBtn: b.preferences,
      footer: `<a href="${withBase('/cookie-policy')}">${c.cookiePolicyLabel}</a> · <a href="${withBase('/privacy')}">${c.privacyPolicyLabel}</a>`,
    },
    preferencesModal: {
      title: b.prefsTitle,
      acceptAllBtn: b.acceptAll,
      acceptNecessaryBtn: b.rejectAll,
      savePreferencesBtn: b.save,
      sections: [
        { title: b.necessaryTitle, description: b.necessaryDesc, linkedCategory: 'necessary' },
        { title: b.analyticsTitle, description: b.analyticsDesc, linkedCategory: 'analytics' },
        { title: b.marketingTitle, description: b.marketingDesc, linkedCategory: 'ads' },
      ],
    },
  }
}

export function showCookiePreferences(): void {
  CookieConsent.showPreferences()
}

export function initConsent(): void {
  if (typeof window === 'undefined') {
    return
  }

  setConsentDefaults()

  // Banner texts: the hand-written legal copy (en/it/ja/ru/uk) plus one bundle per other locale.
  const translations: Record<string, ReturnType<typeof buildTranslation>> = {}
  for (const [id, ui] of Object.entries(UI_STRINGS)) {
    if (ui.banner) {
      translations[id] = buildTranslation(ui.banner, ui.banner.cookiePolicyLabel, ui.banner.privacyPolicyLabel)
    }
  }
  for (const l of LEGAL_LOCALES) {
    const c = legalContent[l]
    translations[l] = buildTranslation(c.banner, c.cookiePolicyLabel, c.privacyPolicyLabel)
  }
  const detected = detectLocale()
  const language = detected in translations ? detected : 'en'

  void CookieConsent.run({
    guiOptions: {
      consentModal: { layout: 'box', position: 'bottom right', equalWeightButtons: true },
      preferencesModal: { layout: 'box', equalWeightButtons: true },
    },
    onFirstConsent: syncConsent,
    onConsent: syncConsent,
    onChange: syncConsent,
    categories: {
      necessary: {
        enabled: true,
        readOnly: true,
      },
      analytics: {
        autoClear: {
          cookies: [{ name: /^_ga/ }, { name: '_gid' }, { name: /^ph_/ }, { name: /^ph_phc_/ }],
        },
      },
      ads: {
        autoClear: {
          cookies: [{ name: '_fbp' }, { name: 'fr' }],
        },
      },
    },
    language: {
      default: language,
      translations,
      rtl: RTL_LOCALES.filter((id) => id in translations),
    },
  })
}
