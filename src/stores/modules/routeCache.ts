import { defineStore } from 'pinia'
import type { RouteLocationNormalized, RouteRecordName } from 'vue-router'

// 只有本文件用到，按 工程规范.md 1.2 不进 src/types/
type EnhancedRouteLocation = RouteLocationNormalized & {
  meta: { keepAlive?: boolean }
}

const useRouteCacheStore = defineStore('route-cache', () => {
  const routeCaches = ref<RouteRecordName[]>([])

  const addRoute = (route: EnhancedRouteLocation) => {
    if (routeCaches.value.includes(route.name))
      return

    if (route?.meta?.keepAlive)
      routeCaches.value.push(route.name)
  }

  return {
    routeCaches,
    addRoute,
  }
})

export default useRouteCacheStore
