import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import type { ViteSSGOptions } from 'vite-ssg'

import { RTL_LOCALES, buildLocaleMap, pickLocale } from './src/i18n/locales'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const CONTENT_DIR = path.resolve(ROOT, process.env.OBP_CONTENT_DIR || 'content')
const PUBLIC_DIR = path.resolve(ROOT, process.env.OBP_PUBLIC_DIR || 'public')
const OUT_DIR = path.resolve(ROOT, process.env.OBP_OUT_DIR || 'dist')
const BASE = process.env.OBP_BASE || '/'
if (!BASE.startsWith('/') || !BASE.endsWith('/')) {
  throw new Error(`OBP_BASE must start and end with "/", got "${BASE}"`)
}

function bioRoutes(): string[] {
  const dir = path.join(CONTENT_DIR, 'bios')
  const slugs = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''))
  return [
    '/',
    '/privacy',
    '/cookie-policy',
    ...slugs.flatMap((slug) => [`/${slug}`, `/${slug}/export`]),
  ]
}

/**
 * Picks the visitor's language from navigator.languages before first paint, so the page never
 * flashes in the wrong language. It runs on the home page only (the legal pages have their own
 * detection); non-English visitors get the page hidden until Vue has swapped in the translation
 * (2.5 s failsafe). There is deliberately no language switcher.
 */
function browserLocalePlugin(): Plugin {
  const script = `(function(){try{var pick=${pickLocale.toString()};var map=${JSON.stringify(buildLocaleMap())};var rtl=${JSON.stringify(RTL_LOCALES)};var l=navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language];var id=pick(l,map);window.__LOCALE__=id;var p=location.pathname;if(id!=='en'&&(p===${JSON.stringify(BASE)}||p===${JSON.stringify(BASE + 'index.html')})){var d=document.documentElement;d.lang=id;d.dir=rtl.indexOf(id)>-1?'rtl':'ltr';d.classList.add('i18n-pending');setTimeout(function(){d.classList.remove('i18n-pending')},2500)}}catch(e){}})()`
  return {
    name: 'obp-browser-locale',
    transformIndexHtml() {
      return [
        { tag: 'style', children: 'html.i18n-pending body{visibility:hidden}', injectTo: 'head-prepend' },
        { tag: 'script', children: script, injectTo: 'head-prepend' },
      ]
    },
  }
}

const config: UserConfig & { ssgOptions?: ViteSSGOptions } = {
  base: BASE,
  publicDir: PUBLIC_DIR,
  build: { target: 'es2022', outDir: OUT_DIR },
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [
    browserLocalePlugin(),
    tailwindcss(),
    vue({
      template: {
        /**
         * compiler-sfc is loaded from Bun's package cache. Its own require("pug")
         * starts there and never sees this project's dependency.
         */
        preprocessCustomRequire(lang: string) {
          if (lang !== 'pug') {
            throw new Error(`Unsupported template lang: ${lang}`)
          }
          return createRequire(fileURLToPath(new URL('./package.json', import.meta.url)))('pug')
        },
      },
    }),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@content': CONTENT_DIR,
    },
  },
  ssgOptions: {
    includedRoutes: () => bioRoutes(),
    beastiesOptions: { publicPath: BASE },
  },
}

export default defineConfig(config)
