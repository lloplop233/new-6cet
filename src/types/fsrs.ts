export interface FsrsSchedulingState {
  stability: number
  difficulty: number
  scheduledDays: number
  learningSteps: number
}

export interface FsrsParametersSnapshot {
  requestRetention: number
  maximumInterval: number
  weights: readonly number[]
  enableFuzz: boolean
  enableShortTerm: boolean
  learningSteps: readonly string[]
  relearningSteps: readonly string[]
}
