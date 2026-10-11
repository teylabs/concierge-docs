import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue'
import './custom.css'

// The pre-1.0 notice rides in `layout-top`, above the nav, so it is on every
// route rather than only on the pages a reader enters through. The nav is
// fixed, so the theme offsets it by --vp-layout-top-height; the notice sets
// that to its own height, which grows when the text wraps on a narrow screen.
const StabilityBanner = defineComponent({
  setup() {
    const el = ref<HTMLElement>()
    let observer: ResizeObserver | undefined

    onMounted(() => {
      const root = document.documentElement
      observer = new ResizeObserver(() => {
        root.style.setProperty('--vp-layout-top-height', `${el.value?.offsetHeight ?? 0}px`)
      })
      if (el.value) observer.observe(el.value)
    })

    onBeforeUnmount(() => {
      observer?.disconnect()
      document.documentElement.style.removeProperty('--vp-layout-top-height')
    })

    return () => h('div', { ref: el, class: 'stability-banner' }, 'Concierge is pre-1.0. Minor releases may change the API until 1.0.')
  },
})

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'layout-top': () => h(StabilityBanner),
  }),
} satisfies Theme
