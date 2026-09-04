import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { MOCK_VOCABULARY } from '../constants/mock-vocabulary.ts'
import type { Word, WordId } from '../types/word'
import { buildStudyQueue, createStudySession, currentWordId, isSessionFinished, rateWord } from './study-session.ts'

const NOW = 1_788_105_600_000

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

describe('mock vocabulary', () => {
  it('contains exactly 20 words', () => {
    assert.equal(MOCK_VOCABULARY.length, 20)
  })

  it('has unique ids and unique ranks', () => {
    const ids = MOCK_VOCABULARY.map(word => word.id)
    const ranks = MOCK_VOCABULARY.map(word => word.rank)
    assert.equal(new Set(ids).size, ids.length)
    assert.equal(new Set(ranks).size, ranks.length)
  })

  it('keeps every field structurally complete', () => {
    for (const word of MOCK_VOCABULARY) {
      assert.ok(word.text.length > 0)
      assert.ok(word.phonetic !== null)
      assert.equal(word.senses.length, 1)
      assert.ok(word.senses[0].definition.length > 0)
      assert.equal(word.examples.length, 1)
      assert.ok(word.examples[0]!.english.length > 0)
      assert.ok(word.examples[0]!.chinese !== null)
      assert.equal(word.id, word.text)
    }
  })

  it('has no overlap with the V0 six-word mock set', () => {
    const v0Ids = new Set(['abandon', 'deliberate', 'compelling', 'obscure', 'sustain', 'tentative'])
    for (const word of MOCK_VOCABULARY)
      assert.ok(!v0Ids.has(word.id), `unexpected overlap with V0: ${word.id}`)
  })
})

describe('buildStudyQueue', () => {
  it('orders all word ids by ascending rank', () => {
    const shuffled = [...MOCK_VOCABULARY].reverse()
    const queue = buildStudyQueue(shuffled)
    assert.equal(queue.length, 20)
    assert.deepEqual(queue, MOCK_VOCABULARY.map(word => word.id))
  })

  it('contains no duplicate ids', () => {
    const queue = buildStudyQueue(MOCK_VOCABULARY)
    assert.equal(new Set(queue).size, queue.length)
  })

  it('is deterministic and does not mutate its input', () => {
    const input = [...MOCK_VOCABULARY]
    const snapshot = [...input]
    const first = buildStudyQueue(input)
    const second = buildStudyQueue(input)
    assert.deepEqual(first, second)
    assert.deepEqual(input, snapshot)
  })

  it('returns an empty queue for an empty library', () => {
    assert.deepEqual(buildStudyQueue([]), [])
  })

  it('throws on a library with duplicate ids', () => {
    const library = [makeWord('w1', 1), makeWord('w1', 2)]
    assert.throws(() => buildStudyQueue(library), /Duplicate word id/)
  })
})

describe('createStudySession', () => {
  it('creates an initial active session at position zero', () => {
    const queue = buildStudyQueue(MOCK_VOCABULARY)
    const session = createStudySession({ id: 's1', mode: 'flashcard', queue, startedAt: NOW })

    assert.equal(session.id, 's1')
    assert.equal(session.mode, 'flashcard')
    assert.deepEqual(session.queue, queue)
    assert.equal(session.currentIndex, 0)
    assert.deepEqual(session.results, {})
    assert.equal(session.status, 'active')
    assert.equal(session.startedAt, NOW)
    assert.equal(session.updatedAt, NOW)
    assert.equal(session.completedAt, null)
  })

  it('copies the queue instead of aliasing the caller array', () => {
    const queue: WordId[] = ['a', 'b', 'c']
    const session = createStudySession({ id: 's1', mode: 'flashcard', queue, startedAt: NOW })
    queue.push('d')

    assert.equal(session.queue.length, 3)
  })

  it('throws on an empty queue', () => {
    assert.throws(() => createStudySession({ id: 's1', mode: 'flashcard', queue: [], startedAt: NOW }), /must not be empty/)
  })

  it('throws on a queue with duplicate ids', () => {
    assert.throws(() => createStudySession({ id: 's1', mode: 'flashcard', queue: ['a', 'a'], startedAt: NOW }), /duplicate/i)
  })
})

