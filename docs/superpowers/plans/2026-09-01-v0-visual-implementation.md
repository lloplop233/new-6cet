# V0 纯前端初步可视化验收版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **当前执行状态（2026-09-01）：** V0 已由用户确认验收通过，当前质量门禁和浏览器验收完成，并纳入 V0 Git checkpoint。下方复选框是原实施步骤，不作为当前状态源。

**Goal:** 建成可在手机浏览器完整查看和点击的 V0 产品页面，用固定 Mock 数据验收信息架构、视觉风格、基础交互和响应式布局。

**Architecture:** 页面优先使用局部 `ref/reactive`、固定 Mock 数组和 Router query。完成页与进度页直接展示固定体验结果，不读取学习页状态；不新建 Store、Service、业务 composable、Session、统计函数或持久化层。

**Tech Stack:** Vue 3、Vue Router、Vant 4、Less、现有 CSS Token、Vite。

**Spec:** `docs/superpowers/specs/2026-09-01-frontend-experience-design.md`

## Global Constraints

- 阶段固定为 `V0 / L2 / 初步可视化验收`。
- UI 库只有 Vant 4，不引入第二套 UI 库或图标库。
- 不修改 `设计系统.md`，保持青墨、纸质浅底、衬线单词、三档评分色和横线段 QueueBar。
- Vant 外观不写 `.van-*` 覆盖；页面和组件不写字面颜色、字号、圆角或间距。
- 不修改 `src/stores/`、`src/types/`、`src/services/`、FSRS、持久化、真实词库、TTS、PWA 或后端相关文件。
- 不新增 Store、Service、业务 composable、业务纯函数或业务单元测试。
- 不提交 Git commit；用户未授权提交。
- 完成一次集中视觉验收和最多一次集中修复后停止，不进入 V1。

---

## File Structure

### New files

- `src/constants/mock-words.ts`：6 个固定学习条目及其固定选择题选项。
- `src/components/ui/Eyebrow.vue`：页面小标题。
- `src/components/ui/StatCard.vue`：数据卡外壳。
- `src/components/ui/StatNumber.vue`：大数字与单位。
- `src/components/ui/SegmentToggle.vue`：模式和状态预览切换。
- `src/components/ui/StatePanel.vue`：Empty、Error、Disabled 视觉反馈。
- `src/components/word/QueueBar.vue`：固定队列段和结果色。
- `src/components/word/RateButtons.vue`：三档视觉评分控件。
- `src/pages/progress/index.vue`：固定体验进度页。
- `src/pages/settings/index.vue`：局部设置控件和状态视觉预览。
- `src/pages/study/index.vue`：翻卡与选择题局部 Demo。
- `src/pages/study/complete.vue`：固定 Mock 完成结果。

### Modified files

- `src/pages/index.vue`：正式今日页。
- `src/pages/[...all].vue`：单一返回入口和明确标题。
- `src/components/layout/TabBar.vue`：今日、进度、设置三个一级入口。
- `src/constants/index.ts`：新路由标题和根路由清单。
- `src/styles/tokens.less`：仅在现有 Token 无法表达必要排版时增加最小行高 Token。

## Task 1: 固定 Mock 数据与共享视觉组件

**Files:**

- Create: `src/constants/mock-words.ts`
- Create: `src/components/ui/Eyebrow.vue`
- Create: `src/components/ui/StatCard.vue`
- Create: `src/components/ui/StatNumber.vue`
- Create: `src/components/ui/SegmentToggle.vue`
- Create: `src/components/ui/StatePanel.vue`
- Create: `src/components/word/QueueBar.vue`
- Create: `src/components/word/RateButtons.vue`
- Modify: `src/styles/tokens.less`

**Interfaces:**

- `MOCK_STUDY_ITEMS`：只读 6 项数组，每项包含现有 `Word` 所需字段、4 个固定选项和 `correctIndex`。
- `SegmentToggle`：`modelValue: string`、`options: readonly { label: string; value: string }[]`，emit `update:modelValue`。
- `QueueBar`：`segments: readonly ('know' | 'vague' | 'unknown' | 'pending')[]`。
- `RateButtons`：`modelValue?: 'know' | 'vague' | 'unknown'`，emit `update:modelValue`。
- `StatePanel`：`state: 'empty' | 'error' | 'disabled'`、`title`、`description`、可选 `actionLabel`，emit `action`。

- [ ] **Step 1: 创建固定 Mock 学习条目**

在 `src/constants/mock-words.ts` 中定义 V0 专用本地接口和数组，不修改 `src/types/`：

