<script setup lang="ts">
const props = defineProps<{
  state: 'empty' | 'error' | 'disabled'
  title: string
  description: string
  actionLabel?: string
}>()

defineEmits<{
  action: []
}>()

const iconName = computed(() => ({
  empty: 'notes-o',
  error: 'warning-o',
  disabled: 'lock',
})[props.state])
</script>

<template>
  <section class="state-panel" :class="`state-panel--${state}`">
    <van-icon :name="iconName" class="state-panel__icon" aria-hidden="true" />
    <h3 class="state-panel__title">
      {{ title }}
    </h3>
    <p class="state-panel__description">
      {{ description }}
    </p>
    <van-button v-if="actionLabel" plain type="primary" size="small" @click="$emit('action')">
      {{ actionLabel }}
    </van-button>
  </section>
</template>

<style scoped lang="less">
.state-panel {
  display: grid;
  gap: var(--s3);
  justify-items: center;
  padding: var(--s7) var(--s5);
  border: var(--hairline) solid var(--line);
  border-radius: var(--r-card);
  background: var(--surface);
  text-align: center;
}

.state-panel__icon {
  color: var(--brand);
  font-size: var(--fs-stat);
}

.state-panel--error .state-panel__icon {
  color: var(--unknown);
}

.state-panel--disabled .state-panel__icon {
  color: var(--ink-4);
}

.state-panel__title {
  color: var(--ink);
  font-family: var(--font-serif);
  font-size: var(--fs-meaning);
  line-height: var(--lh-tight);
}

.state-panel__description {
  max-width: 100%;
  color: var(--ink-3);
  font-size: var(--fs-aux);
  line-height: var(--lh-body);
}
</style>
