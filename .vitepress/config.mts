import { defineConfig } from 'vitepress'
import { creditLine } from './credit.mjs'
import { publishMarkdown } from '../scripts/llms.mjs'

const description = 'A standard suite of essentials for every Laravel app you build.'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  async buildEnd(config) {
    await publishMarkdown({ sidebar: config.site.themeConfig.sidebar, srcDir: config.srcDir, outDir: config.outDir })
  },
  title: 'Concierge for Laravel',
  description,
  lang: 'en-CA',

  // Pages live in docs/; the repository root keeps its README and the brand kit.
  srcDir: 'docs',

  // GitHub Pages resolves /guide/installation → /guide/installation.html.
  cleanUrls: true,
  lastUpdated: true,

  markdown: {
    config(md) {
      /*
       * Fenced code is already compiled with v-pre; inline code gets it too,
       * so Vue leaves any `{{ … }}` in it alone. (Changing Vue's delimiters
       * instead would also apply to the theme's own templates and break the
       * nav and outline.)
       */
      const codeInline = md.renderer.rules.code_inline!
      md.renderer.rules.code_inline = (tokens, idx, options, env, self) =>
        codeInline(tokens, idx, options, env, self).replace(/^<code/, '<code v-pre')

      /*
       * Code block memo: `memo="app/Providers/AppServiceProvider.php"` names
       * where the snippet lives, and `at="boot()"` says where in that file,
       * drawn after the path as `path → boot()`. `at` needs a `memo`. Both are
       * stripped before code-group titles are read, since a memo may contain
       * [brackets].
       */
      const takeAttribute = (token: any, name: string): string | undefined => {
        const start = new RegExp(`(?:^|\\s)${name}=`).exec(token.info)
        if (!start) return undefined
        const value = new RegExp(`^${name}="([^"]*)"(?=\\s|$)`).exec(token.info.slice(start.index).trimStart())
        if (!value || !value[1].trim()) {
          throw new Error(`Code ${name} requires a non-empty, double-quoted value: ${name}="…"`)
        }
        token.info = token.info.slice(0, start.index) + token.info.slice(start.index).replace(new RegExp(`^(\\s*)${name}="[^"]*"`), '$1')
        if (new RegExp(`(?:^|\\s)${name}=`).test(token.info)) throw new Error(`Only one ${name} is allowed per code block`)
        return value[1]
      }

      md.core.ruler.push('code-memo', (state) => {
        for (const token of state.tokens) {
          if (token.type !== 'fence') continue
          const memo = takeAttribute(token, 'memo')
          const at = takeAttribute(token, 'at')
          if (at !== undefined && memo === undefined) throw new Error('Code at="…" needs a memo="…" to sit beside')
          if (memo !== undefined) token.meta = { ...token.meta, memo, at }
        }

        // A code group whose tabs all carry the same memo shows it once, above
        // the tabs: it's one file written two ways. Different memos stay per tab.
        const tokens = state.tokens
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i].type !== 'container_code-group_open') continue
          const fences = []
          for (let j = i + 1; j < tokens.length && tokens[j].type !== 'container_code-group_close'; j++) {
            if (tokens[j].type === 'fence') fences.push(tokens[j])
          }
          const first = fences[0]?.meta?.memo
          const same = first !== undefined && fences.every((f) => f.meta?.memo === first && f.meta?.at === fences[0].meta?.at)
          if (!same) continue
          tokens[i].meta = { ...tokens[i].meta, memo: first, at: fences[0].meta.at }
          for (const f of fences) f.meta = { ...f.meta, memo: undefined, at: undefined }
        }
      })

      const memoBar = (memo: string, at?: string) =>
        `<div class="code-memo__bar" v-pre><span class="code-memo__file">${md.utils.escapeHtml(memo)}</span>`
        + (at ? `<span class="code-memo__at">${md.utils.escapeHtml(at)}</span>` : '')
        + '</div>'

      const groupOpen = md.renderer.rules['container_code-group_open']!
      md.renderer.rules['container_code-group_open'] = (tokens, idx, options, env, self) => {
        const html = groupOpen(tokens, idx, options, env, self)
        const { memo, at } = tokens[idx].meta ?? {}
        if (memo === undefined) return html
        return html.replace('<div class="vp-code-group">', `<div class="vp-code-group code-memo-group">${memoBar(memo, at)}`)
      }

      const fence = md.renderer.rules.fence!
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const { memo, at } = tokens[idx].meta ?? {}
        const html = fence(tokens, idx, options, env, self)
        if (memo === undefined) return html
        // Keep button → language → pre siblings intact for VitePress's copy handler.
        return html.replace(/^(<div class="[^"]*)"([^>]*>)/,
          (_, opening, closing) => `${opening} code-memo"${closing}${memoBar(memo, at)}`)
      }
    },
  },

  // Brand files come from brand/build.mjs. Bump ?v= whenever one changes:
  // the CDN caches icons and images for hours.
  head: [
    // The .ico (16, 32 and 48 px inside) for older browsers; sizes="32x32" keeps
    // modern ones on the SVG, which follows the tab's light or dark scheme.
    ['link', { rel: 'icon', href: '/favicon.ico?v=1', sizes: '32x32' }],
    ['link', { rel: 'icon', href: '/favicon.svg?v=1', type: 'image/svg+xml' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png?v=1' }],
    ['meta', { name: 'author', content: 'Jasper Tey' }],
    ['meta', { property: 'og:site_name', content: 'Concierge for Laravel' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://concierge.teylabs.com/' }],
    ['meta', { property: 'og:title', content: 'Concierge: Front of House for Laravel' }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:image', content: 'https://concierge.teylabs.com/og-image.jpg?v=1' }],
    ['meta', { property: 'og:image:width', content: '2400' }],
    ['meta', { property: 'og:image:height', content: '1200' }],
    ['meta', { property: 'og:image:type', content: 'image/jpeg' }],
    ['meta', { property: 'og:image:alt', content: 'Concierge: a standard suite of essentials for every Laravel app you build. The Concierge mark, a square frame open at one corner with a small piece set in it, beside composer require tey/concierge and the artisan commands that follow it.' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://concierge.teylabs.com/og-image.jpg?v=1' }],
  ],

  themeConfig: {
    logo: { light: '/logo-light.svg?v=1', dark: '/logo-dark.svg?v=1', alt: 'Concierge' },

    nav: [
      { text: 'Guide', link: '/guide/introduction', activeMatch: '^/(guide|features)/' },
      { text: 'Reference', link: '/reference/configuration', activeMatch: '^/reference/' },
      { text: 'What concierge covers', link: '/roadmap', activeMatch: '^/roadmap' },
      { text: 'Changelog', link: 'https://github.com/teylabs/concierge/blob/main/CHANGELOG.md' },
    ],

    // The whole spine, visible from any page. Every entry resolves: a page
    // enters the sidebar when it is written, never as a placeholder.
    sidebar: [
      {
        text: 'Getting started',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Installation', link: '/guide/installation' },
        ],
      },
      {
        // One page per shipped feature, in the order an app usually adopts them.
        text: 'Features',
        items: [
          { text: 'Membership', link: '/features/membership' },
          { text: 'App-wide mode', link: '/features/app-wide-mode' },
          { text: 'Starter kit teams', link: '/features/starter-kit-teams' },
          { text: 'Tenant invitations', link: '/features/tenant-invitations' },
          { text: 'Registration', link: '/features/registration' },
          { text: 'Users', link: '/features/users' },
          { text: 'Forced password reset', link: '/features/forced-password-reset' },
          { text: 'Local login', link: '/features/local-login' },
          { text: 'Vue pages', link: '/features/vue-pages' },
          { text: 'Avatars', link: '/features/avatars' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Configuration', link: '/reference/configuration' },
          { text: 'Actions and events', link: '/reference/actions-and-events' },
        ],
      },
      {
        text: 'Roadmap',
        items: [
          { text: 'What concierge covers', link: '/roadmap' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/teylabs/concierge' },
    ],

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/teylabs/concierge-docs/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    outline: [2, 3],

    footer: {
      message: 'Released under the MIT License. Created by <a href="https://github.com/jaspertey">Jasper Tey</a>.',
      copyright: creditLine,
    },
  },
})
