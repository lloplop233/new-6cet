<script setup lang="ts">
export type QueueSegment = 'know' | 'vague' | 'unknown' | 'pending'

const props = defineProps<{
  segments: readonly QueueSegment[]
}>()

const summary = computed(() => {
  const completed = props.segments.filter(segment => segment !== 'pending').length
  return `队列进度，共 ${props.segments.length} 词，已展示 ${completed} 词结果`
})
</script>

<template>
  <div class="queue-bar" role="img" :aria-label="summary">
    <span
      v-for="(segment, index) in segments"
      :key="index"
      class="queue-bar__segment"
      :class="`queue-bar__segment--${segment}`"
    />
  </div>
</template>

<style scoped lang="less">
.queue-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: var(--s1);
  width: 100%;
}

.queue-bar__segment {
  height: var(--s1);
  border-radius: var(--r-pill);
  background: var(--line);
}

.queue-bar__segment--know {
  background: var(--know);
}

.queue-bar__segment--vague {
  background: var(--vague);
}

.queue-bar__segment--unknown {
  background: var(--unknown);
}
</style>
