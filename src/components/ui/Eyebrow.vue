<script setup lang="ts">
defineProps<{
  text: string
}>()
</script>

<template>
  <span class="eyebrow">{{ text }}</span>
</template>

<style scoped lang="less">
.eyebrow {
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  line-height: var(--lh-tight);
  text-transform: uppercase;
}
</style>
