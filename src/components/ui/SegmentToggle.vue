<script setup lang="ts">
interface SegmentOption {
  readonly label: string
  readonly value: string
}

const props = defineProps<{
  modelValue: string
  options: readonly SegmentOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function select(value: string) {
  if (value !== props.modelValue)
    emit('update:modelValue', value)
}
</script>

<template>
  <div class="segment-toggle" role="group" aria-label="选项切换">
    <button
      v-for="option in options"
      :key="option.value"
      class="segment-toggle__item"
      :class="{ 'segment-toggle__item--active': option.value === modelValue }"
      type="button"
      :aria-pressed="option.value === modelValue"
      @click="select(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped lang="less">
.segment-toggle {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(var(--s10), 1fr));
  gap: var(--s2);
}

.segment-toggle__item {
  min-height: var(--tap-min);
  padding: 0 var(--s3);
  border: var(--hairline) solid var(--line);
  border-radius: var(--r-pill);
  appearance: none;
  background: transparent;
  color: var(--ink-2);
  cursor: pointer;
  font-size: var(--fs-aux);
  font-weight: 500;
}

.segment-toggle__item--active {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--surface);
}
</style>
