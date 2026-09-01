<script setup lang="ts">
export type VisualRating = 'know' | 'vague' | 'unknown'

defineProps<{
  modelValue?: VisualRating
  disabled?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: VisualRating]
}>()

const RATINGS = [
  { value: 'vague', label: '模糊', hint: '还有印象' },
  { value: 'unknown', label: '不熟', hint: '再看一遍' },
  { value: 'know', label: '认识', hint: '可以继续' },
] as const
</script>

<template>
  <div class="rate-buttons" role="group" aria-label="词汇熟悉程度">
    <button
      v-for="rating in RATINGS"
      :key="rating.value"
      class="rate-buttons__item"
      :class="[
        `rate-buttons__item--${rating.value}`,
        { 'rate-buttons__item--selected': modelValue === rating.value },
      ]"
      type="button"
      :disabled="disabled"
      :aria-pressed="modelValue === rating.value"
      @click="$emit('update:modelValue', rating.value)"
    >
      <strong>{{ rating.label }}</strong>
      <span>{{ rating.hint }}</span>
    </button>
  </div>
</template>

<style scoped lang="less">
.rate-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--s2);
}

.rate-buttons__item {
  display: grid;
  gap: var(--s1);
  min-height: var(--s10);
  padding: var(--s2);
  border: var(--hairline) solid currentColor;
  border-radius: var(--r-md);
  cursor: pointer;
  font-size: var(--fs-aux);
  transition:
    background-color var(--dur-fast),
    border-color var(--dur-fast),
    box-shadow var(--dur-fast);
}

.rate-buttons__item:disabled {
  cursor: default;
  opacity: 1;
}

.rate-buttons__item strong {
  font-family: var(--font-mono);
  font-size: var(--fs-ui);
}

.rate-buttons__item span {
  font-size: var(--fs-unit);
}

.rate-buttons__item--know {
  background: var(--know-soft);
  color: var(--know-text);
}

.rate-buttons__item--vague {
  background: var(--vague-soft);
  color: var(--vague-text);
}

.rate-buttons__item--unknown {
  background: var(--unknown-soft);
  color: var(--unknown-text);
}

.rate-buttons__item--selected {
  box-shadow: inset 0 0 0 var(--hairline) currentColor;
}
</style>
