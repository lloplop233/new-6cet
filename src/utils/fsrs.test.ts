import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createEmptyCard, fsrs, State } from 'ts-fsrs'

import type { FsrsSchedulingState } from '../types/fsrs'
import type { ReviewState } from '../types/review'
// @ts-expect-error Node.js test runner resolves the native TypeScript module by extension.
import { fromFsrsState, toFsrsState } from './fsrs.ts'

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
