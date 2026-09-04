<script setup lang="ts">
import { MOCK_RESULT_SEGMENTS, MOCK_STUDY_ITEMS } from '@/constants/mock-words'
import { MOCK_VOCABULARY } from '@/constants/mock-vocabulary'
import { buildStudyQueue, createStudySession, currentWordId, isSessionFinished, rateWord } from '@/utils/study-session'
import type { Rating } from '@/types/review'
import type { StudySession } from '@/types/study'
import type { Word } from '@/types/word'

type VisualRating = 'know' | 'vague' | 'unknown'

const FLASHCARD_ADVANCE_DELAY = 450
const QUIZ_CORRECT_ADVANCE_DELAY = 400
const QUIZ_WRONG_ADVANCE_DELAY = 900

// 视觉档名与领域 Rating 的映射是 P1-2 冻结契约（认识=good、模糊=hard、不熟=again）。
const VISUAL_TO_RATING: Record<VisualRating, Rating> = {
  know: 'good',
  vague: 'hard',
  unknown: 'again',
}

const route = useRoute()
const router = useRouter()

const mode = computed(() => route.query.mode === 'multiple-choice'
  ? 'multiple-choice'
  : 'flashcard')
const isQuiz = computed(() => mode.value === 'multiple-choice')

// ---- 选择题：V0 Mock 流程原样保留（评分→Rating 转换属 P4-3/P4-4，冻结待决） ----
const quizIndex = ref(0)
const selectedOption = ref<number>()

// ---- 翻卡：真会话流程（P2-2） ----
const session = ref<StudySession>(createStudySession({
  id: `study-${Date.now()}`,
  mode: 'flashcard',
  queue: buildStudyQueue(MOCK_VOCABULARY),
  startedAt: Date.now(),
}))
const isRevealed = ref(false)
const selectedRating = ref<VisualRating>()
let advanceTimer: ReturnType<typeof setTimeout> | undefined

const vocabularyMap = computed(() => {
  const map = new Map<string, Word>()
  for (const word of MOCK_VOCABULARY) {
    map.set(word.id, word)
  }
  return map
})

const currentWord = computed(() => {
  const wordId = currentWordId(session.value)
  return wordId === null ? null : vocabularyMap.value.get(wordId) ?? null
})

const quizItem = computed(() => MOCK_STUDY_ITEMS[quizIndex.value])
const isAnswered = computed(() => selectedOption.value !== undefined)

const modeLabel = computed(() => isQuiz.value ? '选择题辨义' : '翻卡自评')

const queueSegments = computed(() => {
  if (isQuiz.value) {
    return MOCK_STUDY_ITEMS.map((_, index) => (
      index < quizIndex.value ? MOCK_RESULT_SEGMENTS[index] : 'pending'
    ))
  }

  return session.value.queue.map((wordId) => {
    const result = session.value.results[wordId]
    if (result === undefined)
      return 'pending'
    if (result.rating === 'good')
      return 'know'
    if (result.rating === 'hard')
      return 'vague'
    return 'unknown'
  })
})

const progressTotal = computed(() => isQuiz.value ? MOCK_STUDY_ITEMS.length : session.value.queue.length)
// 末词评完的反馈期内 currentIndex 已到 length，计数钳在 total，避免闪现 21/20。
const progressIndex = computed(() => {
  if (isQuiz.value)
    return quizIndex.value
  return Math.min(session.value.currentIndex, session.value.queue.length - 1)
})

function scheduleAdvance(delay: number) {
  advanceTimer = setTimeout(() => {
    advanceTimer = undefined
    goNext()
  }, delay)
}

function chooseRating(visual: VisualRating) {
  if (selectedRating.value)
    return

  selectedRating.value = visual
  const wordId = currentWordId(session.value)
  if (wordId === null)
    return

  const rating = VISUAL_TO_RATING[visual]
  const ratedAt = Date.now()
  const next = rateWord(session.value, wordId, rating, ratedAt)
  session.value = next
  scheduleAdvance(FLASHCARD_ADVANCE_DELAY)
}

function chooseOption(index: number) {
  if (isAnswered.value)
    return

  selectedOption.value = index
  scheduleAdvance(index === quizItem.value.correctIndex
    ? QUIZ_CORRECT_ADVANCE_DELAY
    : QUIZ_WRONG_ADVANCE_DELAY)
}

function optionClass(index: number) {
  if (!isAnswered.value)
    return {}

  return {
    'quiz-option--correct': index === quizItem.value.correctIndex,
    'quiz-option--wrong': index === selectedOption.value && index !== quizItem.value.correctIndex,
  }
}

function goNext() {
  if (isQuiz.value) {
    if (quizIndex.value === MOCK_STUDY_ITEMS.length - 1) {
      router.push({ path: '/study/complete', query: { mode: 'multiple-choice' } })
      return
    }
    quizIndex.value += 1
    selectedOption.value = undefined
    return
  }

  // 评分已推进 currentIndex；走完整个队列（而不是最后一词被评时）才收尾，
  // 否则末词永不显示（off-by-one）。
  if (isSessionFinished(session.value)) {
    router.push({ path: '/study/complete', query: { mode: 'flashcard' }, state: { session: JSON.stringify(session.value) } })
    return
  }

  isRevealed.value = false
  selectedRating.value = undefined
}

onBeforeUnmount(() => {
  if (advanceTimer)
    clearTimeout(advanceTimer)
})
</script>

