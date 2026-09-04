import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { createEmptyCard, fsrs, Rating as FsrsRating, FSRSVersion, State } from 'ts-fsrs'
import type { Card, CardInput } from 'ts-fsrs'

import { FSRS_ALGORITHM, FSRS_LIBRARY, FSRS_LIBRARY_VERSION, FSRS_PARAMETER_OVERRIDES } from '../constants/fsrs.ts'
import { MAX_TIMESTAMP } from '../constants/timestamp.ts'

import type { FsrsSchedulingState } from '../types/fsrs'
import type { ReviewState } from '../types/review'
import { createFsrsParametersSnapshot, dateToTimestamp, fromFsrsState, timestampToDate, toFsrsParameters, toFsrsRating, toFsrsState } from './fsrs.ts'

// 21 个 FSRS-6 默认权重的具体值。冻结数值本身，升级依赖若改动任何一位都会在这里失败。
const FROZEN_FSRS6_WEIGHTS = [
  0.212,
  1.2931,
  2.3065,
  8.2956,
  6.4133,
  0.8334,
  3.0194,
  0.001,
  1.8722,
  0.1666,
  0.796,
  1.4835,
  0.0614,
  0.2629,
  1.6483,
  0.6014,
  1.8729,
  0.5425,
  0.0912,
  0.0658,
  0.1542,
]

// 用项目冻结的参数快照构造调度器，而不是裸 fsrs()。裸调用读的是库自己的默认值，
// 一旦项目参数被改动，golden test 仍会通过，等于没有保护。
function createProjectScheduler() {
  return fsrs(toFsrsParameters(createFsrsParametersSnapshot()))
}

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
    const [major, minor] = process.versions.node.split('.').map(Number)

    // 与 package.json engines 的 >=22.23.0 对齐；.ts 扩展导入直跑依赖该基线的 type stripping。
    assert.ok(major > 22 || (major === 22 && minor >= 23))
  })

  it('binds the recorded library metadata to the installed dependency', () => {
    const manifest = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { dependencies: Record<string, string> }

    // 常量会进入存储协议的 scheduler 元数据，只改依赖不改常量会让持久化数据说谎。
    assert.equal(manifest.dependencies[FSRS_LIBRARY], FSRS_LIBRARY_VERSION)
    assert.equal(FSRSVersion, `v${FSRS_LIBRARY_VERSION} using ${FSRS_ALGORITHM}.0`)
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
    const invalid = [8_640_000_000_000_001, Number.NaN, Infinity, 1.5, -1]

    for (const value of invalid)
      assert.throws(() => timestampToDate(value), RangeError)
  })

  it('refuses nullable timestamps at compile time', () => {
    // ReviewState.lastReviewedAt 是 Timestamp | null，收窄签名后调用方必须显式处理 null。
    // 这条指令若不再报错说明签名被放宽了，TS2578 会让类型检查失败。
    // @ts-expect-error timestampToDate 只接受 Timestamp。
    assert.throws(() => timestampToDate(null), RangeError)
  })

  it('rejects Invalid Date', () => {
    assert.throws(() => dateToTimestamp(new Date(Number.NaN)), RangeError)
  })

  it('rejects dates before the Unix epoch', () => {
    assert.throws(() => dateToTimestamp(new Date('1969-12-31T23:59:59.999Z')), RangeError)
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
    assert.deepEqual(snapshot.weights, FROZEN_FSRS6_WEIGHTS)
    assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot)
    assert.notEqual(snapshot.weights, secondSnapshot.weights)
    assert.notEqual(snapshot.learningSteps, secondSnapshot.learningSteps)
    assert.notEqual(snapshot.relearningSteps, secondSnapshot.relearningSteps)
    assert.notEqual(snapshot.learningSteps, FSRS_PARAMETER_OVERRIDES.learningSteps)
    assert.notEqual(snapshot.relearningSteps, FSRS_PARAMETER_OVERRIDES.relearningSteps)
  })

  it('feeds a persisted snapshot back into the scheduler without drift', () => {
    const snapshot = createFsrsParametersSnapshot()
    const recovered = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot
    const params = toFsrsParameters(recovered)

    // 快照必须能双向通过：写得出去、读得回来，且回喂后每一项都不被库的默认值替换。
    assert.equal(params.request_retention, snapshot.requestRetention)
    assert.equal(params.maximum_interval, snapshot.maximumInterval)
    assert.equal(params.enable_fuzz, snapshot.enableFuzz)
    assert.equal(params.enable_short_term, snapshot.enableShortTerm)
    assert.deepEqual([...params.w], [...snapshot.weights])
    assert.deepEqual([...params.learning_steps], [...snapshot.learningSteps])
    assert.deepEqual([...params.relearning_steps], [...snapshot.relearningSteps])
  })

  it('keeps the new-card learning-step golden behavior', () => {
    const now = 1_788_105_600_000
    const scheduler = createProjectScheduler()
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
    const scheduler = createProjectScheduler()
    const initial = createEmptyCard(timestampToDate(now))
    // 首轮必须用 good：评 again 会让 learning_steps 停在 0，而库内部把 0 与「字段缺失」
    // 当作同一件事，那样这个测试就检测不到 learning_steps 在存取过程中丢失。
    const first = scheduler.next(initial, timestampToDate(now), toFsrsRating('good'))
    const direct = scheduler.next(first.card, first.card.due, toFsrsRating('good'))

    const persisted = persistCard('dignity', first.card)
    const serialized = JSON.stringify(persisted)
    const recovered = JSON.parse(serialized) as ReturnType<typeof persistCard>
    const restored = restoreCard(recovered.review, recovered.scheduling)
    const resumed = scheduler.next(restored, first.card.due, toFsrsRating('good'))

    assert.equal(first.card.state, State.Learning)
    assert.equal(first.card.learning_steps, 1)
    assert.equal(recovered.scheduling.learningSteps, first.card.learning_steps)
    assert.equal(restored.learning_steps, first.card.learning_steps)
    assert.equal(resumed.card.state, direct.card.state)
    assert.equal(resumed.card.learning_steps, direct.card.learning_steps)
    assert.equal(resumed.card.due.getTime(), direct.card.due.getTime())

    // 严格往返：任何字段丢失、被截断或从 number 变成 ISO 字符串都会在这里失败。
    assert.deepStrictEqual(recovered, persisted)
    assert.deepEqual(Object.keys(recovered.review).sort(), [
      'dueAt',
      'lapseCount',
      'lastReviewedAt',
      'phase',
      'reviewCount',
      'wordId',
    ])
    assert.deepEqual(Object.keys(recovered.scheduling).sort(), [
      'difficulty',
      'learningSteps',
      'scheduledDays',
      'stability',
    ])
    assert.equal(typeof recovered.review.dueAt, 'number')
    assert.equal(typeof recovered.review.lastReviewedAt, 'number')
    assert.equal(Object.keys(recovered.review).some(key => key in recovered.scheduling), false)
  })
})