```ts
import type { Word } from '@/types/word'

interface MockStudyItem {
  readonly word: Word
  readonly options: readonly [string, string, string, string]
  readonly correctIndex: number
}

export const MOCK_STUDY_ITEMS = [
  {
    word: {
      id: 'abandon', text: 'abandon', rank: 1, phonetic: '/əˈbændən/',
      senses: [{ partOfSpeech: 'v.', definition: '放弃；抛弃' }],
      examples: [{ english: 'They refused to abandon the plan.', chinese: '他们拒绝放弃这项计划。' }],
      realExamYears: ['Mock'],
    },
    options: ['放弃；抛弃', '维持；支撑', '仔细考虑', '模糊不清的'],
    correctIndex: 0,
  },
  {
    word: {
      id: 'deliberate', text: 'deliberate', rank: 2, phonetic: '/dɪˈlɪbərət/',
      senses: [{ partOfSpeech: 'adj.', definition: '深思熟虑的；故意的' }],
      examples: [{ english: 'It was a deliberate decision.', chinese: '这是一个经过深思熟虑的决定。' }],
      realExamYears: ['Mock'],
    },
    options: ['暂定的', '深思熟虑的；故意的', '令人信服的', '维持；支撑'],
    correctIndex: 1,
  },
  {
    word: {
      id: 'compelling', text: 'compelling', rank: 3, phonetic: '/kəmˈpelɪŋ/',
      senses: [{ partOfSpeech: 'adj.', definition: '令人信服的；引人入胜的' }],
      examples: [{ english: 'She made a compelling argument.', chinese: '她提出了一个令人信服的论点。' }],
      realExamYears: ['Mock'],
    },
    options: ['模糊不清的', '放弃；抛弃', '令人信服的；引人入胜的', '暂定的'],
    correctIndex: 2,
  },
  {
    word: {
      id: 'obscure', text: 'obscure', rank: 4, phonetic: '/əbˈskjʊr/',
      senses: [{ partOfSpeech: 'adj.', definition: '模糊不清的；鲜为人知的' }],
      examples: [{ english: 'The reference remains obscure.', chinese: '这处引用仍然晦涩难懂。' }],
      realExamYears: ['Mock'],
    },
    options: ['维持；支撑', '深思熟虑的', '令人信服的', '模糊不清的；鲜为人知的'],
    correctIndex: 3,
  },
  {
    word: {
      id: 'sustain', text: 'sustain', rank: 5, phonetic: '/səˈsteɪn/',
      senses: [{ partOfSpeech: 'v.', definition: '维持；支撑' }],
      examples: [{ english: 'The system must sustain long-term use.', chinese: '这个系统必须支持长期使用。' }],
      realExamYears: ['Mock'],
    },
    options: ['维持；支撑', '暂定的', '放弃；抛弃', '模糊不清的'],
    correctIndex: 0,
  },
  {
    word: {
      id: 'tentative', text: 'tentative', rank: 6, phonetic: '/ˈtentətɪv/',
      senses: [{ partOfSpeech: 'adj.', definition: '暂定的；试探性的' }],
      examples: [{ english: 'We reached a tentative agreement.', chinese: '我们达成了一项暂定协议。' }],
      realExamYears: ['Mock'],
    },
    options: ['令人信服的', '维持；支撑', '暂定的；试探性的', '深思熟虑的'],
    correctIndex: 2,
  },
] as const satisfies readonly MockStudyItem[]
```

每项包含单词、音标、词性、中文释义、英文例句、中文例句和四个固定选项；正确答案位置在六题间分散，但不实现生成算法。

- [ ] **Step 2: 创建通用 UI 组件**

组件只使用现有 Token；`StatCard` 使用 slot 承载内容，`StatNumber` 只渲染数值与单位，`SegmentToggle` 只负责当前页可见选择，`StatePanel` 只负责视觉状态与可选按钮。

```vue
<SegmentToggle v-model="mode" :options="MODE_OPTIONS" />
<StatePanel
  state="error"
  title="暂时没有加载成功"
  description="这是 V0 的错误状态视觉示例。"
  action-label="重试"
  @action="previewState = 'empty'"
/>
```

- [ ] **Step 3: 创建词汇视觉组件**

`QueueBar` 为每段输出语义类名和可访问标签；`RateButtons` 循环渲染三档，点击只 emit 当前选择，不写业务结果。

```vue
<QueueBar :segments="queueSegments" />
<RateButtons v-model="selectedRating" />
```

