import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

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

// @ts-expect-error Word 必须包含完整的词库字段
const INCOMPLETE_WORD: Word = { id: 'dignity' }
void INCOMPLETE_WORD

describe('domain types', () => {
  it('keeps a word fixture JSON-serializable', () => {
    assert.deepEqual(JSON.parse(JSON.stringify(WORD_FIXTURE)), WORD_FIXTURE)
  })
})
