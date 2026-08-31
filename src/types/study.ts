import type { Rating, Timestamp } from './review'
import type { WordId } from './word'

export type StudyMode = 'flashcard' | 'multiple-choice'

export type SessionStatus = 'active' | 'completed'

export interface SessionResult {
  wordId: WordId
  rating: Rating
  ratedAt: Timestamp
}

export interface StudySession {
  id: string
  mode: StudyMode
  queue: readonly WordId[]
  currentIndex: number
  results: Readonly<Partial<Record<WordId, SessionResult>>>
  status: SessionStatus
  startedAt: Timestamp
  updatedAt: Timestamp
  completedAt: Timestamp | null
}
