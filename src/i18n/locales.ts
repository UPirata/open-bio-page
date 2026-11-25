/** The 55 locales of Reactive Resume (https://github.com/AmruthPillai/Reactive-Resume), minus its zu-ZA pseudo-locale. */
export const REACTIVE_RESUME_LOCALES_TABLE: readonly (readonly [string, string])[] = [
  ['af-ZA', 'af'],
  ['am-ET', 'am'],
  ['ar-SA', 'ar'],
  ['az-AZ', 'az'],
  ['bg-BG', 'bg'],
  ['bn-BD', 'bn'],
  ['ca-ES', 'ca'],
  ['cs-CZ', 'cs'],
  ['da-DK', 'da'],
  ['de-DE', 'de'],
  ['el-GR', 'el'],
  ['en-US', 'en'],
  ['en-GB', 'en'],
  ['es-ES', 'es'],
  ['fa-IR', 'fa'],
  ['fi-FI', 'fi'],
  ['fr-FR', 'fr'],
  ['he-IL', 'he'],
  ['hi-IN', 'hi'],
  ['hu-HU', 'hu'],
  ['hy-AM', 'hy'],
  ['id-ID', 'id'],
  ['it-IT', 'it'],
  ['ja-JP', 'ja'],
  ['km-KH', 'km'],
  ['kn-IN', 'kn'],
  ['ko-KR', 'ko'],
  ['lt-LT', 'lt'],
  ['lv-LV', 'lv'],
  ['ml-IN', 'ml'],
  ['mr-IN', 'mr'],
  ['ms-MY', 'ms'],
  ['ne-NP', 'ne'],
  ['nl-NL', 'nl'],
  ['no-NO', 'no'],
  ['or-IN', 'or'],
  ['pl-PL', 'pl'],
  ['pt-BR', 'pt-BR'],
  ['pt-PT', 'pt-PT'],
  ['ro-RO', 'ro'],
  ['ru-RU', 'ru'],
  ['sk-SK', 'sk'],
  ['sl-SI', 'sl'],
  ['sq-AL', 'sq'],
  ['sr-SP', 'sr'],
  ['sv-SE', 'sv'],
  ['ta-IN', 'ta'],
  ['te-IN', 'te'],
  ['th-TH', 'th'],
  ['tr-TR', 'tr'],
  ['uk-UA', 'uk'],
  ['uz-UZ', 'uz'],
  ['vi-VN', 'vi'],
  ['zh-CN', 'zh-CN'],
  ['zh-TW', 'zh-TW'],
]

/** Locales written right-to-left. */
export const RTL_LOCALES: readonly string[] = ['ar', 'fa', 'he']

/** Bundle id used when nothing matches. */
export const DEFAULT_LOCALE = 'en'

/** Distinct translation bundles (en-US and en-GB share `en`). */
export const LOCALE_IDS: readonly string[] = [...new Set(REACTIVE_RESUME_LOCALES_TABLE.map(([, id]) => id))]

/** Open Graph locale (en_US, pt_BR, ...) of a bundle id. */
export function ogLocaleOf(id: string): string {
  const row = REACTIVE_RESUME_LOCALES_TABLE.find(([, bundle]) => bundle === id)
  const code = row ? row[0] : 'en-US'
  return (code === 'sr-SP' ? 'sr-RS' : code).replace('-', '_')
}

/**
 * Lower-cased browser language tag -> bundle id. Same rules as Reactive Resume
 * (exact tag, then same base language) plus a few common aliases.
 */
export function buildLocaleMap(): Record<string, string> {
  const map: Record<string, string> = {}
  // Base language: the first locale listed for it wins (pt -> pt-BR).
  for (const [code, id] of REACTIVE_RESUME_LOCALES_TABLE) {
    const base = code.split('-')[0]!.toLowerCase()
    if (!(base in map)) {
      map[base] = id
    }
  }
  for (const [code, id] of REACTIVE_RESUME_LOCALES_TABLE) {
    map[code.toLowerCase()] = id
  }
  Object.assign(map, {
    nb: 'no',
    nn: 'no',
    iw: 'he',
    'zh-hans': 'zh-CN',
    'zh-sg': 'zh-CN',
    'zh-hant': 'zh-TW',
    'zh-hk': 'zh-TW',
    'zh-mo': 'zh-TW',
    'sr-latn': 'sr',
    'sr-cyrl': 'sr',
  })
  return map
}

/**
 * Picks the bundle id for the browser's ordered language preferences: for each
 * language try the exact tag, then shorter tags (zh-Hant-TW -> zh-Hant -> zh),
 * and fall back to English. Self-contained on purpose: the build serialises it
 * into the inline <head> script, so it must not reference anything outside.
 */
export function pickLocale(languages: readonly string[], map: Record<string, string>): string {
  for (let i = 0; i < languages.length; i++) {
    let tag = String(languages[i] || '')
      .toLowerCase()
      .replace(/_/g, '-')
    while (tag) {
      if (Object.prototype.hasOwnProperty.call(map, tag)) {
        return map[tag]!
      }
      const cut = tag.lastIndexOf('-')
      tag = cut > 0 ? tag.slice(0, cut) : ''
    }
  }
  return 'en'
}
