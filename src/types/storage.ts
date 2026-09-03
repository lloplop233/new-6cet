import type { SCHEMA_VERSION } from '../constants/storage'
import type { FsrsParametersSnapshot, FsrsSchedulingState } from './fsrs'
import type { ReviewState, Timestamp } from './review'
import type { Settings } from './settings'
import type { StudySession } from './study'
import type { WordId } from './word'

/** 每条单词进度的持久化形态：业务状态与算法状态嵌套组合，序列化键集合不相交（P1-2 冻结契约）。 */
export interface WordProgress {
  review: ReviewState
  scheduling: FsrsSchedulingState
}

/** 读取旧数据时字段值可以与当前安装版本不同：元数据记录的是生成那批数据时所用的算法与参数。 */
export interface SchedulerMetadata {
  algorithm: string
  library: string
  libraryVersion: string
  parameters: FsrsParametersSnapshot
}

export interface PersistedData {
  settings: Settings
  progress: Partial<Record<WordId, WordProgress>>
  activeSession: StudySession | null
}

export interface PersistedEnvelope {
  schemaVersion: typeof SCHEMA_VERSION
  appVersion: string
  savedAt: Timestamp
  scheduler: SchedulerMetadata
  data: PersistedData
}

export type LoadFailureReason
  = | 'corrupted' // 内容不是合法 JSON
    | 'invalid' // 是 JSON 但不符合当前 schema 形状
    | 'future-version' // 数据来自更新的 schemaVersion，旧代码拒绝加载
    | 'migration-failed' // 迁移链缺失步骤、迁移抛错或产物非法
    | 'unavailable' // storage 读取本身抛错

export type SaveFailureReason
  = | 'serialize' // JSON.stringify 失败，未触碰 storage
    | 'quota' // setItem 抛配额类错误，旧值保持原样
    | 'unavailable' // setItem 抛其他错误（如隐私模式），旧值保持原样

export type LoadResult
  = | { status: 'fresh', envelope: PersistedEnvelope }
    | { status: 'loaded', envelope: PersistedEnvelope }
    | { status: 'error', reason: LoadFailureReason, raw: string | null }

export type SaveResult
  = | { status: 'saved' }
    | { status: 'error', reason: SaveFailureReason }

/** 把 schemaVersion 为 N 的数据变换为 N+1；函数自身负责写入新版本号。 */
export type Migration = (raw: Record<string, unknown>) => Record<string, unknown>

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}
