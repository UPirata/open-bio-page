import type { IBio } from '@/content/bio'

const modules = import.meta.glob<{ default: IBio }>('@content/bios/*.json', { eager: true })

export const bios: Record<string, IBio> = Object.fromEntries(
  Object.values(modules).map((m) => [m.default.slug, m.default]),
)

export const bioSlugs: string[] = Object.keys(bios)

/** When the site has exactly one profile, that profile is the home page. */
export const isSingleProfile = bioSlugs.length === 1
export const DEFAULT_SLUG = isSingleProfile ? bioSlugs[0]! : 'massimo'

export function getBio(slug: string | undefined): IBio | undefined {
  return slug ? bios[slug] : undefined
}