- [ ] **Step 4: 仅在必要时补充排版 Token**

若组件需要统一行高，只在 `src/styles/tokens.less` 添加：

```less
--lh-tight: 1.2;
--lh-body: 1.6;
--lh-relaxed: 1.7;
```

不新增阴影、渐变、品牌色、圆角或间距体系。

- [ ] **Step 5: 运行定向静态检查**

Run: `pnpm typecheck`
Expected: exit code 0。

Run: `pnpm lint`
Expected: exit code 0。

## Task 2: 产品导航与今日页

**Files:**

- Modify: `src/constants/index.ts`
- Modify: `src/components/layout/TabBar.vue`
- Modify: `src/pages/index.vue`
- Modify: `src/pages/[...all].vue`

**Interfaces:**

- 根路由：`Home`、`Progress`、`Settings`。
- 页面标题：`Home`、`Study`、`StudyComplete`、`Progress`、`Settings`、`Tokens`、`404`。
- 今日页通过 `/study?mode=flashcard` 或 `/study?mode=multiple-choice` 进入学习 Demo。

- [ ] **Step 1: 更新路由标题与根路由清单**

```ts
export const routeTitles: Record<string, string> = {
  Home: '今日',
  Study: '今日学习',
  StudyComplete: '本组完成',
  Progress: '进度',
  Settings: '设置',
  Tokens: '设计 token 验收',
  404: '页面不存在',
}

export const rootRouteList = ['Home', 'Progress', 'Settings'] as const
```

- [ ] **Step 2: 更新 TabBar**

TabBar 只保留：

```text
今日 → /
进度 → /progress
设置 → /settings
```

使用 Vant 内置图标，不保留“设计”入口。

- [ ] **Step 3: 将首页替换为正式今日页**

使用局部 `ref<StudyMode>('flashcard')`，模式切换改变说明和主按钮文案；开始按钮只执行 Router 跳转。页面显示 6 词、0 已完成、固定 pending QueueBar、固定最近结果卡和 Mock 提示。

```ts
function startStudy() {
  router.push({ path: '/study', query: { mode: selectedMode.value } })
}
```

- [ ] **Step 4: 简化 404**

保留图标、说明和“返回首页”按钮；移除依赖历史记录的双重返回语义，按钮固定 `router.replace('/')`。NavBar 仍提供框架返回箭头时，页面按钮文案明确为“返回首页”。

- [ ] **Step 5: 运行定向检查**

Run: `pnpm typecheck && pnpm lint`
Expected: exit code 0。

## Task 3: 学习页与完成页 Demo

**Files:**

- Create: `src/pages/study/index.vue`
- Create: `src/pages/study/complete.vue`

**Interfaces:**

- `/study?mode=flashcard`：翻卡局部 Demo。
- `/study?mode=multiple-choice`：选择题局部 Demo。
- `/study/complete?mode=<mode>`：固定完成结果，仅用 query 决定是否显示“答对 5 题”。

- [ ] **Step 1: 创建学习页模式解析和局部状态**

```ts
type VisualRating = 'know' | 'vague' | 'unknown'

const mode = computed(() => route.query.mode === 'multiple-choice'
  ? 'multiple-choice'
  : 'flashcard')
const currentIndex = ref(0)
const isRevealed = ref(false)
const selectedRating = ref<VisualRating>()
const selectedOption = ref<number>()
```

索引只在本页变化，不写 Store、Session 或结果对象。

- [ ] **Step 2: 实现翻卡视觉流程**

按规格渲染 QueueBar、单词、音标、Disabled 发音、查看释义、中文释义、词性、例句、RateButtons 和下一词按钮。评分只设置 `selectedRating`；下一词重置两个局部状态。最后一词跳转完成页。

- [ ] **Step 3: 实现选择题视觉流程**

从当前 Mock 项直接读取四个选项与 `correctIndex`。点击后只设置 `selectedOption`；用文字和图标展示正确/错误，同时锁定本题选项。下一题只增加本页索引，最后进入完成页。

- [ ] **Step 4: 创建固定完成页**

固定展示 6、4、1、1 和固定 QueueBar；选择题模式额外显示“答对 5 题”。提供三个 Router 按钮：返回今日、查看进度、再来一组。

```ts
router.push('/')
router.push('/progress')
router.push({ path: '/study', query: { mode } })
```

- [ ] **Step 5: 运行定向检查**

Run: `pnpm typecheck && pnpm lint`
Expected: exit code 0。