describe('currentWordId / isSessionFinished', () => {
  const queue = buildStudyQueue(MOCK_VOCABULARY)
  const session = createStudySession({ id: 's1', mode: 'flashcard', queue, startedAt: NOW })

  it('returns every in-bounds index and null exactly at the end', () => {
    for (let index = 0; index <= queue.length; index++) {
      const probe = { ...session, currentIndex: index }
      assert.equal(currentWordId(probe), index < queue.length ? queue[index] : null)
    }
  })

  it('is not finished at the start and finished only at the end', () => {
    const mid = { ...session, currentIndex: 10 }
    const end = { ...session, currentIndex: queue.length }
    assert.equal(isSessionFinished(session), false)
    assert.equal(isSessionFinished(mid), false)
    assert.equal(isSessionFinished(end), true)
  })

  it('keeps finished consistent with currentWordId being null', () => {
    for (let index = 0; index <= queue.length; index++) {
      const probe = { ...session, currentIndex: index }
      assert.equal(isSessionFinished(probe), currentWordId(probe) === null)
    }
  })
})

describe('rateWord', () => {
  const queue = buildStudyQueue(MOCK_VOCABULARY)
  const session = createStudySession({ id: 's1', mode: 'flashcard', queue, startedAt: NOW })

  it('records one result and advances exactly one step', () => {
    const next = rateWord(session, queue[0]!, 'good', NOW + 1000)

    assert.equal(Object.keys(next.results).length, 1)
    assert.deepEqual(next.results[queue[0]], { wordId: queue[0], rating: 'good', ratedAt: NOW + 1000 })
    assert.equal(next.currentIndex, 1)
    assert.equal(next.status, 'active')
    assert.equal(next.completedAt, null)
    assert.equal(next.updatedAt, NOW + 1000)
  })

  it('never double-counts the same word', () => {
    const first = rateWord(session, queue[0]!, 'good', NOW + 1000)
    const second = rateWord(first, queue[0]!, 'hard', NOW + 2000)

    assert.equal(second, first)
    assert.equal(Object.keys(second.results).length, 1)
    assert.equal(second.results[queue[0]]?.rating, 'good')
    assert.equal(second.currentIndex, 1)
  })

  it('rates the whole queue without skipping or repeating words', () => {
    let current = session
    for (let index = 0; index < queue.length; index++) {
      const rating = index % 3 === 0 ? 'good' : index % 3 === 1 ? 'hard' : 'again'
      current = rateWord(current, queue[index]!, rating, NOW + index)
    }

    assert.equal(Object.keys(current.results).length, queue.length)
    assert.equal(current.currentIndex, queue.length)
    assert.equal(current.status, 'completed')
    assert.equal(current.completedAt, NOW + queue.length - 1)
    assert.equal(isSessionFinished(current), true)
    assert.equal(currentWordId(current), null)
    for (const wordId of queue)
      assert.ok(current.results[wordId] !== undefined)
  })

  it('rejects a word that is not at the current position', () => {
    assert.throws(() => rateWord(session, queue[1]!, 'good', NOW), /not the current word/i)
  })

  it('rejects rating past the end of the queue', () => {
    const finished = { ...session, currentIndex: queue.length, status: 'completed' as const, completedAt: NOW }
    assert.throws(() => rateWord(finished, queue[0]!, 'good', NOW), /completed session|past the end/i)
  })

  it('does not mutate the original session', () => {
    const snapshot = JSON.stringify(session)
    rateWord(session, queue[0]!, 'good', NOW + 1000)

    assert.equal(JSON.stringify(session), snapshot)
  })
})
