<script setup lang="ts">
import { MOCK_RESULT_SEGMENTS } from '@/constants/mock-words'

const router = useRouter()
</script>

<template>
  <main class="page-stack">
    <header class="page-heading">
      <eyebrow text="Progress · V0 preview" />
      <h1 class="page-title">
        看见每一步积累
      </h1>
      <p class="page-subtitle">
        这一页只验证未来进度信息是否清楚，所有数字均为固定体验数据。
      </p>
    </header>

    <section class="progress-overview" aria-label="体验进度概览">
      <stat-card title="已体验">
        <stat-number :value="186" unit="词" />
      </stat-card>
      <stat-card title="目标词量">
        <stat-number :value="2500" unit="词" />
      </stat-card>
    </section>

    <section class="section-stack" aria-labelledby="distribution-title">
      <div class="progress-heading">
        <div>
          <h2 id="distribution-title">
            本组掌握分布
          </h2>
          <p>固定结果用于预览信息层级</p>
        </div>
        <span>6 词</span>
      </div>

      <div class="distribution-grid">
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

    <stat-card title="最近一次体验">
      <div class="recent-session">
        <div class="recent-session__meta">
          <strong>翻卡自评 · 6 词</strong>
          <span>刚刚</span>
        </div>
        <queue-bar :segments="MOCK_RESULT_SEGMENTS" />
        <p>认识 4 · 模糊 1 · 不熟 1</p>
      </div>
    </stat-card>

    <p class="mock-note">
      当前为体验数据，不代表真实学习历史、长期趋势或连续学习天数。
    </p>

    <van-button type="primary" block @click="router.push('/')">
      返回今日开始 Demo
    </van-button>
  </main>
</template>

<style scoped lang="less">
.progress-overview,
.distribution-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--s3);
}

.distribution-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.progress-heading,
.recent-session__meta {
  display: flex;
  gap: var(--s3);
  align-items: center;
  justify-content: space-between;
}

.progress-heading h2,
.recent-session__meta strong {
  color: var(--ink);
  font-size: var(--fs-body);
  line-height: var(--lh-tight);
}

.progress-heading p,
.recent-session p {
  color: var(--ink-3);
  font-size: var(--fs-aux);
  line-height: var(--lh-body);
}

.progress-heading span,
.recent-session__meta span {
  flex: none;
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: var(--fs-unit);
}

.recent-session {
  display: grid;
  gap: var(--s4);
}
</style>

<route lang="json5">
{
  name: 'Progress'
}
</route>
