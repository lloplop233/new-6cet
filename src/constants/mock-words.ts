import type { Word } from '@/types/word'

export interface MockStudyItem {
  readonly word: Word
  readonly options: readonly [string, string, string, string]
  readonly correctIndex: number
}

export const MOCK_STUDY_ITEMS = [
  {
    word: {
      id: 'abandon',
      text: 'abandon',
      rank: 1,
      phonetic: '/əˈbændən/',
      senses: [{ partOfSpeech: 'v.', definition: '放弃；抛弃' }],
      examples: [{ english: 'They refused to abandon the plan.', chinese: '他们拒绝放弃这项计划。' }],
      realExamYears: ['Mock'],
    },
    options: ['放弃；抛弃', '维持；支撑', '仔细考虑', '模糊不清的'],
    correctIndex: 0,
  },
  {
    word: {
      id: 'deliberate',
      text: 'deliberate',
      rank: 2,
      phonetic: '/dɪˈlɪbərət/',
      senses: [{ partOfSpeech: 'adj.', definition: '深思熟虑的；故意的' }],
      examples: [{ english: 'It was a deliberate decision.', chinese: '这是一个经过深思熟虑的决定。' }],
      realExamYears: ['Mock'],
    },
    options: ['暂定的', '深思熟虑的；故意的', '令人信服的', '维持；支撑'],
    correctIndex: 1,
  },
  {
    word: {
      id: 'compelling',
      text: 'compelling',
      rank: 3,
      phonetic: '/kəmˈpelɪŋ/',
      senses: [{ partOfSpeech: 'adj.', definition: '令人信服的；引人入胜的' }],
      examples: [{ english: 'She made a compelling argument.', chinese: '她提出了一个令人信服的论点。' }],
      realExamYears: ['Mock'],
    },
    options: ['模糊不清的', '放弃；抛弃', '令人信服的；引人入胜的', '暂定的'],
    correctIndex: 2,
  },
  {
    word: {
      id: 'obscure',
      text: 'obscure',
      rank: 4,
      phonetic: '/əbˈskjʊr/',
      senses: [{ partOfSpeech: 'adj.', definition: '模糊不清的；鲜为人知的' }],
      examples: [{ english: 'The reference remains obscure.', chinese: '这处引用仍然晦涩难懂。' }],
      realExamYears: ['Mock'],
    },
    options: ['维持；支撑', '深思熟虑的', '令人信服的', '模糊不清的；鲜为人知的'],
    correctIndex: 3,
  },
  {
    word: {
      id: 'sustain',
      text: 'sustain',
      rank: 5,
      phonetic: '/səˈsteɪn/',
      senses: [{ partOfSpeech: 'v.', definition: '维持；支撑' }],
      examples: [{ english: 'The system must sustain long-term use.', chinese: '这个系统必须支持长期使用。' }],
      realExamYears: ['Mock'],
    },
    options: ['维持；支撑', '暂定的', '放弃；抛弃', '模糊不清的'],
    correctIndex: 0,
  },
  {
    word: {
      id: 'tentative',
      text: 'tentative',
      rank: 6,
      phonetic: '/ˈtentətɪv/',
      senses: [{ partOfSpeech: 'adj.', definition: '暂定的；试探性的' }],
      examples: [{ english: 'We reached a tentative agreement.', chinese: '我们达成了一项暂定协议。' }],
      realExamYears: ['Mock'],
    },
    options: ['令人信服的', '维持；支撑', '暂定的；试探性的', '深思熟虑的'],
    correctIndex: 2,
  },
] as const satisfies readonly MockStudyItem[]

export const MOCK_RESULT_SEGMENTS = [
  'know',
  'know',
  'vague',
  'know',
  'unknown',
  'know',
] as const
