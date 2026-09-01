<script setup lang="ts">
const router = useRouter()

const STUDY_MODE_ENTRIES = [
  {
    title: '翻卡自评',
    description: '看词、翻面，再判断掌握程度',
    meta: '正常背词',
    value: 'flashcard',
    recommended: true,
  },
  {
    title: '选择题辨义',
    description: '通过四选一快速判断词义',
    meta: '快速测试',
    value: 'multiple-choice',
    recommended: false,
  },
] as const

const queueSegments = ['pending', 'pending', 'pending', 'pending', 'pending', 'pending'] as const

function startStudy(mode: typeof STUDY_MODE_ENTRIES[number]['value']) {
  router.push({ path: '/study', query: { mode } })
}
</script>

<template>
  <main class="page-stack">
    <header class="page-heading">
      <eyebrow text="CET-6 · V0 体验版" />
      <h1 class="page-title">
        今天，从六个词开始
      </h1>
      <p class="page-subtitle">
        先完整感受产品结构和学习节奏，当前内容均为可视化验收用 Mock 数据。
      </p>
    </header>

    <section class="home-stats" aria-label="今日体验概览">
      <stat-card title="本组词数">
        <stat-number :value="6" unit="词" />
      </stat-card>
      <stat-card title="已完成">
        <stat-number :value="0" unit="词" />
      </stat-card>
    </section>

    <section class="section-stack" aria-labelledby="mode-title">
      <div class="section-heading">
        <h2 id="mode-title" class="section-title">
          选择学习方式
        </h2>
        <p class="section-description">
          今天 {{ queueSegments.length }} 个词，选择一种方式开始
        </p>
      </div>
      <div class="study-mode-list">
        <button
          v-for="mode in STUDY_MODE_ENTRIES"
          :key="mode.value"
          class="study-mode-card"
          :class="{ 'study-mode-card--recommended': mode.recommended }"
          type="button"
          @click="startStudy(mode.value)"
        >
          <span class="study-mode-card__heading">
            <span class="study-mode-card__title">{{ mode.title }}</span>
            <span v-if="mode.recommended" class="study-mode-card__badge">推荐</span>
          </span>
          <span class="study-mode-card__description">{{ mode.description }}</span>
          <span class="study-mode-card__meta">{{ mode.meta }}</span>
        </button>
      </div>
    </section>

    <section class="queue-section section-stack" aria-labelledby="queue-title">
      <div class="queue-section__header">
        <h2 id="queue-title" class="section-title">
          今日队列
        </h2>
        <span class="queue-count">0 / 6</span>
      </div>
      <queue-bar :segments="queueSegments" />
      <p class="section-description">
        每完成一词，线段会用认识、模糊或不熟的颜色标记。
      </p>
    </section>

    <section class="section-stack" aria-labelledby="recent-title">
      <div class="section-heading">
        <h2 id="recent-title" class="section-title">
          最近一次体验
        </h2>
        <p class="section-description">
          固定结果用于预览未来总结层级，不代表真实学习历史。
        </p>
      </div>
      <div class="result-summary">
        <stat-card title="认识">
          <stat-number :value="4" unit="词" tone="know" />
        </stat-card>
        <stat-card title="模糊">
          <stat-number :value="1" unit="词" tone="vague" />
        </stat-card>
        <stat-card title="不熟">
          <stat-number :value="1" unit="词" tone="unknown" />
        </stat-card>
      </div>
    </section>

    <p class="mock-note">
      当前为 Mock 体验数据。V0 只用于验收页面结构、视觉与基础点击流程。
    </p>
  </main>
</template>

<style scoped lang="less">
.home-stats,
.result-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s3);
}

.section-heading {
  display: grid;
  gap: var(--s1);
}

.section-title {
  color: var(--ink);
  font-size: var(--fs-body);
  font-weight: 600;
  line-height: var(--lh-tight);
}

.section-description {
  color: var(--ink-3);
  font-size: var(--fs-aux);
  line-height: var(--lh-body);
}

.study-mode-list {
  display: grid;
  gap: var(--s3);
}

.study-mode-card {
  display: grid;
  width: 100%;
  min-height: var(--s10);
  padding: var(--s5);
  border: var(--hairline) solid var(--line);
  border-radius: var(--r-card);
  appearance: none;
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
  gap: var(--s2);
  text-align: left;
  transition:
    background-color var(--dur-fast),
    border-color var(--dur-fast),
    opacity var(--dur-fast);
}

.study-mode-card--recommended {
  border-color: var(--brand);
  background: var(--brand-soft);
}

.study-mode-card:active {
  border-color: var(--ink-4);
  background: var(--line-soft);
  opacity: 0.82;
}

.study-mode-card--recommended:active {
  border-color: var(--brand-deep);
  background: var(--brand-soft);
}

.study-mode-card__heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--s2);
}

.study-mode-card__title {
  font-size: var(--fs-body);
  font-weight: 600;
  line-height: var(--lh-tight);
}

.study-mode-card__badge {
  padding: var(--s1) var(--s2);
  border-radius: var(--r-pill);
  background: var(--surface);
  color: var(--brand-deep);
  font-size: var(--fs-label);
  font-weight: 600;
  line-height: var(--lh-tight);
}

.study-mode-card__description {
  color: var(--ink-2);
  font-size: var(--fs-aux);
  line-height: var(--lh-body);
}

.study-mode-card__meta {
  color: var(--ink-3);
  font-size: var(--fs-unit);
  line-height: var(--lh-tight);
}

.queue-section {
  padding: var(--s5);
  border: var(--hairline) solid var(--line);
  border-radius: var(--r-card);
  background: var(--surface);
}

.queue-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.queue-count {
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: var(--fs-unit);
}

.result-summary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
</style>

<route lang="json5">
{
  name: 'Home'
}
</route>