<template>
  <main class="study-page page-stack">
    <header class="page-heading">
      <eyebrow :text="modeLabel" />
      <div class="study-progress">
        <queue-bar :segments="queueSegments" />
        <span>{{ progressIndex + 1 }} / {{ progressTotal }}</span>
      </div>
    </header>

    <article v-if="!isQuiz && currentWord" class="word-card">
      <div class="word-card__meta">
        <span>Mock word</span>
        <van-button icon="volume-o" size="small" disabled>
          发音后续接入
        </van-button>
      </div>

      <div class="word-card__identity">
        <h1 class="word-card__word">
          {{ currentWord.text }}
        </h1>
        <p class="word-card__phonetic">
          {{ currentWord.phonetic }} · {{ currentWord.senses[0]?.partOfSpeech }}
        </p>
      </div>

      <van-button v-if="!isRevealed" type="primary" block @click="isRevealed = true">
        查看释义
      </van-button>

      <div v-else class="flashcard-answer">
        <h2 class="meaning-block__definition">
          {{ currentWord.senses[0]?.definition }}
        </h2>
        <blockquote class="example-block">
          <p class="example-block__english">
            {{ currentWord.examples[0]?.english }}
          </p>
          <p class="example-block__chinese">
            {{ currentWord.examples[0]?.chinese }}
          </p>
        </blockquote>
        <rate-buttons
          :model-value="selectedRating"
          :disabled="selectedRating !== undefined"
          @update:model-value="chooseRating"
        />
      </div>
    </article>

    <article v-else-if="isQuiz && quizItem" class="word-card">
      <div class="word-card__meta">
        <span>Mock word</span>
        <van-button icon="volume-o" size="small" disabled>
          发音后续接入
        </van-button>
      </div>

      <div class="word-card__identity">
        <h1 class="word-card__word">
          {{ quizItem.word.text }}
        </h1>
        <p class="word-card__phonetic">
          {{ quizItem.word.phonetic }} · {{ quizItem.word.senses[0]?.partOfSpeech }}
        </p>
      </div>

      <div class="quiz-options" role="group" aria-label="请选择正确的中文释义">
        <button
          v-for="(option, index) in quizItem.options"
          :key="option"
          class="quiz-option"
          :class="optionClass(index)"
          type="button"
          :disabled="isAnswered"
          @click="chooseOption(index)"
        >
          <span class="quiz-option__index">{{ index + 1 }}</span>
          <span>{{ option }}</span>
          <van-icon
            v-if="isAnswered && index === quizItem.correctIndex"
            name="success"
            aria-label="正确答案"
          />
          <van-icon
            v-else-if="isAnswered && index === selectedOption"
            name="cross"
            aria-label="选择错误"
          />
        </button>
      </div>
    </article>

    <p class="mock-note">
      {{ isQuiz
        ? '当前为 Mock 视觉流程。选项、评分和结果不会写入正式学习状态。'
        : '当前为模拟词库的学习流程。评分记录在本次会话中，正式调度属后续阶段。' }}
    </p>
  </main>
</template>

<style scoped lang="less">
.study-page {
  padding-bottom: var(--s5);
}

.study-progress {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--s3);
  align-items: center;
}

.study-progress span,
.word-card__meta,
.quiz-option__index {
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
}

.word-card {
  display: grid;
  gap: var(--s4);
  padding: var(--s5);
  border: var(--hairline) solid var(--line);
  border-radius: var(--r-word);
  background: var(--surface);
}

.word-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.word-card__identity,
.flashcard-answer,
.example-block,
.quiz-options {
  display: grid;
}

.flashcard-answer {
  gap: var(--s3);
}

.word-card__identity {
  gap: var(--s2);
  justify-items: center;
  padding: var(--s2) 0;
  text-align: center;
}

.word-card__word {
  overflow-wrap: anywhere;
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: var(--fs-word);
  font-weight: 600;
  line-height: var(--lh-tight);
}

.word-card__phonetic {
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: var(--fs-ui);
  line-height: var(--lh-tight);
}

.meaning-block__definition {
  color: var(--ink);
  font-size: var(--fs-meaning);
  font-weight: 500;
  line-height: var(--lh-body);
}

.example-block {
  gap: var(--s2);
  padding: var(--s3);
  border-radius: var(--r-sm);
  background: var(--bg);
}

.example-block__english {
  color: var(--ink-2);
  font-family: var(--font-serif);
  font-size: var(--fs-body);
  font-style: italic;
  line-height: var(--lh-body);
}

.example-block__chinese {
  color: var(--ink-3);
  font-size: var(--fs-example-cn);
  line-height: var(--lh-relaxed);
}

.quiz-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: var(--s3);
  align-items: center;
  min-height: var(--tap-min);
  padding: var(--s4) var(--s3);
  border: var(--hairline) solid var(--line);
  border-radius: var(--r-md);
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
  text-align: left;
  transition:
    background-color var(--dur-fast),
    border-color var(--dur-fast),
    color var(--dur-fast);
}

.quiz-options {
  gap: var(--s2);
}

.quiz-option:disabled {
  cursor: default;
  opacity: 1;
}

.quiz-option--correct {
  border-color: var(--know);
  background: var(--know-soft);
  color: var(--know-text);
}

.quiz-option--wrong {
  border-color: var(--unknown);
  background: var(--unknown-soft);
  color: var(--unknown-text);
}
</style>

<route lang="json5">
{
  name: 'Study'
}
</route>
