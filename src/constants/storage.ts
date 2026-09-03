import type { Settings } from '../types/settings'

export const STORAGE_KEY = 'cet6-vocab:state'

export const SCHEMA_VERSION = 1 as const

// 与 package.json 的 version 绑定，测试负责在两者脱钩时变红。
export const APP_VERSION = '0.1.0' as const

// 新用户第一次加载时的出厂设置；updatedAt: 0 表示从未修改。冻结共享常量，修改前必须复制。
export const DEFAULT_SETTINGS = Object.freeze({
  targetWordCount: 2500,
  preferredMode: 'flashcard',
  autoPronounce: false,
  updatedAt: 0,
} satisfies Settings)
