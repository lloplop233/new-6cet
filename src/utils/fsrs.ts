import { Rating as FsrsRating, generatorParameters, State } from 'ts-fsrs'

// @ts-expect-error Node.js test runner resolves the native TypeScript module by extension.
import { FSRS_PARAMETER_OVERRIDES, MAX_TIMESTAMP } from '../constants/fsrs.ts'
import type { FsrsParametersSnapshot } from '../types/fsrs'
import type { Rating, ReviewPhase } from '../types/review'

const RATING_MAP = Object.freeze({
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
})

type ProductFsrsRating = FsrsRating.Again | FsrsRating.Hard | FsrsRating.Good

export function toFsrsRating(rating: Rating): ProductFsrsRating {
  return RATING_MAP[rating]
}

export function createFsrsParametersSnapshot(): FsrsParametersSnapshot {
  const params = generatorParameters({
    request_retention: FSRS_PARAMETER_OVERRIDES.requestRetention,
    maximum_interval: FSRS_PARAMETER_OVERRIDES.maximumInterval,
    enable_fuzz: FSRS_PARAMETER_OVERRIDES.enableFuzz,
    enable_short_term: FSRS_PARAMETER_OVERRIDES.enableShortTerm,
    learning_steps: [...FSRS_PARAMETER_OVERRIDES.learningSteps],
    relearning_steps: [...FSRS_PARAMETER_OVERRIDES.relearningSteps],
  })

  return {
    requestRetention: params.request_retention,
    maximumInterval: params.maximum_interval,
    weights: [...params.w],
    enableFuzz: params.enable_fuzz,
    enableShortTerm: params.enable_short_term,
    learningSteps: [...params.learning_steps],
    relearningSteps: [...params.relearning_steps],
  }
}

export function timestampToDate(value: unknown): Date {
  if (
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || value < 0
    || value > MAX_TIMESTAMP
  ) {
    throw new RangeError('Invalid timestamp')
  }

  const date = new Date(value)
  const timestamp = date.getTime()
  if (!Number.isFinite(timestamp) || !Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > MAX_TIMESTAMP)
    throw new RangeError('Invalid timestamp')
  return date
}

export function dateToTimestamp(value: Date): number {
  if (!(value instanceof Date))
    throw new RangeError('Invalid date')
  const timestamp = value.getTime()
  if (!Number.isFinite(timestamp) || !Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > MAX_TIMESTAMP)
    throw new RangeError('Invalid date')
  return timestamp
}

export function toFsrsState(phase: ReviewPhase): State {
  switch (phase) {
    case 'new': return State.New
    case 'learning': return State.Learning
    case 'review': return State.Review
    case 'relearning': return State.Relearning
  }
}

export function fromFsrsState(state: State): ReviewPhase {
  switch (state) {
    case State.New: return 'new'
    case State.Learning: return 'learning'
    case State.Review: return 'review'
    case State.Relearning: return 'relearning'
    default: throw new RangeError(`Unsupported FSRS state: ${state}`)
  }
}
