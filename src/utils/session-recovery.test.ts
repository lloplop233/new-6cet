import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { LoadFailureReason, LoadResult, PersistedEnvelope } from '../types/storage'
import type { StudySession } from '../types/study'
import type { Word } from '../types/word'
import { buildStudyQueue, createStudySession, rateWord } from './study-session.ts'
import { planSessionRecovery, withActiveSession } from './session-recovery.ts'

const NOW = 1_788_105_600_000
const SAVED_AT = NOW + 999

function makeWord(id: string, rank: number): Word {
  return {
    id,
    text: id,
    rank,
    phonetic: null,
    senses: [{ partOfSpeech: null, definition: `${id} 释义` }],
    examples: [],
    realExamYears: ['Mock'],
  }
}

// rank 乱序，证明新建会话的队列走 buildStudyQueue 的排序而不是词库原序。
const LIBRARY: readonly Word[] = [makeWord('w1', 3), makeWord('w2', 1), makeWord('w3', 2)]
const QUEUE = buildStudyQueue(LIBRARY)

function midSession(): StudySession {
  let session = createStudySession({ id: 'stored-1', mode: 'flashcard', queue: QUEUE, startedAt: NOW - 5000 })
  session = rateWord(session, QUEUE[0]!, 'good', NOW - 4000)
  session = rateWord(session, QUEUE[1]!, 'again', NOW - 3000)
  return session
}

function completedSession(): StudySession {
  let session = createStudySession({ id: 'stored-done', mode: 'flashcard', queue: QUEUE, startedAt: NOW - 5000 })
  for (const wordId of QUEUE)
    session = rateWord(session, wordId, 'hard', NOW - 1000)
  return session
}

// scheduler / settings / progress 用非默认值：withActiveSession 若顺手刷新它们（E5）
// 或原地改写信封（E4），深度相等断言会变红。
function makeEnvelope(activeSession: StudySession | null): PersistedEnvelope {
  return {
    schemaVersion: 1,
    appVersion: 'test-version',
    savedAt: NOW,
    scheduler: {
      algorithm: 'FSRS-5',
      library: 'ts-fsrs',
      libraryVersion: '5.0.0',
      parameters: {
        requestRetention: 0.85,
        maximumInterval: 36_500,
        weights: [0.5, 1, 2],
        enableFuzz: true,
        enableShortTerm: false,
        learningSteps: ['5m'],
        relearningSteps: ['30m'],
      },
    },
    data: {
      settings: {
        targetWordCount: 4000,
        preferredMode: 'multiple-choice',
        autoPronounce: true,
        updatedAt: NOW - 8000,
      },
      progress: {
        'w-prog': {
          review: {
            wordId: 'w-prog',
            phase: 'review',
            dueAt: NOW,
            lastReviewedAt: NOW - 1000,
            reviewCount: 2,
            lapseCount: 1,
          },
          scheduling: { stability: 3.5, difficulty: 5.2, scheduledDays: 1, learningSteps: 0 },
        },
      },
      activeSession,
    },
  }
}

const BASE_INPUT = {
  library: LIBRARY,
  mode: 'flashcard' as const,
  sessionId: 'new-1',
  now: NOW,
}

