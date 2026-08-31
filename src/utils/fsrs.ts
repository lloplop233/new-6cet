import { Rating as FsrsRating, State } from 'ts-fsrs'

// @ts-expect-error Node.js test runner resolves the native TypeScript module by extension.
import { MAX_TIMESTAMP } from '../constants/fsrs.ts'
import type { Rating, ReviewPhase } from '../types/review'

const RATING_MAP = Object.freeze({
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
})

export function toFsrsRating(rating: Rating): FsrsRating {
  return RATING_MAP[rating]
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
