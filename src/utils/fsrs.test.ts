import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createEmptyCard, fsrs, Rating as FsrsRating, State } from 'ts-fsrs'

// @ts-expect-error Node.js test runner resolves the native TypeScript module by extension.
import { MAX_TIMESTAMP } from '../constants/fsrs.ts'

import type { FsrsSchedulingState } from '../types/fsrs'
import type { ReviewState } from '../types/review'
// @ts-expect-error Node.js test runner resolves the native TypeScript module by extension.
import { dateToTimestamp, fromFsrsState, timestampToDate, toFsrsRating, toFsrsState } from './fsrs.ts'

describe('FSRS dependency contract', () => {
  it('loads the scheduler through ESM', () => {
    assert.equal(typeof fsrs, 'function')
    assert.equal(createEmptyCard(new Date(0)).due.getTime(), 0)
  })

  it('runs on the declared Node.js baseline', () => {
    const major = Number.parseInt(process.versions.node.split('.')[0], 10)

    assert.ok(major >= 20)
  })
})

describe('FSRS state boundary', () => {
  it('maps every project phase in both directions', () => {
    const cases = [
      ['new', State.New],
      ['learning', State.Learning],
      ['review', State.Review],
      ['relearning', State.Relearning],
    ] as const

    for (const [phase, state] of cases) {
      assert.equal(toFsrsState(phase), state)
      assert.equal(fromFsrsState(state), phase)
    }
  })

  it('keeps business and algorithm state keys disjoint', () => {
    const review = {
      wordId: 'dignity',
      phase: 'learning',
      dueAt: 1_788_105_660_000,
      lastReviewedAt: 1_788_105_600_000,
      reviewCount: 1,
      lapseCount: 0,
    } satisfies ReviewState
    const scheduling = {
      stability: 2.3065,
      difficulty: 5,
      scheduledDays: 0,
      learningSteps: 1,
    } satisfies FsrsSchedulingState

    const overlappingKeys = Object.keys(review).filter(key => key in scheduling)
    assert.deepEqual(overlappingKeys, [])
  })
})

describe('FSRS rating and time boundary', () => {
  it('maps the three product ratings exactly', () => {
    assert.equal(toFsrsRating('again'), FsrsRating.Again)
    assert.equal(toFsrsRating('hard'), FsrsRating.Hard)
    assert.equal(toFsrsRating('good'), FsrsRating.Good)
  })

  it('round-trips the valid timestamp boundaries', () => {
    for (const timestamp of [0, 1_788_105_600_000, MAX_TIMESTAMP]) {
      assert.equal(dateToTimestamp(timestampToDate(timestamp)), timestamp)
    }
  })

  it('rejects every invalid timestamp input', () => {
    const invalid = [8_640_000_000_000_001, Number.NaN, Infinity, 1.5, -1, null]

    for (const value of invalid)
      assert.throws(() => timestampToDate(value), RangeError)
  })

  it('rejects Invalid Date', () => {
    assert.throws(() => dateToTimestamp(new Date(Number.NaN)), RangeError)
  })
})
