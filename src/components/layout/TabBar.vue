<script setup lang="ts">
import { rootRouteList } from '@/constants'

const active = ref(0)
const route = useRoute()

const show = computed(() => {
  if (route.name && rootRouteList.includes(route.name)) {
    return true
  }
  return false
})
</script>

<template>
  <van-tabbar v-if="show" v-model="active" route placeholder>
    <van-tabbar-item replace to="/" icon="home-o">
      今日
    </van-tabbar-item>
    <van-tabbar-item replace to="/tokens" icon="brush-o">
      设计
    </van-tabbar-item>
  </van-tabbar>
</template>
