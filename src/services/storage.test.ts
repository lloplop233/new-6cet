import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { APP_VERSION, DEFAULT_SETTINGS, SCHEMA_VERSION, STORAGE_KEY } from '../constants/storage.ts'
import { MOCK_VOCABULARY } from '../constants/mock-vocabulary.ts'
import { createDefaultEnvelope, getBrowserStorage, loadState, saveState } from './storage.ts'
import { createFsrsParametersSnapshot } from '../utils/fsrs.ts'
import { planSessionRecovery, withActiveSession } from '../utils/session-recovery.ts'
import { buildStudyQueue, createStudySession, rateWord } from '../utils/study-session.ts'
import type { LoadFailureReason, Migration, PersistedEnvelope, StorageLike } from '../types/storage'
import type { Timestamp } from '../types/review'

const NOW: Timestamp = 1_788_105_600_000

function createMemoryStorage(initial?: Record<string, string>) {
  const data = new Map<string, string>(Object.entries(initial ?? {}))
  let writes = 0
  const storage: StorageLike = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
      writes++
    },
    removeItem: key => data.delete(key),
  }
  return { storage, data, writeCount: () => writes }
}

function createReadBrokenStorage(): StorageLike {
  return {
    getItem: () => {
      throw new Error('storage disabled')
    },
    setItem: () => {},
    removeItem: () => {},
  }
}

function createQuotaStorage(initial?: Record<string, string>): StorageLike {
  const data = new Map<string, string>(Object.entries(initial ?? {}))
  return {
    getItem: key => data.get(key) ?? null,
    setItem: () => {
      throw Object.assign(new Error('quota exceeded'), { name: 'QuotaExceededError' })
    },
    removeItem: () => {},
  }
}

function createWriteBrokenStorage(): StorageLike {
  return {
    getItem: () => null,
    setItem: () => {
      throw new Error('private mode')
    },
    removeItem: () => {},
  }
}

function createSampleEnvelope(): PersistedEnvelope {
  const envelope = createDefaultEnvelope()
  envelope.savedAt = NOW
  envelope.data.settings = {
    targetWordCount: 4000,
    preferredMode: 'multiple-choice',
    autoPronounce: true,
    updatedAt: NOW,
  }
  envelope.data.progress = {
    dignity: {
      review: {
        wordId: 'dignity',
        phase: 'review',
        dueAt: NOW,
        lastReviewedAt: NOW - 86_400_000,
        reviewCount: 3,
        lapseCount: 1,
      },
      scheduling: { stability: 2.3065, difficulty: 5, scheduledDays: 0, learningSteps: 1 },
    },
  }
  envelope.data.activeSession = {
    id: 'session-2026-09-03-001',
    mode: 'flashcard',
    queue: ['dignity', 'eliminate'],
    currentIndex: 1,
    results: {
      dignity: { wordId: 'dignity', rating: 'good', ratedAt: NOW - 60_000 },
    },
    status: 'active',
    startedAt: NOW - 120_000,
    updatedAt: NOW - 60_000,
    completedAt: null,
  }
  return envelope
}

function asRecord(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === 'object' && value !== null && !Array.isArray(value))
  return value as Record<string, unknown>
}

function progressEntry(raw: Record<string, unknown>): Record<string, unknown> {
  return asRecord(asRecord(asRecord(raw.data).progress).dignity)
}

function expectLoadError(payload: string, reason: LoadFailureReason, migrations?: ReadonlyMap<number, Migration>): void {
  const { storage, writeCount } = createMemoryStorage({ [STORAGE_KEY]: payload })
  const result = migrations === undefined ? loadState(storage) : loadState(storage, migrations)

  if (result.status !== 'error')
    throw new Error(`expected load error ${reason}, got ${result.status}`)

  assert.equal(result.reason, reason)
  assert.equal(result.raw, payload)
  // 读取路径永不写盘：任何失败都不触碰 storage。
  assert.equal(writeCount(), 0)
}

