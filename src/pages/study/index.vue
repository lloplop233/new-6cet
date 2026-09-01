<script setup lang="ts">
import { MOCK_RESULT_SEGMENTS, MOCK_STUDY_ITEMS } from '@/constants/mock-words'

type VisualRating = 'know' | 'vague' | 'unknown'

const FLASHCARD_ADVANCE_DELAY = 450
const QUIZ_CORRECT_ADVANCE_DELAY = 400
const QUIZ_WRONG_ADVANCE_DELAY = 900

const route = useRoute()
const router = useRouter()

const mode = computed(() => route.query.mode === 'multiple-choice'
  ? 'multiple-choice'
  : 'flashcard')
const currentIndex = ref(0)
const isRevealed = ref(false)
const selectedRating = ref<VisualRating>()
const selectedOption = ref<number>()
let advanceTimer: ReturnType<typeof setTimeout> | undefined

const currentItem = computed(() => MOCK_STUDY_ITEMS[currentIndex.value])
const isLast = computed(() => currentIndex.value === MOCK_STUDY_ITEMS.length - 1)
const isAnswered = computed(() => selectedOption.value !== undefined)
const modeLabel = computed(() => mode.value === 'multiple-choice' ? '选择题辨义' : '翻卡自评')
const queueSegments = computed(() => MOCK_STUDY_ITEMS.map((_, index) => (
  index < currentIndex.value ? MOCK_RESULT_SEGMENTS[index] : 'pending'
)))

function scheduleAdvance(delay: number) {
  advanceTimer = setTimeout(() => {
    advanceTimer = undefined
    goNext()
  }, delay)
}

function chooseRating(rating: VisualRating) {
  if (selectedRating.value)
    return

  selectedRating.value = rating
  scheduleAdvance(FLASHCARD_ADVANCE_DELAY)
}

function chooseOption(index: number) {
  if (isAnswered.value)
    return

  selectedOption.value = index
  scheduleAdvance(index === currentItem.value.correctIndex
    ? QUIZ_CORRECT_ADVANCE_DELAY
    : QUIZ_WRONG_ADVANCE_DELAY)
}

function optionClass(index: number) {
  if (!isAnswered.value)
    return {}

  return {
    'quiz-option--correct': index === currentItem.value.correctIndex,
    'quiz-option--wrong': index === selectedOption.value && index !== currentItem.value.correctIndex,
  }
}

function goNext() {
  if (isLast.value) {
    router.push({ path: '/study/complete', query: { mode: mode.value } })
    return
  }

  currentIndex.value += 1
  isRevealed.value = false
  selectedRating.value = undefined
  selectedOption.value = undefined
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
        <span>{{ currentIndex + 1 }} / {{ MOCK_STUDY_ITEMS.length }}</span>
      </div>
    </header>

    <article class="word-card">
      <div class="word-card__meta">
        <span>Mock word</span>
        <van-button icon="volume-o" size="small" disabled>
          发音后续接入
        </van-button>
      </div>

      <div class="word-card__identity">
        <h1 class="word-card__word">
          {{ currentItem.word.text }}
        </h1>
        <p class="word-card__phonetic">
          {{ currentItem.word.phonetic }} · {{ currentItem.word.senses[0]?.partOfSpeech }}
        </p>
      </div>

      <template v-if="mode === 'flashcard'">
        <van-button v-if="!isRevealed" type="primary" block @click="isRevealed = true">
          查看释义
        </van-button>

        <div v-else class="flashcard-answer">
          <h2 class="meaning-block__definition">
            {{ currentItem.word.senses[0]?.definition }}
          </h2>
          <blockquote class="example-block">
            <p class="example-block__english">
              {{ currentItem.word.examples[0]?.english }}
            </p>
            <p class="example-block__chinese">
              {{ currentItem.word.examples[0]?.chinese }}
            </p>
          </blockquote>
          <rate-buttons
            :model-value="selectedRating"
            :disabled="selectedRating !== undefined"
            @update:model-value="chooseRating"
          />
        </div>
      </template>

      <template v-else>
        <div class="quiz-options" role="group" aria-label="请选择正确的中文释义">
          <button
            v-for="(option, index) in currentItem.options"
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
              v-if="isAnswered && index === currentItem.correctIndex"
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
      </template>
    </article>

    <p class="mock-note">
      当前为 Mock 视觉流程。选项、评分和结果不会写入正式学习状态。
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
