<script setup lang="ts">
import { rootRouteList } from '@/constants'

const active = ref(0)
const route = useRoute()

const TABS = [
  { to: '/', icon: 'home-o', label: '今日' },
  { to: '/progress', icon: 'bar-chart-o', label: '进度' },
  { to: '/settings', icon: 'setting-o', label: '设置' },
] as const

const show = computed(() => {
  if (route.name && rootRouteList.includes(route.name)) {
    return true
  }
  return false
})
</script>

<template>
  <van-tabbar v-if="show" v-model="active" route placeholder>
    <van-tabbar-item
      v-for="tab in TABS"
      :key="tab.to"
      replace
      :to="tab.to"
      :icon="tab.icon"
    >
      {{ tab.label }}
    </van-tabbar-item>
  </van-tabbar>
</template>
