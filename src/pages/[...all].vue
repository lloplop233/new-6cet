<script setup lang="ts">
const router = useRouter()

function goHome() {
  router.replace('/')
}
</script>

<template>
  <div class="not-found">
    <van-icon name="warn-o" class="not-found__icon" />
    <p class="not-found__text">
      页面不存在
    </p>
    <van-button type="primary" size="small" @click="goHome">
      返回首页
    </van-button>
  </div>
</template>

<style scoped lang="less">
.not-found {
  display: flex;
  flex-direction: column;
  gap: var(--s4);
  align-items: center;
  padding-top: var(--s10);
}

.not-found__icon {
  color: var(--ink-4);
  font-size: var(--s9);
}

.not-found__text {
  margin: 0;
  color: var(--ink-3);
  font-size: var(--fs-body);
}
</style>

<route lang="json5">
{
  name: '404'
}
</route>