describe('storage defaults', () => {
  it('returns fresh defaults without writing when the key is missing', () => {
    const { storage, writeCount } = createMemoryStorage()
    const result = loadState(storage)

    assert.ok(result.status === 'fresh')
    assert.deepEqual(result.envelope, createDefaultEnvelope())
    assert.equal(writeCount(), 0)
  })

  it('freezes the default envelope content', () => {
    const envelope = createDefaultEnvelope()

    assert.equal(envelope.schemaVersion, SCHEMA_VERSION)
    assert.equal(envelope.appVersion, APP_VERSION)
    assert.equal(envelope.savedAt, 0)
    assert.deepEqual(envelope.data.settings, { ...DEFAULT_SETTINGS })
    assert.deepEqual(envelope.data.progress, {})
    assert.equal(envelope.data.activeSession, null)
    assert.equal(envelope.scheduler.algorithm, 'FSRS-6')
    assert.equal(envelope.scheduler.library, 'ts-fsrs')
    assert.equal(envelope.scheduler.libraryVersion, '5.4.1')
    assert.deepEqual(envelope.scheduler.parameters, createFsrsParametersSnapshot())
  })

  it('returns fresh copies that callers may mutate independently', () => {
    const first = createDefaultEnvelope()
    const second = createDefaultEnvelope()

    first.data.settings.targetWordCount = 5000

    assert.equal(second.data.settings.targetWordCount, DEFAULT_SETTINGS.targetWordCount)
    assert.equal(DEFAULT_SETTINGS.targetWordCount, 2500)
  })
})

