export const FSRS_ALGORITHM = 'FSRS-6' as const
export const FSRS_LIBRARY = 'ts-fsrs' as const
export const FSRS_LIBRARY_VERSION = '5.4.1' as const

export const FSRS_PARAMETER_OVERRIDES = Object.freeze({
  requestRetention: 0.9,
  maximumInterval: 36_500,
  enableFuzz: false,
  enableShortTerm: true,
  learningSteps: Object.freeze(['1m', '10m'] as const),
  relearningSteps: Object.freeze(['10m'] as const),
})