describe('planSessionRecovery', () => {
  it('never persists and starts fresh for every load failure reason', () => {
    const reasons: readonly LoadFailureReason[]
      = ['corrupted', 'invalid', 'future-version', 'migration-failed', 'unavailable']

    for (const reason of reasons) {
      const loadResult: LoadResult = { status: 'error', reason, raw: 'payload' }
      const plan = planSessionRecovery({ ...BASE_INPUT, loadResult })

      assert.equal(plan.persist, false, `reason: ${reason}`)
      assert.equal(plan.restored, false, `reason: ${reason}`)
      assert.equal(plan.session.mode, 'flashcard', `reason: ${reason}`)
      assert.equal(plan.session.currentIndex, 0, `reason: ${reason}`)
      assert.deepEqual(plan.session.results, {}, `reason: ${reason}`)
      assert.equal(plan.session.status, 'active', `reason: ${reason}`)
    }
  })

  it('creates a new session and envelope when storage is fresh', () => {
    const loadResult: LoadResult = { status: 'fresh', envelope: makeEnvelope(null) }
    const plan = planSessionRecovery({ ...BASE_INPUT, loadResult })

    assert.ok(plan.persist === true)
    assert.equal(plan.restored, false)
    assert.deepEqual(plan.session, createStudySession({ id: 'new-1', mode: 'flashcard', queue: QUEUE, startedAt: NOW }))
    assert.deepEqual(plan.envelope.data.activeSession, plan.session)
    assert.equal(plan.envelope.savedAt, NOW)
  })

  it('restores the stored session verbatim when it is recoverable', () => {
    const stored = midSession()
    const loadResult: LoadResult = { status: 'loaded', envelope: makeEnvelope(stored) }
    const plan = planSessionRecovery({ ...BASE_INPUT, loadResult })

    assert.ok(plan.persist === true)
    assert.equal(plan.restored, true)
    assert.deepEqual(plan.session, stored)
    assert.equal(plan.session.currentIndex, 2)
    assert.deepEqual(Object.keys(plan.session.results), [QUEUE[0], QUEUE[1]])
    assert.deepEqual(plan.envelope, makeEnvelope(stored))
  })

  it('does not reuse a session from the other mode', () => {
    const stored = createStudySession({ id: 'stored-quiz', mode: 'multiple-choice', queue: QUEUE, startedAt: NOW - 5000 })
    const loadResult: LoadResult = { status: 'loaded', envelope: makeEnvelope(stored) }
    const plan = planSessionRecovery({ ...BASE_INPUT, loadResult })

    assert.ok(plan.persist === true)
    assert.equal(plan.restored, false)
    assert.equal(plan.session.mode, 'flashcard')
    assert.equal(plan.session.currentIndex, 0)
    assert.deepEqual(plan.envelope.data.activeSession, plan.session)
  })

  it('does not restore a completed session', () => {
    const loadResult: LoadResult = { status: 'loaded', envelope: makeEnvelope(completedSession()) }
    const plan = planSessionRecovery({ ...BASE_INPUT, loadResult })

    assert.ok(plan.persist === true)
    assert.equal(plan.restored, false)
    assert.equal(plan.session.status, 'active')
    assert.equal(plan.session.currentIndex, 0)
    assert.deepEqual(plan.session.results, {})
  })

  // P1-3 校验放行 completed + currentIndex < queue.length 的组合（storage.ts:349 只限上界），
  // 此时 status 检查是不被 isSessionFinished 兜住的唯一闸门，须独立锁定。
  it('does not restore a session marked completed while its index is still mid-queue', () => {
    const stored = { ...midSession(), status: 'completed' as const, completedAt: NOW - 500 }
    const loadResult: LoadResult = { status: 'loaded', envelope: makeEnvelope(stored) }
    const plan = planSessionRecovery({ ...BASE_INPUT, loadResult })

    assert.ok(plan.persist === true)
    assert.equal(plan.restored, false)
    assert.equal(plan.session.status, 'active')
    assert.equal(plan.session.currentIndex, 0)
    assert.deepEqual(plan.session.results, {})
  })

  it('does not restore when there is no active session', () => {
    const loadResult: LoadResult = { status: 'loaded', envelope: makeEnvelope(null) }
    const plan = planSessionRecovery({ ...BASE_INPUT, loadResult })

    assert.ok(plan.persist === true)
    assert.equal(plan.restored, false)
    assert.deepEqual(plan.envelope.data.activeSession, plan.session)
  })

  it('does not restore an active session whose index already reached the queue end', () => {
    const stored = { ...midSession(), currentIndex: QUEUE.length }
    const loadResult: LoadResult = { status: 'loaded', envelope: makeEnvelope(stored) }
    const plan = planSessionRecovery({ ...BASE_INPUT, loadResult })

    assert.ok(plan.persist === true)
    assert.equal(plan.restored, false)
    assert.equal(plan.session.currentIndex, 0)
  })

  it('does not restore a queue containing words outside the library', () => {
    const stored = createStudySession({ id: 'stored-8', mode: 'flashcard', queue: ['w1', 'wX'], startedAt: NOW - 5000 })
    const loadResult: LoadResult = { status: 'loaded', envelope: makeEnvelope(stored) }
    const plan = planSessionRecovery({ ...BASE_INPUT, loadResult })

    assert.ok(plan.persist === true)
    assert.equal(plan.restored, false)
    assert.deepEqual(plan.session.queue, QUEUE)
  })

  it('is pure: repeated calls agree and inputs stay untouched', () => {
    const loadResult: LoadResult = { status: 'loaded', envelope: makeEnvelope(midSession()) }
    const input = { ...BASE_INPUT, loadResult }
    const envelopeSnapshot = JSON.stringify(loadResult.envelope)
    const librarySnapshot = JSON.stringify(LIBRARY)

    const first = planSessionRecovery(input)
    const second = planSessionRecovery(input)

    assert.deepEqual(first, second)
    assert.equal(JSON.stringify(loadResult.envelope), envelopeSnapshot)
    assert.equal(JSON.stringify(LIBRARY), librarySnapshot)
  })
})

describe('withActiveSession', () => {
  const session = midSession()

  it('returns a new envelope without mutating its input', () => {
    const envelope = makeEnvelope(null)
    const snapshot = JSON.stringify(envelope)

    const result = withActiveSession(envelope, session, SAVED_AT)

    assert.notEqual(result, envelope)
    assert.notEqual(result.data, envelope.data)
    assert.equal(JSON.stringify(envelope), snapshot)
  })

  it('changes only activeSession and savedAt, passing everything else through', () => {
    const envelope = makeEnvelope(null)
    const result = withActiveSession(envelope, session, SAVED_AT)

    assert.notEqual(result, envelope)
    assert.equal(result.data.activeSession, session)
    assert.deepEqual(result.scheduler, envelope.scheduler)
    assert.deepEqual(result.data.settings, envelope.data.settings)
    assert.deepEqual(result.data.progress, envelope.data.progress)
    assert.equal(result.schemaVersion, envelope.schemaVersion)
    assert.equal(result.appVersion, envelope.appVersion)
  })

  it('takes savedAt from the argument, not from the clock', () => {
    const envelope = makeEnvelope(null)
    assert.notEqual(envelope.savedAt, SAVED_AT)

    const result = withActiveSession(envelope, session, SAVED_AT)

    assert.equal(result.savedAt, SAVED_AT)
    assert.equal(envelope.savedAt, NOW)
  })
})
