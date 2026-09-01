<script setup lang="ts">
defineProps<{
  value: number | string
  unit: string
  tone?: 'brand' | 'know' | 'vague' | 'unknown'
}>()
</script>

<template>
  <span class="stat-number" :class="`stat-number--${tone ?? 'brand'}`">
    <strong class="stat-number__value">{{ value }}</strong>
    <span class="stat-number__unit">{{ unit }}</span>
  </span>
</template>

<style scoped lang="less">
.stat-number {
  display: flex;
  gap: var(--s1);
  align-items: baseline;
}

.stat-number__value {
  color: currentColor;
  font-family: var(--font-mono);
  font-size: var(--fs-stat);
  font-variant-numeric: tabular-nums;
  line-height: var(--lh-tight);
}

.stat-number--brand,
.stat-number--know {
  color: var(--know-text);
}

.stat-number--vague {
  color: var(--vague-text);
}

.stat-number--unknown {
  color: var(--unknown-text);
}

.stat-number__unit {
  color: var(--ink-3);
  font-size: var(--fs-unit);
}
</style>
