import type { LoadResult, PersistedEnvelope } from '../types/storage'
import type { StudyMode, StudySession } from '../types/study'
import type { Timestamp } from '../types/review'
import type { Word, WordId } from '../types/word'

import { buildStudyQueue, createStudySession, isSessionFinished } from './study-session.ts'

/**
 * 恢复判定结果：
 * - persist: false —— 读取失败（损坏/未来版本等），任何写盘都可能破坏磁盘既有数据，
 *   只允许在内存新建会话。
 * - persist: true —— 可以走 loadState/saveState 持久化；envelope 是后续写入的基础。
 */
export type SessionRecoveryPlan
  = | { persist: false, session: StudySession, restored: false }
    | { persist: true, session: StudySession, restored: boolean, envelope: PersistedEnvelope }

export interface SessionRecoveryInput {
  loadResult: LoadResult
  library: readonly Word[]
  mode: StudyMode
  sessionId: string
  now: Timestamp
}

export function planSessionRecovery(input: SessionRecoveryInput): SessionRecoveryPlan {
  if (input.loadResult.status === 'error')
    return { persist: false, session: createNewSession(input), restored: false }

  const envelope = input.loadResult.envelope
  const active = envelope.data.activeSession

  if (
    active !== null
    && active.mode === input.mode
    && active.status === 'active'
    && !isSessionFinished(active)
    && queueWithinLibrary(active.queue, input.library)
  ) {
    return { persist: true, session: active, restored: true, envelope }
  }

  const fresh = createNewSession(input)
  return {
    persist: true,
    session: fresh,
    restored: false,
    envelope: withActiveSession(envelope, fresh, input.now),
  }
}

/**
 * 不可变地把会话写入信封：只改 data.activeSession 与 savedAt，
 * settings / progress / scheduler 原样透传（读取保留旧 scheduler 元数据是 P1-3 冻结契约）。
 */
export function withActiveSession(
  envelope: PersistedEnvelope,
  session: StudySession,
  savedAt: Timestamp,
): PersistedEnvelope {
  return {
    ...envelope,
    savedAt,
    data: {
      ...envelope.data,
      activeSession: session,
    },
  }
}

function createNewSession(input: SessionRecoveryInput): StudySession {
  return createStudySession({
    id: input.sessionId,
    mode: input.mode,
    queue: buildStudyQueue(input.library),
    startedAt: input.now,
  })
}

function queueWithinLibrary(queue: readonly WordId[], library: readonly Word[]): boolean {
  const ids = new Set(library.map(word => word.id))
  return queue.every(id => ids.has(id))
}
