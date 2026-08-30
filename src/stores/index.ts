import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import useRouteCacheStore from './modules/routeCache'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export { useRouteCacheStore }
export default pinia
