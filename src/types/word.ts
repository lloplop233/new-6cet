export type WordId = string

export interface WordSense {
  readonly partOfSpeech: string | null
  readonly definition: string
}

export interface WordExample {
  readonly english: string
  readonly chinese: string | null
}

export interface Word {
  readonly id: WordId
  readonly text: string
  readonly rank: number
  readonly phonetic: string | null
  readonly senses: readonly WordSense[]
  readonly examples: readonly WordExample[]
  readonly realExamYears: readonly string[]
}
