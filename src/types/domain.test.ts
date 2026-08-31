import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { Rating, ReviewState, Timestamp } from './review'
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

const VALID_RATING: Rating = 'good'
void VALID_RATING

// @ts-expect-error Rating 只允许 again、hard、good
const INVALID_RATING: Rating = 'easy'
void INVALID_RATING

// @ts-expect-error Timestamp 必须是 number，不能保存 Date
const INVALID_TIMESTAMP: Timestamp = new Date()
void INVALID_TIMESTAMP

// @ts-expect-error Word 必须包含完整的词库字段
const INCOMPLETE_WORD: Word = { id: 'dignity' }
void INCOMPLETE_WORD

describe('domain types', () => {
  it('keeps a word fixture JSON-serializable', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(WORD_FIXTURE)), WORD_FIXTURE)
  })

  it('keeps review timestamps as JSON numbers', () => {
    assert.equal(typeof REVIEW_FIXTURE.dueAt, 'number')
    assert.equal(typeof REVIEW_FIXTURE.lastReviewedAt, 'number')
  })
})
