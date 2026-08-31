import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createEmptyCard, fsrs, Rating as FsrsRating, State } from 'ts-fsrs'
import type { Card, CardInput } from 'ts-fsrs'

// @ts-expect-error Node.js test runner resolves the native TypeScript module by extension.
import { FSRS_PARAMETER_OVERRIDES, MAX_TIMESTAMP } from '../constants/fsrs.ts'

import type { FsrsSchedulingState } from '../types/fsrs'
import type { ReviewState } from '../types/review'
// @ts-expect-error Node.js test runner resolves the native TypeScript module by extension.
import { createFsrsParametersSnapshot, dateToTimestamp, fromFsrsState, timestampToDate, toFsrsRating, toFsrsState } from './fsrs.ts'

function persistCard(wordId: ReviewState['wordId'], card: Card) {
  const review = {
    wordId,
    phase: fromFsrsState(card.state),
    dueAt: dateToTimestamp(card.due),
    lastReviewedAt: card.last_review ? dateToTimestamp(card.last_review) : null,
    reviewCount: card.reps,
    lapseCount: card.lapses,
  } satisfies ReviewState
  const scheduling = {
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
  } satisfies FsrsSchedulingState

  return { review, scheduling }
}

function restoreCard(review: ReviewState, scheduling: FsrsSchedulingState): CardInput {
  return {
    due: timestampToDate(review.dueAt),
    stability: scheduling.stability,
    difficulty: scheduling.difficulty,
    elapsed_days: 0,
    scheduled_days: scheduling.scheduledDays,
    learning_steps: scheduling.learningSteps,
    reps: review.reviewCount,
    lapses: review.lapseCount,
    state: toFsrsState(review.phase),
    last_review: review.lastReviewedAt === null ? null : timestampToDate(review.lastReviewedAt),
  }
}

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

    type ProductFsrsRating = ReturnType<typeof toFsrsRating>
    const schedulerGrade: Parameters<ReturnType<typeof fsrs>['next']>[2] = toFsrsRating('good')
    // @ts-expect-error The product rating boundary must not expose Easy.
    const excludedEasy: ProductFsrsRating = FsrsRating.Easy

    assert.equal(schedulerGrade, FsrsRating.Good)
    assert.equal(excludedEasy, FsrsRating.Easy)
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

describe('FSRS parameters and new-card behavior', () => {
  it('freezes the complete FSRS-6 parameter snapshot', () => {
    const snapshot = createFsrsParametersSnapshot()
    const secondSnapshot = createFsrsParametersSnapshot()

    assert.equal(snapshot.requestRetention, 0.9)
    assert.equal(snapshot.maximumInterval, 36_500)
    assert.equal(snapshot.enableFuzz, false)
    assert.equal(snapshot.enableShortTerm, true)
    assert.deepEqual(snapshot.learningSteps, ['1m', '10m'])
    assert.deepEqual(snapshot.relearningSteps, ['10m'])
    assert.equal(snapshot.weights.length, 21)
    assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot)
    assert.notEqual(snapshot.weights, secondSnapshot.weights)
    assert.notEqual(snapshot.learningSteps, secondSnapshot.learningSteps)
    assert.notEqual(snapshot.relearningSteps, secondSnapshot.relearningSteps)
    assert.notEqual(snapshot.learningSteps, FSRS_PARAMETER_OVERRIDES.learningSteps)
    assert.notEqual(snapshot.relearningSteps, FSRS_PARAMETER_OVERRIDES.relearningSteps)
  })

  it('keeps the new-card learning-step golden behavior', () => {
    const now = 1_788_105_600_000
    const scheduler = fsrs()
    const cases = [
      ['again', 60_000],
      ['hard', 360_000],
      ['good', 600_000],
    ] as const

    for (const [rating, expectedOffset] of cases) {
      const card = createEmptyCard(timestampToDate(now))
      const result = scheduler.next(card, timestampToDate(now), toFsrsRating(rating))
      assert.equal(result.card.due.getTime() - now, expectedOffset)
    }
  })
})

describe('FSRS JSON state recovery', () => {
  it('continues the current learning step exactly like the in-memory card', () => {
    const now = 1_788_105_600_000
    const scheduler = fsrs()
    const initial = createEmptyCard(timestampToDate(now))
    const first = scheduler.next(initial, timestampToDate(now), toFsrsRating('again'))
    const direct = scheduler.next(first.card, first.card.due, toFsrsRating('good'))

    const persisted = persistCard('dignity', first.card)
    const serialized = JSON.stringify(persisted)
    const recovered = JSON.parse(serialized) as ReturnType<typeof persistCard>
    const restored = restoreCard(recovered.review, recovered.scheduling)
    const resumed = scheduler.next(restored, first.card.due, toFsrsRating('good'))

    assert.equal(first.card.state, State.Learning)
    assert.equal(recovered.scheduling.learningSteps, first.card.learning_steps)
    assert.equal(restored.learning_steps, first.card.learning_steps)
    assert.equal(resumed.card.state, direct.card.state)
    assert.equal(resumed.card.learning_steps, direct.card.learning_steps)
    assert.equal(resumed.card.due.getTime(), direct.card.due.getTime())
    assert.equal(serialized.includes('elapsed_days'), false)
    assert.equal(serialized.includes('Date'), false)
    assert.equal(typeof recovered.review.dueAt, 'number')
    assert.equal(typeof recovered.review.lastReviewedAt, 'number')
    assert.equal(Object.keys(recovered.review).some(key => key in recovered.scheduling), false)
  })
})
