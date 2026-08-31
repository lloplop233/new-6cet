import type { WordId } from './word'

export type Timestamp = number

export type Rating = 'again' | 'hard' | 'good'

export type ReviewPhase = 'new' | 'learning' | 'review' | 'relearning'

export interface ReviewState {
  wordId: WordId
  phase: ReviewPhase
  dueAt: Timestamp
  lastReviewedAt: Timestamp | null
  reviewCount: number
  lapseCount: number
}
