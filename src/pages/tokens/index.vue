<script setup lang="ts">
// 设计 token 验收页 —— 不是产品页面。
// 用途：只改 tokens.less / var.less 这两个文件，检查 Vant 组件与色板是否全部跟着变。
// 本页所有展示的数值都在运行时读自 CSS 变量，页面自身不写任何字面值（工程规范.md 2.4）。

const COLOR_GROUPS = [
  { title: '品牌', names: ['--brand', '--brand-deep', '--brand-soft'] },
  {
    title: '三档评分',
    names: [
      '--know',
      '--know-text',
      '--know-soft',
      '--vague',
      '--vague-text',
      '--vague-soft',
      '--unknown',
      '--unknown-text',
      '--unknown-soft',
    ],
  },
  {
    title: '中性',
    names: ['--ink', '--ink-2', '--ink-3', '--ink-4', '--line', '--line-soft', '--surface', '--bg'],
  },
]

const RADIUS_NAMES = ['--r-xs', '--r-sm', '--r-md', '--r-card', '--r-word', '--r-pill']
const SPACE_NAMES = ['--s1', '--s2', '--s3', '--s4', '--s5', '--s6', '--s7', '--s8', '--s9', '--s10']
const FONT_SIZE_NAMES = [
  '--fs-word',
  '--fs-word-long',
  '--fs-stat',
  '--fs-title',
  '--fs-meaning',
  '--fs-body',
  '--fs-ui',
  '--fs-example-cn',
  '--fs-aux',
  '--fs-unit',
  '--fs-label',
]

const resolved = ref<Record<string, string>>({})

onMounted(() => {
  const style = getComputedStyle(document.documentElement)
  const names = [
    ...COLOR_GROUPS.flatMap(group => group.names),
    ...RADIUS_NAMES,
    ...SPACE_NAMES,
    ...FONT_SIZE_NAMES,
  ]
  resolved.value = Object.fromEntries(names.map(name => [name, style.getPropertyValue(name).trim()]))
})

const switchOn = ref(true)
const sliderValue = ref(40)
const showPopup = ref(false)
</script>

<template>
  <section v-for="group in COLOR_GROUPS" :key="group.title" class="block">
    <h2 class="block__title">
      色板 · {{ group.title }}
    </h2>
    <ul class="swatches">
      <li v-for="name in group.names" :key="name" class="swatch">
        <span class="swatch__chip" :style="{ background: `var(${name})` }" />
        <span class="swatch__name">{{ name }}</span>
        <span class="swatch__value">{{ resolved[name] }}</span>
      </li>
    </ul>
  </section>

  <section class="block">
    <h2 class="block__title">
      Vant 组件（改主题文件后这些必须全部跟着变）
    </h2>

    <div class="row">
      <van-button type="primary" size="small">
        主按钮
      </van-button>
      <van-button type="success" size="small">
        认识
      </van-button>
      <van-button type="warning" size="small">
        模糊
      </van-button>
      <van-button type="danger" size="small">
        不熟
      </van-button>
    </div>

    <div class="row">
      <van-button plain type="primary" size="small">
        描边
      </van-button>
      <van-tag type="primary">
        标签
      </van-tag>
      <van-switch v-model="switchOn" aria-label="开关示例" />
    </div>

    <van-slider v-model="sliderValue" class="slider" />

    <van-cell-group inset :border="false">
      <van-cell title="列表项" value="值" />
      <van-cell title="可点列表项" is-link @click="showPopup = true" />
    </van-cell-group>

    <van-popup v-model:show="showPopup" position="bottom" round>
      <div class="popup-body">
        Popup 的圆角与底色也来自主题变量。
      </div>
    </van-popup>
  </section>

  <section class="block">
    <h2 class="block__title">
      圆角
    </h2>
    <ul class="radii">
      <li v-for="name in RADIUS_NAMES" :key="name" class="radius">
        <span class="radius__box" :style="{ borderRadius: `var(${name})` }" />
        <span class="swatch__name">{{ name }}</span>
        <span class="swatch__value">{{ resolved[name] }}</span>
      </li>
    </ul>
  </section>

  <section class="block">
    <h2 class="block__title">
      间距
    </h2>
    <ul class="spaces">
      <li v-for="name in SPACE_NAMES" :key="name" class="space">
        <span class="space__bar" :style="{ width: `var(${name})` }" />
        <span class="swatch__name">{{ name }}</span>
        <span class="swatch__value">{{ resolved[name] }}</span>
      </li>
    </ul>
  </section>

  <section class="block">
    <h2 class="block__title">
      字号
    </h2>
    <ul class="sizes">
      <li v-for="name in FONT_SIZE_NAMES" :key="name" class="size">
        <span class="size__sample" :style="{ fontSize: `var(${name})` }">Aa 词</span>
        <span class="swatch__name">{{ name }}</span>
        <span class="swatch__value">{{ resolved[name] }}</span>
      </li>
    </ul>
  </section>

  <section class="block">
    <h2 class="block__title">
      字体三角分工
    </h2>
    <p class="font-sample font-sample--serif">
      abandon 单词本体用衬线
    </p>
    <p class="font-sample font-sample--sans">
      正文与界面文字用无衬线
    </p>
    <p class="font-sample font-sample--mono">
      /əˈbændən/ 2500 音标与数字用等宽
    </p>
  </section>
</template>

<style scoped lang="less">
.block {
  margin-bottom: var(--s7);
}

.block__title {
  margin: 0 0 var(--s3);
  color: var(--ink-2);
  font-size: var(--fs-aux);
  font-weight: 600;
}

.swatches,
.radii,
.spaces,
.sizes {
  margin: 0;
  padding: 0;
  list-style: none;
}

.swatch,
.radius,
.space,
.size {
  display: flex;
  gap: var(--s3);
  align-items: center;
  padding: var(--s2) 0;
  border-bottom: var(--hairline) solid var(--line-soft);
}

.swatch__chip {
  flex: none;
  width: var(--s7);
  height: var(--s6);
  border: var(--hairline) solid var(--line);
  border-radius: var(--r-sm);
}

.swatch__name {
  flex: 1;
  color: var(--ink);
  font-family: var(--font-mono);
  font-size: var(--fs-aux);
}

.swatch__value {
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: var(--fs-unit);
}

.radius__box {
  flex: none;
  width: var(--s8);
  height: var(--s8);
  background: var(--brand-soft);
  border: var(--hairline) solid var(--brand);
}

.space__bar {
  flex: none;
  height: var(--s3);
  background: var(--brand);
  border-radius: var(--r-xs);
}

.size__sample {
  flex: 1;
  color: var(--ink);
  line-height: 1.2;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s3);
  align-items: center;
  margin-bottom: var(--s4);
}

.slider {
  margin: var(--s5) var(--s2) var(--s6);
}

.popup-body {
  padding: var(--s6) var(--s5);
  color: var(--ink-2);
  font-size: var(--fs-body);
}

.font-sample {
  margin: 0 0 var(--s3);
  color: var(--ink);
  font-size: var(--fs-meaning);
}

.font-sample--serif {
  font-family: var(--font-serif);
  font-weight: 600;
}

.font-sample--sans {
  font-family: var(--font-sans);
}

.font-sample--mono {
  font-family: var(--font-mono);
}
</style>

<route lang="json5">
{
  name: 'Tokens'
}
</route>