describe('storage round-trip', () => {
  it('saves and loads a full envelope unchanged', () => {
    const envelope = createSampleEnvelope()
    const { storage } = createMemoryStorage()

    assert.deepEqual(saveState(storage, envelope), { status: 'saved' })

    const result = loadState(storage)
    assert.ok(result.status === 'loaded')
    assert.deepEqual(result.envelope, envelope)
  })

  it('round-trips the fresh default envelope', () => {
    const { storage } = createMemoryStorage()

    assert.deepEqual(saveState(storage, createDefaultEnvelope()), { status: 'saved' })

    const result = loadState(storage)
    assert.ok(result.status === 'loaded')
    assert.deepEqual(result.envelope, createDefaultEnvelope())
  })

  it('freezes the serialized key sets at every level', () => {
    const { storage, data } = createMemoryStorage()
    saveState(storage, createSampleEnvelope())

    const saved = data.get(STORAGE_KEY)
    assert.ok(typeof saved === 'string')
    const raw = JSON.parse(saved) as Record<string, unknown>

    assert.deepEqual(Object.keys(raw).sort(), ['appVersion', 'data', 'savedAt', 'scheduler', 'schemaVersion'])
    assert.deepEqual(Object.keys(asRecord(raw.data)).sort(), ['activeSession', 'progress', 'settings'])
    assert.deepEqual(Object.keys(asRecord(asRecord(raw.data).settings)).sort(), ['autoPronounce', 'preferredMode', 'targetWordCount', 'updatedAt'])

    const entry = asRecord(asRecord(asRecord(raw.data).progress).dignity)
    assert.deepEqual(Object.keys(asRecord(entry.review)).sort(), ['dueAt', 'lapseCount', 'lastReviewedAt', 'phase', 'reviewCount', 'wordId'])
    assert.deepEqual(Object.keys(asRecord(entry.scheduling)).sort(), ['difficulty', 'learningSteps', 'scheduledDays', 'stability'])

    assert.deepEqual(Object.keys(asRecord(asRecord(raw.data).activeSession)).sort(), ['completedAt', 'currentIndex', 'id', 'mode', 'queue', 'results', 'startedAt', 'status', 'updatedAt'])
    assert.equal(typeof raw.savedAt, 'number')
    // 词库本体不进 localStorage：持久化数据里不存在 words 字段。
    assert.equal('words' in asRecord(raw.data), false)
  })

  it('keeps the word library out of the persisted data type', () => {
    const envelope = createSampleEnvelope()

    // @ts-expect-error PersistedData 不得暴露词库本体
    void envelope.data.words
  })

  it('preserves scheduler metadata carried by older data instead of refreshing it', () => {
    const envelope = createSampleEnvelope()
    envelope.scheduler = {
      algorithm: 'FSRS-5',
      library: 'ts-fsrs',
      libraryVersion: '5.0.0',
      parameters: {
        requestRetention: 0.85,
        maximumInterval: 36_500,
        weights: [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        enableFuzz: true,
        enableShortTerm: false,
        learningSteps: ['5m'],
        relearningSteps: ['30m'],
      },
    }
    const { storage } = createMemoryStorage()

    assert.deepEqual(saveState(storage, envelope), { status: 'saved' })

    const result = loadState(storage)
    assert.ok(result.status === 'loaded')
    // 读取不得用当前安装版本的元数据覆盖旧数据自带的调度器描述（P1-2 升级约束）。
    assert.deepEqual(result.envelope.scheduler, envelope.scheduler)
    assert.notEqual(result.envelope.scheduler.algorithm, createDefaultEnvelope().scheduler.algorithm)
  })

  it('preserves progress entries for words outside the library', () => {
    const envelope = createSampleEnvelope()
    const entry = envelope.data.progress.dignity
    assert.ok(entry !== undefined)
    envelope.data.progress.zzz = {
      review: { ...entry.review, wordId: 'zzz' },
      scheduling: { ...entry.scheduling },
    }
    const { storage } = createMemoryStorage()

    assert.deepEqual(saveState(storage, envelope), { status: 'saved' })

    const result = loadState(storage)
    assert.ok(result.status === 'loaded')
    assert.ok(result.envelope.data.progress.zzz !== undefined)
  })

  it('accepts a session whose index reached the end of the queue', () => {
    const envelope = createSampleEnvelope()
    assert.ok(envelope.data.activeSession !== null)
    envelope.data.activeSession.currentIndex = 2
    const { storage } = createMemoryStorage()

    assert.deepEqual(saveState(storage, envelope), { status: 'saved' })

    const result = loadState(storage)
    assert.ok(result.status === 'loaded')
    assert.equal(result.envelope.data.activeSession?.currentIndex, 2)
  })
})

describe('storage read failures', () => {
  it('reports unavailable when getItem throws', () => {
    const result = loadState(createReadBrokenStorage())

    assert.ok(result.status === 'error')
    assert.equal(result.reason, 'unavailable')
    assert.equal(result.raw, null)
  })

  it('rejects syntactically broken JSON as corrupted', () => {
    expectLoadError('{"schemaVersion":', 'corrupted')
  })

  it('rejects non-object JSON payloads as invalid', () => {
    for (const payload of ['42', '"text"', 'null', 'true', '[1,2]'])
      expectLoadError(payload, 'invalid')
  })

  it('refuses data from a newer schema version without touching it', () => {
    const future = JSON.parse(JSON.stringify(createSampleEnvelope())) as Record<string, unknown>
    future.schemaVersion = SCHEMA_VERSION + 1
    expectLoadError(JSON.stringify(future), 'future-version')
  })

  it('classifies newer version before checking the rest of the shape', () => {
    expectLoadError(JSON.stringify({ schemaVersion: 99 }), 'future-version')
  })

  it('reports migration-failed when no migration path exists', () => {
    const legacy = JSON.parse(JSON.stringify(createSampleEnvelope())) as Record<string, unknown>
    legacy.schemaVersion = 0
    expectLoadError(JSON.stringify(legacy), 'migration-failed')
  })

  const invalidMutations: ReadonlyArray<[name: string, mutate: (raw: Record<string, unknown>) => void]> = [
    ['extra top-level key', raw => (raw.extra = 1)],
    ['missing appVersion', raw => delete raw.appVersion],
    ['non-string appVersion', raw => (raw.appVersion = 123)],
    ['negative savedAt', raw => (raw.savedAt = -1)],
    ['fractional savedAt', raw => (raw.savedAt = 1.5)],
    ['savedAt beyond MAX_TIMESTAMP', raw => (raw.savedAt = 8_640_000_000_000_001)],
    ['string schemaVersion', raw => (raw.schemaVersion = '1')],
    ['missing schemaVersion', raw => delete raw.schemaVersion],
    ['missing scheduler', raw => delete raw.scheduler],
    ['empty scheduler.algorithm', raw => (asRecord(raw.scheduler).algorithm = '')],
    ['extra scheduler key', raw => (asRecord(raw.scheduler).extra = 1)],
    ['missing weights', raw => delete asRecord(asRecord(raw.scheduler).parameters).weights],
    ['empty weights', raw => (asRecord(asRecord(raw.scheduler).parameters).weights = [])],
    ['non-numeric weight', raw => (asRecord(asRecord(raw.scheduler).parameters).weights = [0.5, 'x'])],
    ['requestRetention above 1', raw => (asRecord(asRecord(raw.scheduler).parameters).requestRetention = 1.5)],
    ['requestRetention at 0', raw => (asRecord(asRecord(raw.scheduler).parameters).requestRetention = 0)],
    ['maximumInterval at 0', raw => (asRecord(asRecord(raw.scheduler).parameters).maximumInterval = 0)],
    ['malformed learning step', raw => (asRecord(asRecord(raw.scheduler).parameters).learningSteps = ['1x'])],
    ['string enableFuzz', raw => (asRecord(asRecord(raw.scheduler).parameters).enableFuzz = 'true')],
    ['unknown preferredMode', raw => (asRecord(asRecord(raw.data).settings).preferredMode = 'spelling')],
    ['zero targetWordCount', raw => (asRecord(asRecord(raw.data).settings).targetWordCount = 0)],
    ['string autoPronounce', raw => (asRecord(asRecord(raw.data).settings).autoPronounce = 'yes')],
    ['extra settings key', raw => (asRecord(asRecord(raw.data).settings).extra = 1)],
    ['array progress', raw => (asRecord(raw.data).progress = [])],
    ['empty progress key', (raw) => {
      asRecord(asRecord(raw.data).progress)[''] = { ...progressEntry(raw) }
    }],
    ['extra progress entry key', raw => (asRecord(asRecord(asRecord(raw.data).progress).dignity).extra = 1)],
    ['progress key mismatching review.wordId', (raw) => {
      const entry = progressEntry(raw)
      entry.review = { ...asRecord(entry.review), wordId: 'other' }
    }],
    ['unknown review phase', (raw) => {
      const entry = progressEntry(raw)
      entry.review = { ...asRecord(entry.review), phase: 'mastered' }
    }],
    ['string dueAt', (raw) => {
      const entry = progressEntry(raw)
      entry.review = { ...asRecord(entry.review), dueAt: '2026-09-03' }
    }],
    ['negative reviewCount', (raw) => {
      const entry = progressEntry(raw)
      entry.review = { ...asRecord(entry.review), reviewCount: -1 }
    }],
    ['null stability', (raw) => {
      const entry = progressEntry(raw)
      entry.scheduling = { ...asRecord(entry.scheduling), stability: null }
    }],
    ['negative scheduledDays', (raw) => {
      const entry = progressEntry(raw)
      entry.scheduling = { ...asRecord(entry.scheduling), scheduledDays: -1 }
    }],
    ['fractional learningSteps', (raw) => {
      const entry = progressEntry(raw)
      entry.scheduling = { ...asRecord(entry.scheduling), learningSteps: 1.5 }
    }],
    ['duplicate queue entries', raw => (asRecord(raw.data).activeSession = { ...asRecord(asRecord(raw.data).activeSession), queue: ['dignity', 'dignity'] })],
    ['currentIndex beyond queue', raw => (asRecord(raw.data).activeSession = { ...asRecord(asRecord(raw.data).activeSession), currentIndex: 3 })],
    ['empty queue', raw => (asRecord(raw.data).activeSession = { ...asRecord(asRecord(raw.data).activeSession), queue: [] })],
    ['non-string queue entry', raw => (asRecord(raw.data).activeSession = { ...asRecord(asRecord(raw.data).activeSession), queue: ['dignity', 2] })],
    ['result for a word outside the queue', raw => (asRecord(asRecord(raw.data).activeSession).results = { zebra: { wordId: 'zebra', rating: 'good', ratedAt: NOW } })],
    ['easy rating', raw => (asRecord(asRecord(raw.data).activeSession).results = { dignity: { wordId: 'dignity', rating: 'easy', ratedAt: NOW } })],
    ['unknown session status', raw => (asRecord(raw.data).activeSession = { ...asRecord(asRecord(raw.data).activeSession), status: 'archived' })],
    ['string completedAt', raw => (asRecord(raw.data).activeSession = { ...asRecord(asRecord(raw.data).activeSession), completedAt: '2026-09-03' })],
    ['non-object activeSession', raw => (asRecord(raw.data).activeSession = 'none')],
  ]

  for (const [name, mutate] of invalidMutations) {
    it(`rejects invalid envelope: ${name}`, () => {
      const raw = JSON.parse(JSON.stringify(createSampleEnvelope())) as Record<string, unknown>
      mutate(raw)
      expectLoadError(JSON.stringify(raw), 'invalid')
    })
  }
})

describe('storage migrations', () => {
  it('applies injected migrations without writing to storage', () => {
    const legacy = JSON.stringify({ schemaVersion: 0, config: { target: 4000 } })
    const migrate: Migration = (raw) => {
      const legacyTarget = (raw as { config?: { target?: number } }).config?.target ?? 2500
      const migrated = createSampleEnvelope()
      migrated.data.settings.targetWordCount = legacyTarget
      return migrated as unknown as Record<string, unknown>
    }
    const { storage, writeCount } = createMemoryStorage({ [STORAGE_KEY]: legacy })

    const result = loadState(storage, new Map([[0, migrate]]))

    assert.ok(result.status === 'loaded')
    const expected = createSampleEnvelope()
    expected.data.settings.targetWordCount = 4000
    assert.deepEqual(result.envelope, expected)
    assert.equal(writeCount(), 0)
  })

  it('reports migration-failed when a migration throws', () => {
    const migrate: Migration = () => {
      throw new Error('boom')
    }
    expectLoadError(JSON.stringify({ schemaVersion: 0 }), 'migration-failed', new Map([[0, migrate]]))
  })

  it('reports migration-failed when a migration output fails validation', () => {
    const migrate: Migration = raw => ({ ...raw, schemaVersion: SCHEMA_VERSION })
    expectLoadError(JSON.stringify({ schemaVersion: 0 }), 'migration-failed', new Map([[0, migrate]]))
  })

  it('reports migration-failed when the injected chain has no step for the version', () => {
    expectLoadError(JSON.stringify({ schemaVersion: 0 }), 'migration-failed', new Map())
  })
})

describe('storage write failures', () => {
  it('reports quota without overwriting the stored value', () => {
    const original = JSON.stringify(createSampleEnvelope())
    const storage = createQuotaStorage({ [STORAGE_KEY]: original })

    const result = saveState(storage, createDefaultEnvelope())

    assert.ok(result.status === 'error')
    assert.equal(result.reason, 'quota')
    assert.equal(storage.getItem(STORAGE_KEY), original)
  })

  it('keeps the previous state readable after a failed save', () => {
    const original = JSON.stringify(createSampleEnvelope())
    const storage = createQuotaStorage({ [STORAGE_KEY]: original })

    const result = saveState(storage, createDefaultEnvelope())
    assert.ok(result.status === 'error')

    const reloaded = loadState(storage)
    assert.ok(reloaded.status === 'loaded')
    assert.deepEqual(reloaded.envelope, createSampleEnvelope())
  })

  it('reports unavailable on other setItem failures', () => {
    const result = saveState(createWriteBrokenStorage(), createSampleEnvelope())

    assert.ok(result.status === 'error')
    assert.equal(result.reason, 'unavailable')
  })

  it('reports serialize failures before touching storage', () => {
    const { storage, writeCount } = createMemoryStorage()
    const broken = createSampleEnvelope() as unknown as { data: { settings: { targetWordCount: number | bigint } } }
    broken.data.settings.targetWordCount = 10n

    const result = saveState(storage, broken as unknown as PersistedEnvelope)

    assert.ok(result.status === 'error')
    assert.equal(result.reason, 'serialize')
    assert.equal(writeCount(), 0)
  })
})

describe('storage metadata bindings', () => {
  it('binds APP_VERSION to package.json', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { version: string }

    assert.equal(manifest.version, APP_VERSION)
  })

  it('freezes SCHEMA_VERSION at the first storage era', () => {
    assert.equal(SCHEMA_VERSION, 1)
    assert.equal(createDefaultEnvelope().schemaVersion, SCHEMA_VERSION)
  })

  it('freezes STORAGE_KEY: renaming it orphans existing user data', () => {
    assert.equal(STORAGE_KEY, 'cet6-vocab:state')
  })

  it('returns null or a usable storage without throwing', () => {
    const storage = getBrowserStorage()

    assert.ok(storage === null || typeof storage.getItem === 'function')
  })
})

