<script setup lang="ts">
import { showConfirmDialog, showToast } from 'vant'

const MODE_OPTIONS = [
  { label: '翻卡自评', value: 'flashcard' },
  { label: '选择题辨义', value: 'multiple-choice' },
] as const

const STATE_OPTIONS = [
  { label: 'Loading', value: 'loading' },
  { label: 'Empty', value: 'empty' },
  { label: 'Error', value: 'error' },
  { label: 'Disabled', value: 'disabled' },
] as const

const DISABLED_CAPABILITIES = [
  { icon: 'volume-o', title: '自动发音', description: 'V0 暂未接入，后续阶段实现浏览器 TTS。' },
  { icon: 'exchange', title: '备份与恢复', description: '等待正式本地数据协议确认后再接入。' },
] as const

const preferredMode = ref('flashcard')
const targetWordCount = ref(2500)
const previewState = ref('loading')

async function resetLocalPreview() {
  try {
    await showConfirmDialog({
      title: '重置当前页预览？',
      message: '只恢复设置页当前控件，不会清理其他页面或浏览器数据。',
      confirmButtonText: '重置当前页',
    })
    preferredMode.value = 'flashcard'
    targetWordCount.value = 2500
    previewState.value = 'loading'
    showToast('设置页预览已重置')
  }
  catch {
    // 用户取消确认时保持当前页面状态。
  }
}
</script>

<template>
  <main class="page-stack">
    <header class="page-heading">
      <eyebrow text="Settings · Local preview" />
      <h1 class="page-title">
        调整你的学习偏好
      </h1>
      <p class="page-subtitle">
        V0 中的设置只影响当前页面，用于验收控件、分组和状态说明。
      </p>
    </header>

    <stat-card title="学习偏好">
      <div class="settings-content">
        <div class="setting-field">
          <div class="setting-field__heading">
            <strong>默认学习模式</strong>
            <span>{{ preferredMode === 'flashcard' ? '翻卡自评' : '选择题辨义' }}</span>
          </div>
          <segment-toggle v-model="preferredMode" :options="MODE_OPTIONS" />
        </div>

        <div class="setting-field">
          <div class="setting-field__heading">
            <strong>目标词量</strong>
            <span>{{ targetWordCount }} 词</span>
          </div>
          <van-slider
            v-model="targetWordCount"
            :min="1000"
            :max="5000"
            :step="500"
            aria-label="目标词量"
          />
          <p>当前数值只用于本页视觉反馈，不会保存或影响进度页。</p>
        </div>
      </div>
    </stat-card>

    <stat-card title="体验功能">
      <div class="disabled-list">
        <div v-for="item in DISABLED_CAPABILITIES" :key="item.title" class="disabled-row">
          <div class="disabled-row__icon" aria-hidden="true">
            <van-icon :name="item.icon" />
          </div>
          <div class="disabled-row__copy">
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </div>
          <span>V1</span>
        </div>
      </div>
    </stat-card>

    <stat-card title="状态样式预览">
      <div class="settings-content">
        <p class="state-intro">
          只切换当前区域，帮助验收基础状态长什么样。
        </p>
        <segment-toggle v-model="previewState" :options="STATE_OPTIONS" />

        <div v-if="previewState === 'loading'" class="loading-preview" aria-label="加载状态示例">
          <van-skeleton title :row="3" />
        </div>
        <state-panel
          v-else-if="previewState === 'empty'"
          state="empty"
          title="今天还没有体验记录"
          description="完成一组 Demo 后，这里会出现最近结果。"
        />
        <state-panel
          v-else-if="previewState === 'error'"
          state="error"
          title="暂时没有加载成功"
          description="这是 V0 的错误状态视觉示例，不代表真实请求失败。"
          action-label="重试预览"
          @action="previewState = 'empty'"
        />
        <state-panel
          v-else
          state="disabled"
          title="此功能尚未开放"
          description="V0 先确认布局和说明，正式能力将在后续阶段接入。"
        />
      </div>
    </stat-card>

    <div class="section-stack">
      <van-button plain type="danger" block @click="resetLocalPreview">
        重置当前页预览
      </van-button>
      <p class="mock-note">
        当前设置不会跨页面生效，也不会写入 localStorage 或 Pinia。
      </p>
    </div>
  </main>
</template>

<style scoped lang="less">
.settings-content,
.setting-field,
.disabled-list,
.disabled-row__copy {
  display: grid;
}

.settings-content {
  gap: var(--s6);
}

.setting-field {
  gap: var(--s4);
}

.setting-field__heading,
.disabled-row {
  display: flex;
  gap: var(--s3);
  align-items: center;
  justify-content: space-between;
}

.setting-field__heading strong,
.disabled-row__copy strong {
  color: var(--ink);
  font-size: var(--fs-body);
}

.setting-field__heading span,
.disabled-row > span {
  flex: none;
  color: var(--brand-deep);
  font-family: var(--font-mono);
  font-size: var(--fs-unit);
}

.setting-field p,
.disabled-row__copy p,
.state-intro {
  color: var(--ink-3);
  font-size: var(--fs-aux);
  line-height: var(--lh-body);
}

.disabled-list {
  gap: var(--s1);
}

.disabled-row {
  min-height: var(--s10);
  padding: var(--s3) 0;
  border-bottom: var(--hairline) solid var(--line-soft);
}

.disabled-row:last-child {
  border-bottom: 0;
}

.disabled-row__icon {
  display: grid;
  flex: none;
  width: var(--s9);
  height: var(--s9);
  place-items: center;
  border-radius: var(--r-md);
  background: var(--line-soft);
  color: var(--ink-4);
  font-size: var(--fs-meaning);
}

.disabled-row__copy {
  flex: 1;
  gap: var(--s1);
}

.loading-preview {
  padding: var(--s5) 0;
}
</style>

<route lang="json5">
{
  name: 'Settings'
}
</route>
