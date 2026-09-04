import type { StudyMode, StudySession } from '../types/study'
import type { Rating, Timestamp } from '../types/review'
import type { Word, WordId } from '../types/word'

/**
 * 词库 → 学习队列：按 rank 升序取全部词 id。
 * 顺序是确定的（不做随机）——P2-3 刷新恢复要求队列可重演。
 */
export function buildStudyQueue(library: readonly Word[]): WordId[] {
  const seen = new Set<WordId>()
  for (const word of library) {
    if (seen.has(word.id))
      throw new Error(`Duplicate word id in library: ${word.id}`)
    seen.add(word.id)
  }
  return [...library]
    .sort((a, b) => a.rank - b.rank)
    .map(word => word.id)
}

/** 初始学习会话：位置 0、无评分、active；队列必须非空（与存储校验的 activeSession 约束一致）。 */
export function createStudySession(input: { id: string, mode: StudyMode, queue: readonly WordId[], startedAt: Timestamp }): StudySession {
  if (input.queue.length === 0)
    throw new Error('Study session queue must not be empty')
  if (new Set(input.queue).size !== input.queue.length)
    throw new Error('Study session queue must not contain duplicate word ids')

  return {
    id: input.id,
    mode: input.mode,
    queue: [...input.queue],
    currentIndex: 0,
    results: {},
    status: 'active',
    startedAt: input.startedAt,
    updatedAt: input.startedAt,
    completedAt: null,
  }
}

/** 当前位置的词 id；队列走完（currentIndex === queue.length）返回 null。 */
export function currentWordId(session: StudySession): WordId | null {
  if (session.currentIndex >= session.queue.length)
    return null
  return session.queue[session.currentIndex] ?? null
}

/** 会话是否已走完队列。 */
export function isSessionFinished(session: StudySession): boolean {
  return session.currentIndex >= session.queue.length
}

/**
 * 评分并推进：记录评分、前进一步、队列走完时置 completed。
 * 幂等——对已评词二次调用返回原会话，UI 连点不会重复计分。
 * 不可变——返回新会话对象，原对象保持原样。
 */
export function rateWord(session: StudySession, wordId: WordId, rating: Rating, ratedAt: Timestamp): StudySession {
  if (session.results[wordId] !== undefined)
    return session
  if (session.status !== 'active')
    throw new Error('Cannot rate a word in a completed session')
  if (session.currentIndex >= session.queue.length)
    throw new Error('Cannot rate past the end of the queue')
  if (session.queue[session.currentIndex] !== wordId)
    throw new Error(`Word ${wordId} is not the current word at index ${session.currentIndex}`)

  const finished = session.currentIndex + 1 >= session.queue.length
  return {
    ...session,
    currentIndex: session.currentIndex + 1,
    results: {
      ...session.results,
      [wordId]: { wordId, rating, ratedAt },
    },
    status: finished ? 'completed' : 'active',
    updatedAt: ratedAt,
    completedAt: finished ? ratedAt : null,
  }
}
