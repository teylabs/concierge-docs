import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import './custom.css'

// The pre-1.0 notice rides in `layout-top`, above the nav, so it is on every
// route rather than only on the pages a reader enters through.
export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'layout-top': () => h('div', { class: 'stability-banner' }, 'Concierge is pre-1.0. Minor releases may change the API until 1.0.'),
  }),
} satisfies Theme
