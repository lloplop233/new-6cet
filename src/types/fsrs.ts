export interface FsrsSchedulingState {
  stability: number
  difficulty: number
  scheduledDays: number
  learningSteps: number
}

// 与 ts-fsrs 的 StepUnit 结构等价，自己声明是为了让领域类型保持零第三方依赖，
// 同时让参数快照能原样回喂给调度库。
export type FsrsStepUnit = `${number}m` | `${number}h` | `${number}d`

export interface FsrsParametersSnapshot {
  requestRetention: number
  maximumInterval: number
  weights: readonly number[]
  enableFuzz: boolean
  enableShortTerm: boolean
  learningSteps: readonly FsrsStepUnit[]
  relearningSteps: readonly FsrsStepUnit[]
}
