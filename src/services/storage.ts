import type {
  LoadResult,
  Migration,
  PersistedEnvelope,
  SaveResult,
  StorageLike,
} from '../types/storage'
import type { Rating, ReviewPhase, Timestamp } from '../types/review'
import type { SessionStatus, StudyMode } from '../types/study'

import { FSRS_ALGORITHM, FSRS_LIBRARY, FSRS_LIBRARY_VERSION } from '../constants/fsrs.ts'
import { MAX_TIMESTAMP } from '../constants/timestamp.ts'
import { APP_VERSION, DEFAULT_SETTINGS, SCHEMA_VERSION, STORAGE_KEY } from '../constants/storage.ts'
import { createFsrsParametersSnapshot } from '../utils/fsrs.ts'

type UnknownRecord = Record<string, unknown>

// v1 是首个存储版本，生产迁移链为空；真实迁移随未来 schemaVersion 提升在此追加。
const MIGRATIONS: ReadonlyMap<number, Migration> = new Map()

const PHASES = ['new', 'learning', 'review', 'relearning'] as const satisfies readonly ReviewPhase[]
const MODES = ['flashcard', 'multiple-choice'] as const satisfies readonly StudyMode[]
const RATINGS = ['again', 'hard', 'good'] as const satisfies readonly Rating[]
const SESSION_STATUSES = ['active', 'completed'] as const satisfies readonly SessionStatus[]
const STEP_UNIT_PATTERN = /^\d+[mhd]$/
const PROBE_KEY = 'cet6-vocab:probe'

export function createDefaultEnvelope(): PersistedEnvelope {
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    savedAt: 0,
    scheduler: {
      algorithm: FSRS_ALGORITHM,
      library: FSRS_LIBRARY,
      libraryVersion: FSRS_LIBRARY_VERSION,
      parameters: createFsrsParametersSnapshot(),
    },
    data: {
      settings: { ...DEFAULT_SETTINGS },
      progress: {},
      activeSession: null,
    },
  }
}

export function loadState(storage: StorageLike, migrations: ReadonlyMap<number, Migration> = MIGRATIONS): LoadResult {
  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  }
  catch {
    return { status: 'error', reason: 'unavailable', raw: null }
  }

  if (raw === null)
    return { status: 'fresh', envelope: createDefaultEnvelope() }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    return { status: 'error', reason: 'corrupted', raw }
  }

  if (!isRecord(parsed))
    return { status: 'error', reason: 'invalid', raw }

  const version = parsed.schemaVersion
  if (!isSchemaVersionInteger(version))
    return { status: 'error', reason: 'invalid', raw }

  if (version > SCHEMA_VERSION)
    return { status: 'error', reason: 'future-version', raw }

  let current: UnknownRecord = parsed
  if (version < SCHEMA_VERSION) {
    const migrated = runMigrations(parsed, version, migrations)
    if (migrated === null)
      return { status: 'error', reason: 'migration-failed', raw }
    current = migrated
  }

  try {
    validateEnvelope(current)
  }
  catch {
    return {
      status: 'error',
      reason: version < SCHEMA_VERSION ? 'migration-failed' : 'invalid',
      raw,
    }
  }

  return { status: 'loaded', envelope: current as unknown as PersistedEnvelope }
}

export function saveState(storage: StorageLike, envelope: PersistedEnvelope): SaveResult {
  let serialized: string
  try {
    serialized = JSON.stringify(envelope)
  }
  catch {
    return { status: 'error', reason: 'serialize' }
  }

  try {
    storage.setItem(STORAGE_KEY, serialized)
  }
  catch (error) {
    if (isQuotaError(error))
      return { status: 'error', reason: 'quota' }
    return { status: 'error', reason: 'unavailable' }
  }

  return { status: 'saved' }
}

export function getBrowserStorage(): StorageLike | null {
  try {
    const candidate = (globalThis as { localStorage?: unknown }).localStorage
    if (candidate === null || candidate === undefined)
      return null

    const storage = candidate as StorageLike
    storage.setItem(PROBE_KEY, PROBE_KEY)
    storage.removeItem(PROBE_KEY)
    return storage
  }
  catch {
    return null
  }
}

function runMigrations(from: UnknownRecord, version: number, migrations: ReadonlyMap<number, Migration>): UnknownRecord | null {
  let current: UnknownRecord = from
  for (let step = version; step < SCHEMA_VERSION; step++) {
    const migrate = migrations.get(step)
    if (migrate === undefined)
      return null
    try {
      current = migrate(current)
    }
    catch {
      return null
    }
  }
  return current
}

