<script setup lang="ts">
import { MOCK_RESULT_SEGMENTS } from '@/constants/mock-words'
import type { StudySession } from '@/types/study'
import type { QueueSegment } from '@/components/word/QueueBar.vue'

const route = useRoute()
const router = useRouter()

const mode = computed(() => route.query.mode === 'multiple-choice'
  ? 'multiple-choice'
  : 'flashcard')
const isQuiz = computed(() => mode.value === 'multiple-choice')

// 翻卡模式的会话通过路由 state 以 JSON 传入（P2-2 决策：内存传递，持久化属 P2-3）。
const session = computed<StudySession | null>(() => {
  const state = history.state as { session?: string } | null
  if (typeof state?.session !== 'string')
    return null

  try {
    return JSON.parse(state.session) as StudySession
  }
  catch {
    return null
  }
})
const hasRealResult = computed(() => !isQuiz.value && session.value !== null)

const stats = computed(() => {
  if (!hasRealResult.value || !session.value)
    return null

  let know = 0
  let vague = 0
  let unknown = 0
  for (const key of Object.keys(session.value.results)) {
    const result = session.value.results[key]
    if (result === undefined)
      continue

    if (result.rating === 'good')
      know += 1
    else if (result.rating === 'hard')
      vague += 1
    else
      unknown += 1
  }
  return { know, vague, unknown, total: session.value.queue.length }
})

const segments = computed<readonly QueueSegment[]>(() => {
  if (!hasRealResult.value || !session.value)
    return MOCK_RESULT_SEGMENTS

  return session.value.queue.map((wordId) => {
    const result = session.value!.results[wordId]
    if (result?.rating === 'good')
      return 'know'
    if (result?.rating === 'hard')
      return 'vague'
    if (result?.rating === 'again')
      return 'unknown'
    return 'pending'
  })
})

function replay() {
  router.push({ path: '/study', query: { mode: mode.value } })
}
</script>

<template>
  <main class="complete-page page-stack">
    <header class="completion-hero">
      <div class="completion-hero__icon" aria-hidden="true">
        <van-icon name="success" />
      </div>
      <eyebrow :text="isQuiz ? 'V0 · Mock result' : '本组完成'" />
      <h1 class="page-title">
        本组完成
      </h1>
      <p class="page-subtitle">
        {{ isQuiz
          ? '你已经走完选择题 Demo。以下数字用于验收完成反馈层级。'
          : hasRealResult
            ? '你走完了这组模拟词。以下为本次会话的真实评分统计。'
            : '会话数据已失效（例如刷新了页面）。回到今日重新开始一组。' }}
      </p>
    </header>

    <template v-if="isQuiz">
      <section class="completion-total" aria-label="本组完成数量">
        <span>完成</span>
        <strong>6</strong>
        <span>词</span>
      </section>

      <section class="result-grid" aria-label="固定体验结果">
        <stat-card title="认识">
          <stat-number :value="4" unit="词" tone="know" />
        </stat-card>
        <stat-card title="模糊">
          <stat-number :value="1" unit="词" tone="vague" />
        </stat-card>
        <stat-card title="不熟">
          <stat-number :value="1" unit="词" tone="unknown" />
        </stat-card>
        <stat-card title="选择题答对">
          <stat-number :value="5" unit="题" />
        </stat-card>
      </section>

      <section class="section-stack" aria-labelledby="review-title">
        <div class="review-heading">
          <h2 id="review-title">
            本组回顾
          </h2>
          <span>4 / 1 / 1</span>
        </div>
        <queue-bar :segments="MOCK_RESULT_SEGMENTS" />
      </section>

      <p class="mock-note">
        当前为 Mock 体验数据，不代表真实评分、正确率或学习历史。
      </p>
    </template>

    <template v-else-if="stats">
      <section class="completion-total" aria-label="本组完成数量">
        <span>完成</span>
        <strong>{{ stats.total }}</strong>
        <span>词</span>
      </section>

      <section class="result-grid" aria-label="本次会话评分统计">
        <stat-card title="认识">
          <stat-number :value="stats.know" unit="词" tone="know" />
        </stat-card>
        <stat-card title="模糊">
          <stat-number :value="stats.vague" unit="词" tone="vague" />
        </stat-card>
        <stat-card title="不熟">
          <stat-number :value="stats.unknown" unit="词" tone="unknown" />
        </stat-card>
      </section>

      <section class="section-stack" aria-labelledby="review-title">
        <div class="review-heading">
          <h2 id="review-title">
            本组回顾
          </h2>
          <span>{{ stats.know }} / {{ stats.vague }} / {{ stats.unknown }}</span>
        </div>
        <queue-bar :segments="segments" />
      </section>

      <p class="mock-note">
        当前为模拟词库。评分保存在本次会话中，正式调度与历史统计属后续阶段。
      </p>
    </template>

    <div class="action-stack">
      <van-button type="primary" block @click="router.push('/progress')">
        查看进度
      </van-button>
      <van-button plain type="primary" block @click="replay">
        再来一组
      </van-button>
      <van-button plain block @click="router.push('/')">
        返回今日
      </van-button>
    </div>
  </main>
</template>

<style scoped lang="less">
.complete-page {
  padding-bottom: var(--s5);
}

.completion-hero {
  display: grid;
  gap: var(--s3);
  justify-items: center;
  text-align: center;
}

.completion-hero__icon {
  display: grid;
  width: var(--s10);
  height: var(--s10);
  place-items: center;
  border-radius: var(--r-pill);
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-size: var(--fs-stat);
}

.completion-total {
  display: flex;
  gap: var(--s2);
  align-items: baseline;
  justify-content: center;
  padding: var(--s5);
  border: var(--hairline) solid var(--line);
  border-radius: var(--r-card);
  background: var(--surface);
  color: var(--ink-3);
  font-size: var(--fs-aux);
}

.completion-total strong {
  color: var(--brand);
  font-family: var(--font-mono);
  font-size: var(--fs-stat);
  font-variant-numeric: tabular-nums;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s3);
}

.review-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.review-heading h2 {
  color: var(--ink);
  font-size: var(--fs-body);
}

.review-heading span {
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: var(--fs-unit);
}
</style>

<route lang="json5">
{
  name: 'StudyComplete'
}
</route>
