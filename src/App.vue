<script setup lang="ts">
import { appDescription, appName } from '@/constants'
import { useRouteCacheStore } from '@/stores'

// theme-color 只能是真实颜色字符串，meta 标签不认 var()。
// 所以运行时从 --bg 读出来，避免在这里抄一份十六进制值（工程规范.md 2.4）。
const themeColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--bg')
  .trim()

useHead({
  title: appName,
  meta: [
    { name: 'description', content: appDescription },
    { name: 'theme-color', content: themeColor },
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  ],
})

const routeCacheStore = useRouteCacheStore()

const keepAliveRouteNames = computed(() => {
  return routeCacheStore.routeCaches
})
</script>

<template>
  <!--
    只用 theme 属性锁定浅色，不用 theme-vars。
    主题变量统一在 src/styles/var.less 里改，理由见 技术选型.md 第二节。
  -->
  <van-config-provider theme="light">
    <nav-bar />
    <router-view v-slot="{ Component }">
      <section class="app-wrapper">
        <keep-alive :include="keepAliveRouteNames">
          <component :is="Component" />
        </keep-alive>
      </section>
    </router-view>
    <tab-bar />
  </van-config-provider>
</template>

<style scoped>
.app-wrapper {
  width: 100%;
  position: relative;
  padding: var(--s5) var(--s5) var(--s7);
}
</style>