function isQuotaError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && (error as { name?: unknown }).name === 'QuotaExceededError'
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSchemaVersionInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

function isTimestamp(value: unknown): value is Timestamp {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= MAX_TIMESTAMP
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isStepUnitArray(value: unknown): value is string[] {
  return Array.isArray(value)
    && value.length > 0
    && value.every(unit => typeof unit === 'string' && STEP_UNIT_PATTERN.test(unit))
}

function invalid(where: string): never {
  throw new Error(`Invalid persisted envelope: ${where}`)
}

function assertExactKeys(record: UnknownRecord, keys: readonly string[], where: string): void {
  const expected = [...keys].sort()
  const actual = Object.keys(record).sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index]))
    invalid(`${where} keys [${actual.join(', ')}]`)
}

// 校验只停在结构层（P1-3 策略 D8）；全部通过后调用方拿到的就是可信的当前版本信封。
function validateEnvelope(raw: unknown): asserts raw is PersistedEnvelope {
  if (!isRecord(raw))
    invalid('envelope')
  assertExactKeys(raw, ['schemaVersion', 'appVersion', 'savedAt', 'scheduler', 'data'], 'envelope')

  if (raw.schemaVersion !== SCHEMA_VERSION)
    invalid('schemaVersion')
  if (!isNonEmptyString(raw.appVersion))
    invalid('appVersion')
  if (!isTimestamp(raw.savedAt))
    invalid('savedAt')

  validateScheduler(raw.scheduler)
  validateData(raw.data)
}

function validateScheduler(raw: unknown): void {
  if (!isRecord(raw))
    invalid('scheduler')
  assertExactKeys(raw, ['algorithm', 'library', 'libraryVersion', 'parameters'], 'scheduler')

  if (!isNonEmptyString(raw.algorithm))
    invalid('scheduler.algorithm')
  if (!isNonEmptyString(raw.library))
    invalid('scheduler.library')
  if (!isNonEmptyString(raw.libraryVersion))
    invalid('scheduler.libraryVersion')
  validateParameters(raw.parameters)
}

function validateParameters(raw: unknown): void {
  if (!isRecord(raw))
    invalid('scheduler.parameters')
  assertExactKeys(
    raw,
    ['requestRetention', 'maximumInterval', 'weights', 'enableFuzz', 'enableShortTerm', 'learningSteps', 'relearningSteps'],
    'scheduler.parameters',
  )

  if (typeof raw.requestRetention !== 'number' || !(raw.requestRetention > 0 && raw.requestRetention < 1))
    invalid('scheduler.parameters.requestRetention')
  if (!isSafeNonNegativeInteger(raw.maximumInterval) || raw.maximumInterval < 1)
    invalid('scheduler.parameters.maximumInterval')
  if (!Array.isArray(raw.weights) || raw.weights.length === 0 || !raw.weights.every(isFiniteNumber))
    invalid('scheduler.parameters.weights')
  if (typeof raw.enableFuzz !== 'boolean' || typeof raw.enableShortTerm !== 'boolean')
    invalid('scheduler.parameters.enableFuzz/enableShortTerm')
  if (!isStepUnitArray(raw.learningSteps))
    invalid('scheduler.parameters.learningSteps')
  if (!isStepUnitArray(raw.relearningSteps))
    invalid('scheduler.parameters.relearningSteps')
}

function validateData(raw: unknown): void {
  if (!isRecord(raw))
    invalid('data')
  assertExactKeys(raw, ['settings', 'progress', 'activeSession'], 'data')

  validateSettings(raw.settings)
  validateProgress(raw.progress)
  if (raw.activeSession !== null)
    validateSession(raw.activeSession)
}

function validateSettings(raw: unknown): void {
  if (!isRecord(raw))
    invalid('data.settings')
  assertExactKeys(raw, ['targetWordCount', 'preferredMode', 'autoPronounce', 'updatedAt'], 'data.settings')

  if (!isSafeNonNegativeInteger(raw.targetWordCount) || raw.targetWordCount < 1)
    invalid('data.settings.targetWordCount')
  if (!MODES.includes(raw.preferredMode as StudyMode))
    invalid('data.settings.preferredMode')
  if (typeof raw.autoPronounce !== 'boolean')
    invalid('data.settings.autoPronounce')
  if (!isTimestamp(raw.updatedAt))
    invalid('data.settings.updatedAt')
}