## Task 4: 进度页、设置页与状态视觉

**Files:**

- Create: `src/pages/progress/index.vue`
- Create: `src/pages/settings/index.vue`

**Interfaces:**

- 进度页完全静态，不读取学习页。
- 设置页全部使用局部 `ref`，离开页面无需保持。

- [ ] **Step 1: 创建固定进度页**

展示固定已体验词数、目标词量、三档结果、最近一组和 QueueBar。页面同时显示“当前为体验数据，不代表真实学习历史”，并提供返回今日开始 Demo 的入口。

- [ ] **Step 2: 创建设置页局部控件**

```ts
const preferredMode = ref<StudyMode>('flashcard')
const targetWordCount = ref(2500)
const previewState = ref<'loading' | 'empty' | 'error' | 'disabled'>('loading')
```

模式与 Slider 只更新本页说明。自动发音和备份恢复使用 Disabled Cell/按钮并给出后续阶段说明。

- [ ] **Step 3: 创建局部 Reset 演示**

点击“重置体验”打开 Vant Dialog；确认后只恢复 `preferredMode`、`targetWordCount` 和 `previewState`，并显示 Toast。不得触碰其他页面状态或浏览器存储。

- [ ] **Step 4: 创建状态样式预览**

局部切换四种状态：Loading 使用 Skeleton；Empty、Error、Disabled 使用 `StatePanel`。Error 的“重试”只把 `previewState` 改为 `empty`，用于展示按钮反馈。

- [ ] **Step 5: 运行定向检查**

Run: `pnpm typecheck && pnpm lint`
Expected: exit code 0。

## Task 5: 自动化、规范与浏览器集中验收

**Files:**

- Modify only files already in scope when verification finds a blocking issue.

- [ ] **Step 1: 运行 V0 自动化门禁**

Run: `pnpm typecheck`
Expected: exit code 0。

Run: `pnpm lint`
Expected: exit code 0。

Run: `pnpm build:pro`
Expected: exit code 0。

Run: `pnpm test`
Expected: existing low-cost tests pass；不新增 V0 业务测试。

- [ ] **Step 2: 运行工程规范扫描**

```powershell
rg -n --glob '*.vue' --glob '*.ts' -- '--van-' src
rg -n '\.van-' src
rg -n '#[0-9a-fA-F]{3,8}\b' src --glob '!styles/**' --glob '!**/*.svg'
Test-Path -LiteralPath 'src/api'
```

Expected: `--van-` 只在 `src/styles/var.less`；没有 `.van-` 覆盖；页面/组件没有字面颜色；`src/api` 不存在。

人工检查新组件没有根级 `margin`、props 不超过 6 个、相同视觉结构已经复用。

- [ ] **Step 3: 启动开发服务器并检查核心路径**

Run: `pnpm dev`
Browser flows:

```text
今日 → 翻卡 Demo → 完成
今日 → 选择题 Demo → 完成
完成 → 进度
TabBar → 今日 → 进度 → 设置
设置 → Loading / Empty / Error / Disabled
404 → 返回首页
```

Expected: 所有入口可点击；按钮有可观察反馈；控制台无阻断性错误。

- [ ] **Step 4: 四视口成组检查**

在 320×700、375×812、430×932、600×900 视口一次性检查所有核心页面，记录溢出、遮挡、过密、长文本和单手操作问题。

- [ ] **Step 5: 最多一次集中修复**

只修复 Step 3–4 发现的阻断性视觉、路由或交互问题；不借机增加业务逻辑、重构或视觉装饰。

- [ ] **Step 6: 确认检查并停止**

再次运行 `pnpm typecheck && pnpm lint && pnpm build:pro`，并复查被修复的视口与流程。确认后输出修改页面、组件、Mock 行为、故意未实现行为、检查结果和剩余视觉风险，停止开发等待用户亲自体验。

## Completion Record

- 2026-09-01：Task 1–5 已按 V0 范围实施并集中验收。
- 自动门禁：`typecheck`、`lint`、`test`、`build:pro` 均通过。
- 浏览器验收：翻卡与选择题流程均走通；Loading / Empty / Error / Disabled、设置确认弹窗、404 返回均已检查。
- 响应式验收：320×700、375×812、430×932、600×900 均无横向溢出。
- 2026-09-01：用户确认 V0 版本没有问题，产品结构、视觉方向和连续学习交互通过验收。
- 停止条件：V0 到此停止；不在本 checkpoint 中继续实现 Store、Session、持久化、FSRS 或正式统计逻辑。
