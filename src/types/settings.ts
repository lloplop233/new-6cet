import type { Timestamp } from './review'
import type { StudyMode } from './study'

export interface Settings {
  targetWordCount: number
  preferredMode: StudyMode
  autoPronounce: boolean
  updatedAt: Timestamp
}
