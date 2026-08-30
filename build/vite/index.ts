import { unheadVueComposablesImports } from '@unhead/vue'
import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import Components from 'unplugin-vue-components/vite'
import { VueRouterAutoImports } from 'vue-router/unplugin'
import VueRouter from 'vue-router/vite'
import { VitePWA } from 'vite-plugin-pwa'
import VueDevTools from 'vite-plugin-vue-devtools'
import { createViteVConsole } from './vconsole.ts'

const VUE_COMPONENT_INCLUDE = [/\.vue$/, /\.vue\?vue/]
const AUTO_IMPORT_INCLUDE = [
  /\.[tj]sx?$/,
  /\.vue$/,
  /\.vue\?vue/,
]

export function createVitePlugins(mode: string) {
  return [
    VueRouter({
      extensions: ['.vue'],
      routesFolder: 'src/pages',
      dts: 'src/types/route-map.d.ts',
    }),

    vue(),

    // https://github.com/antfu/unplugin-vue-components
    Components({
      extensions: ['vue'],
      resolvers: [VantResolver()],
      include: VUE_COMPONENT_INCLUDE,
      dts: 'src/types/components.d.ts',
    }),

    // https://github.com/antfu/unplugin-auto-import
    AutoImport({
      include: AUTO_IMPORT_INCLUDE,
      imports: [
        'vue',
        '@vueuse/core',
        VueRouterAutoImports,
        {
          'vue-router/auto': ['useLink'],
        },
        unheadVueComposablesImports,
      ],
      dts: 'src/types/auto-imports.d.ts',
      dirs: [
        'src/composables',
      ],
      resolvers: [VantResolver()],
    }),

    legacy({
      targets: ['defaults', 'not IE 11'],
    }),

    // https://github.com/vadxq/vite-plugin-vconsole
    createViteVConsole(mode),

    // https://github.com/vuejs/devtools-next
    VueDevTools(),

    // https://github.com/antfu/vite-plugin-pwa
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '六级词汇',
        short_name: '六级词汇',
        description: '六级词汇背记工具',
        lang: 'zh-CN',
        // 与 --bg / --surface 保持一致，见 src/styles/tokens.less
        theme_color: '#F1F2ED',
        background_color: '#F1F2ED',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ]
}