// P2-3 会话恢复对存储协议的调用方契约：纯函数产出的信封必须能通过已冻结的校验，
// 失败路径必须保持零写入。追加块，与上方 70 项互不干扰。
describe('session recovery integration', () => {
  function makeRatedSession(): ReturnType<typeof createStudySession> {
    const queue = buildStudyQueue(MOCK_VOCABULARY)
    let session = createStudySession({ id: 'rt-1', mode: 'flashcard', queue, startedAt: NOW })
    session = rateWord(session, queue[0]!, 'good', NOW + 1000)
    session = rateWord(session, queue[1]!, 'again', NOW + 2000)
    return session
  }

  // 旧 scheduler 元数据非默认值：withActiveSession 若顺手刷新它，断言会变红。
  function makeLegacySchedulerEnvelope(): PersistedEnvelope {
    const envelope = createDefaultEnvelope()
    envelope.scheduler = {
      algorithm: 'FSRS-5',
      library: 'ts-fsrs',
      libraryVersion: '5.0.0',
      parameters: {
        requestRetention: 0.85,
        maximumInterval: 36_500,
        weights: [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
        enableFuzz: true,
        enableShortTerm: false,
        learningSteps: ['5m'],
        relearningSteps: ['30m'],
      },
    }
    return envelope
  }

  it('round-trips an envelope written by withActiveSession through the frozen validation', () => {
    const session = makeRatedSession()
    const base = makeLegacySchedulerEnvelope()
    const updated = withActiveSession(base, session, NOW)
    assert.equal(updated.savedAt, NOW)

    const { storage } = createMemoryStorage()
    assert.deepEqual(saveState(storage, updated), { status: 'saved' })

    const result = loadState(storage)
    assert.ok(result.status === 'loaded')
    assert.deepEqual(result.envelope, updated)
    assert.deepEqual(result.envelope.data.activeSession, session)
    assert.deepEqual(result.envelope.scheduler, base.scheduler)
    assert.equal(base.data.activeSession, null)
    assert.equal(base.savedAt, 0)
  })

  it('keeps a failed load entirely write-free through planSessionRecovery', () => {
    const future = JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1 })
    const { storage, writeCount } = createMemoryStorage({ [STORAGE_KEY]: future })

    const loadResult = loadState(storage)
    assert.ok(loadResult.status === 'error')
    assert.equal(loadResult.reason, 'future-version')

    const plan = planSessionRecovery({
      loadResult,
      library: MOCK_VOCABULARY,
      mode: 'flashcard',
      sessionId: 'plan-1',
      now: NOW,
    })

    assert.equal(plan.persist, false)
    assert.equal(writeCount(), 0)
  })
})
