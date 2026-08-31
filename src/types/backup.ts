import type { ReviewState, Timestamp } from './review'
import type { Settings } from './settings'
import type { StudySession } from './study'
import type { WordId } from './word'

export interface BackupData {
  settings: Settings
  reviews: Readonly<Record<WordId, ReviewState>>
  activeSession: StudySession | null
}

export interface BackupEnvelope {
  schemaVersion: number
  appVersion: string
  exportedAt: Timestamp
  data: BackupData
}
