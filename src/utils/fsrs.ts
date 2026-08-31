import { State } from 'ts-fsrs'

import type { ReviewPhase } from '../types/review'

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
