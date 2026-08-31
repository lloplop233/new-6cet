import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { BackupData, BackupEnvelope } from './backup'
import type { Rating, ReviewState, Timestamp } from './review'
import type { Settings } from './settings'
import type { SessionResult, StudyMode, StudySession } from './study'
import type { Word } from './word'

export const WORD_FIXTURE = {
  id: 'dignity',
  text: 'dignity',
  rank: 12,
  phonetic: '\'dɪɡnəti',
  senses: [
    { partOfSpeech: 'n', definition: '尊严；庄重' },
  ],
  examples: [
    { english: 'They have to be treated with dignity.', chinese: '必须有尊严地对待他们。' },
  ],
  realExamYears: ['2013.6'],
} satisfies Word

export const NOW: Timestamp = 1788105600000

export const REVIEW_FIXTURE = {
  wordId: WORD_FIXTURE.id,
  phase: 'review',
  dueAt: NOW,
  lastReviewedAt: NOW - 86_400_000,
  reviewCount: 3,
  lapseCount: 1,
} satisfies ReviewState

export const SESSION_FIXTURE = {
  id: 'session-2026-08-31-001',
  mode: 'flashcard',
  queue: [WORD_FIXTURE.id],
  currentIndex: 0,
  results: {
    [WORD_FIXTURE.id]: {
      wordId: WORD_FIXTURE.id,
      rating: 'good',
      ratedAt: NOW,
    },
  },
  status: 'completed',
  startedAt: NOW - 60_000,
  updatedAt: NOW,
  completedAt: NOW,
} satisfies StudySession

export const SETTINGS_FIXTURE = {
  targetWordCount: 2500,
  preferredMode: 'flashcard',
  autoPronounce: false,
  updatedAt: NOW,
} satisfies Settings

export const BACKUP_FIXTURE = {
  schemaVersion: 1,
  appVersion: '0.1.0',
  exportedAt: NOW,
  data: {
    settings: SETTINGS_FIXTURE,
    reviews: {
      [WORD_FIXTURE.id]: REVIEW_FIXTURE,
    },
    activeSession: SESSION_FIXTURE,
  },
} satisfies BackupEnvelope

// @ts-expect-error BackupEnvelope 必须包含 appVersion
const INCOMPLETE_BACKUP: BackupEnvelope = {
  schemaVersion: 1,
  exportedAt: NOW,
  data: BACKUP_FIXTURE.data,
}
void INCOMPLETE_BACKUP

// @ts-expect-error Settings 必须显式包含 autoPronounce
const INCOMPLETE_SETTINGS: Settings = {
  targetWordCount: 2500,
  preferredMode: 'flashcard',
  updatedAt: NOW,
}
void INCOMPLETE_SETTINGS

const VALID_MODE: StudyMode = 'multiple-choice'
void VALID_MODE

// @ts-expect-error StudyMode 不允许未定义的模式
const INVALID_MODE: StudyMode = 'spelling'
void INVALID_MODE

const VALID_RATING: Rating = 'good'
void VALID_RATING

// @ts-expect-error Rating 只允许 again、hard、good
const INVALID_RATING: Rating = 'easy'
void INVALID_RATING

// @ts-expect-error Timestamp 必须是 number，不能保存 Date
const INVALID_TIMESTAMP: Timestamp = new Date()
void INVALID_TIMESTAMP

// @ts-expect-error Rating 必须拒绝 null
const NULL_RATING: Rating = null
void NULL_RATING

// @ts-expect-error 必填释义必须拒绝 undefined
const UNDEFINED_DEFINITION: Word['senses'][number]['definition'] = undefined
void UNDEFINED_DEFINITION

const NULL_PHONETIC: Word['phonetic'] = null
const NULL_COMPLETED_AT: StudySession['completedAt'] = null
void NULL_PHONETIC
void NULL_COMPLETED_AT

// @ts-expect-error Word 必须包含完整的词库字段
const INCOMPLETE_WORD: Word = { id: 'dignity' }
void INCOMPLETE_WORD

function assertWordReadonly(word: Word) {
  // @ts-expect-error Word 顶层字段不可修改
  word.text = 'changed'
  // @ts-expect-error Word 嵌套集合不可追加
  word.senses.push({ partOfSpeech: 'n', definition: '变更' })
  // @ts-expect-error WordSense 字段不可修改
  word.senses[0].definition = 'changed'
}
void assertWordReadonly

const SESSION: StudySession = SESSION_FIXTURE
// @ts-expect-error 未评分的 WordId 不保证存在 SessionResult
const REQUIRED_SESSION_RESULT: SessionResult = SESSION.results.missing
void REQUIRED_SESSION_RESULT

const BACKUP: BackupEnvelope = BACKUP_FIXTURE
// @ts-expect-error 未复习的 WordId 不保证存在 ReviewState
const REQUIRED_REVIEW_STATE: ReviewState = BACKUP.data.reviews.missing
void REQUIRED_REVIEW_STATE

const BACKUP_DATA: BackupData = BACKUP_FIXTURE.data
// @ts-expect-error BackupData 不得暴露静态词库本体
void BACKUP_DATA.words

describe('domain types', () => {
  it('keeps a word fixture JSON-serializable', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(WORD_FIXTURE)), WORD_FIXTURE)
  })

  it('keeps review timestamps as JSON numbers', () => {
    assert.equal(typeof REVIEW_FIXTURE.dueAt, 'number')
    assert.equal(typeof REVIEW_FIXTURE.lastReviewedAt, 'number')
  })

  it('round-trips a known session result keyed by WordId', () => {
    assert.equal(SESSION_FIXTURE.results.dignity.wordId, WORD_FIXTURE.id)
    assert.equal(SESSION_FIXTURE.queue[0], WORD_FIXTURE.id)
  })

  it('keeps confirmed settings explicit', () => {
    assert.equal(SETTINGS_FIXTURE.targetWordCount, 2500)
    assert.equal(SETTINGS_FIXTURE.autoPronounce, false)
  })

  it('round-trips a complete backup through JSON', () => {
    const restored = JSON.parse(JSON.stringify(BACKUP_FIXTURE))

    assert.deepEqual(restored, BACKUP_FIXTURE)
    assert.equal('words' in restored.data, false)
  })
})
