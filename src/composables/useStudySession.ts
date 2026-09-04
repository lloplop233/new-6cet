import type { Ref } from 'vue'
import type { Rating } from '../types/review'
import type { StudyMode, StudySession } from '../types/study'
import type { PersistedEnvelope, StorageLike } from '../types/storage'
import type { WordId } from '../types/word'

import { MOCK_VOCABULARY } from '../constants/mock-vocabulary.ts'
import { getBrowserStorage, loadState, saveState } from '../services/storage.ts'
import { planSessionRecovery, withActiveSession } from '../utils/session-recovery.ts'
import { rateWord } from '../utils/study-session.ts'
import { ref } from 'vue'

/** 只读取存储里的会话，不新建、不写盘。完成页用（P2-3 D3）。 */
export function readPersistedSession(mode: StudyMode): StudySession | null {
  const storage = getBrowserStorage()
  if (storage === null)
    return null

  const result = loadState(storage)
  if (result.status !== 'loaded')
    return null

  const active = result.envelope.data.activeSession
  return active !== null && active.mode === mode ? active : null
}

export interface UseStudySession {
  session: Ref<StudySession | null>
  isPersisted: Ref<boolean>
  startOrRestore: (mode: StudyMode) => void
  rate: (wordId: WordId, rating: Rating) => void
}

/**
 * 学习页的薄胶水层：决策逻辑在 utils/session-recovery 纯函数里，
 * 这里只做 getBrowserStorage / loadState / saveState 调用和 ref 持有。
 * 时间只在 composable 这一层取（P1-2 时间纪律）。
 */
export function useStudySession(): UseStudySession {
  const session = ref<StudySession | null>(null)
  const isPersisted = ref(false)

  let storage: StorageLike | null = null
  let envelope: PersistedEnvelope | null = null

  // 写失败（配额 / 隐私模式）不阻塞学习：降级为内存会话继续用。
  function persist(next: PersistedEnvelope): void {
    if (storage === null)
      return

    const result = saveState(storage, next)
    if (result.status === 'error') {
      isPersisted.value = false
      return
    }
    envelope = next
  }

  return {
    session,
    isPersisted,

    startOrRestore(mode: StudyMode): void {
      storage = getBrowserStorage()

      // 无可用 storage（隐私模式等）视同读取失败：内存新建会话，本次不持久化、不写盘。
      const loadResult = storage === null
        ? { status: 'error' as const, reason: 'unavailable' as const, raw: null }
        : loadState(storage)

      const plan = planSessionRecovery({
        loadResult,
        library: MOCK_VOCABULARY,
        mode,
        sessionId: `study-${Date.now()}`,
        now: Date.now(),
      })

      session.value = plan.session

      if (!plan.persist) {
        isPersisted.value = false
        return
      }

      isPersisted.value = true
      envelope = plan.envelope
      if (!plan.restored)
        persist(plan.envelope)
    },

    rate(wordId: WordId, rating: Rating): void {
      const current = session.value
      if (current === null)
        return

      const next = rateWord(current, wordId, rating, Date.now())
      session.value = next

      if (!isPersisted.value || envelope === null)
        return

      persist(withActiveSession(envelope, next, Date.now()))
    },
  }
}