function validateProgress(raw: unknown): void {
  if (!isRecord(raw))
    invalid('data.progress')

  for (const [wordId, entry] of Object.entries(raw)) {
    if (wordId.length === 0)
      invalid('data.progress key')
    if (!isRecord(entry))
      invalid(`data.progress[${wordId}]`)
    assertExactKeys(entry, ['review', 'scheduling'], `data.progress[${wordId}]`)

    validateReview(entry.review, wordId)
    validateScheduling(entry.scheduling, wordId)
  }
}

function validateReview(raw: unknown, wordId: string): void {
  if (!isRecord(raw))
    invalid(`data.progress[${wordId}].review`)
  assertExactKeys(raw, ['wordId', 'phase', 'dueAt', 'lastReviewedAt', 'reviewCount', 'lapseCount'], `data.progress[${wordId}].review`)

  if (raw.wordId !== wordId)
    invalid(`data.progress[${wordId}].review.wordId mismatch`)
  if (!PHASES.includes(raw.phase as ReviewPhase))
    invalid(`data.progress[${wordId}].review.phase`)
  if (!isTimestamp(raw.dueAt))
    invalid(`data.progress[${wordId}].review.dueAt`)
  if (raw.lastReviewedAt !== null && !isTimestamp(raw.lastReviewedAt))
    invalid(`data.progress[${wordId}].review.lastReviewedAt`)
  if (!isSafeNonNegativeInteger(raw.reviewCount))
    invalid(`data.progress[${wordId}].review.reviewCount`)
  if (!isSafeNonNegativeInteger(raw.lapseCount))
    invalid(`data.progress[${wordId}].review.lapseCount`)
}

function validateScheduling(raw: unknown, wordId: string): void {
  if (!isRecord(raw))
    invalid(`data.progress[${wordId}].scheduling`)
  assertExactKeys(raw, ['stability', 'difficulty', 'scheduledDays', 'learningSteps'], `data.progress[${wordId}].scheduling`)

  if (!isFiniteNumber(raw.stability))
    invalid(`data.progress[${wordId}].scheduling.stability`)
  if (!isFiniteNumber(raw.difficulty))
    invalid(`data.progress[${wordId}].scheduling.difficulty`)
  if (!isSafeNonNegativeInteger(raw.scheduledDays))
    invalid(`data.progress[${wordId}].scheduling.scheduledDays`)
  if (!isSafeNonNegativeInteger(raw.learningSteps))
    invalid(`data.progress[${wordId}].scheduling.learningSteps`)
}

function validateSession(raw: unknown): void {
  if (!isRecord(raw))
    invalid('data.activeSession')
  assertExactKeys(
    raw,
    ['id', 'mode', 'queue', 'currentIndex', 'results', 'status', 'startedAt', 'updatedAt', 'completedAt'],
    'data.activeSession',
  )

  if (!isNonEmptyString(raw.id))
    invalid('data.activeSession.id')
  if (!MODES.includes(raw.mode as StudyMode))
    invalid('data.activeSession.mode')
  if (!Array.isArray(raw.queue) || raw.queue.length === 0 || !raw.queue.every(isNonEmptyString))
    invalid('data.activeSession.queue')
  if (new Set(raw.queue).size !== raw.queue.length)
    invalid('data.activeSession.queue duplicates')
  if (!isSafeNonNegativeInteger(raw.currentIndex) || raw.currentIndex > raw.queue.length)
    invalid('data.activeSession.currentIndex')
  if (!SESSION_STATUSES.includes(raw.status as SessionStatus))
    invalid('data.activeSession.status')
  if (!isTimestamp(raw.startedAt))
    invalid('data.activeSession.startedAt')
  if (!isTimestamp(raw.updatedAt))
    invalid('data.activeSession.updatedAt')
  if (raw.completedAt !== null && !isTimestamp(raw.completedAt))
    invalid('data.activeSession.completedAt')

  validateResults(raw.results, raw.queue)
}

function validateResults(raw: unknown, queue: readonly string[]): void {
  if (!isRecord(raw))
    invalid('data.activeSession.results')

  for (const [wordId, entry] of Object.entries(raw)) {
    if (!queue.includes(wordId))
      invalid(`data.activeSession.results[${wordId}] not in queue`)
    if (!isRecord(entry))
      invalid(`data.activeSession.results[${wordId}]`)
    assertExactKeys(entry, ['wordId', 'rating', 'ratedAt'], `data.activeSession.results[${wordId}]`)

    if (entry.wordId !== wordId)
      invalid(`data.activeSession.results[${wordId}].wordId mismatch`)
    if (!RATINGS.includes(entry.rating as Rating))
      invalid(`data.activeSession.results[${wordId}].rating`)
    if (!isTimestamp(entry.ratedAt))
      invalid(`data.activeSession.results[${wordId}].ratedAt`)
  }
}
