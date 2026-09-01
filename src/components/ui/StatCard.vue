<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <section class="stat-card">
    <span class="stat-card__title">{{ title }}</span>
    <slot />
  </section>
</template>

<style scoped lang="less">
.stat-card {
  display: grid;
  gap: var(--s3);
  padding: var(--s5);
  border: var(--hairline) solid var(--line);
  border-radius: var(--r-card);
  background: var(--surface);
}

.stat-card__title {
  color: var(--ink-3);
  font-size: var(--fs-aux);
  line-height: var(--lh-tight);
}
</style>
