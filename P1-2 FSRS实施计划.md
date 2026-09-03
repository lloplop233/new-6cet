# P1-2 FSRS 实施计划

> **供 Agent 执行：** REQUIRED SUB-SKILL：使用 `superpowers:executing-plans` 按任务逐项实施。所有步骤使用复选框跟踪。
>
> **历史实施计划。** P1-2 已完成实现、独立 L3 Review、Review 修复和集成。下方复选框保留原实施步骤，只解释当时的执行路径，不作为当前状态源；当前事实只看 `交接文档.md` 和 Git。

**目标：** 精确接入 `ts-fsrs@5.4.1`，建立项目自有的 FSRS 状态、评分、状态、时间与参数边界，并以确定性测试冻结 P1-2 策略。

**架构：** 第三方 FSRS 类型只出现在 `src/utils/fsrs.ts` 适配边界和验证测试中；`src/types/fsrs.ts` 只定义 JSON 可序列化的项目类型，`src/constants/fsrs.ts` 只定义已确认的版本和参数常量。完整调度 Service 留给 P4-1，本阶段通过真实库 golden test 和 test-only 状态恢复夹具证明策略可行。

**技术栈：** Vue 3、TypeScript、Node.js 内置测试、`ts-fsrs@5.4.1`、pnpm。

**规格：** `P1-2 FSRS实现策略.md`

## 全局约束

- 精确安装 `ts-fsrs@5.4.1`，不使用 `^`，不安装 `@open-spaced-repetition/binding`。
- 项目 `Rating` 只有 `again | hard | good`，不增加 `easy`。
- 项目持久化时间只使用 UTC Unix epoch milliseconds。
- `Timestamp` 的有效范围是 `[0, 8_640_000_000_000_000]` 内的安全整数。
- `ReviewState` 的既有字段语义不得修改。
- `elapsed_days` 不作为当前 `next()` 前向调度的持久化核心状态。
- 若未来支持 `rollback`、revlog 持久化或 history replay，必须重新评估 `elapsed_days` 和历史字段。
- `schemaVersion` 与 `libraryVersion` 职责独立。
- `ts-fsrs@5.4.1` 要求 Node.js `>=20.0.0`；项目声明和实际执行环境都必须满足。
- 不实现 P1-3、P1-4、P2、Store、Service、页面或 UI。
- 5 个自动生成的 `.d.ts` 文件不得修改。

---

## 文件结构

- Modify：`package.json`——精确声明 `ts-fsrs@5.4.1`。
- Modify：`pnpm-lock.yaml`——锁定依赖完整性。
- Create：`src/types/fsrs.ts`——项目自有的算法状态和参数快照类型。
- Create：`src/constants/fsrs.ts`——库版本、算法版本、时间上限和默认参数常量。
- Create：`src/utils/fsrs.ts`——唯一评分映射、双向状态映射、时间转换和参数快照生成。
- Create：`src/utils/fsrs.test.ts`——契约、边界、golden behavior 和 JSON 恢复测试。
- Modify：`P1-2 FSRS实现策略.md`——实现后状态与实测记录。
- Modify：`项目实施计划.md`——P1-2 状态。
- Modify：`交接文档.md`——总进度和下一步。
- Modify：`P1交接文档.md`——P1-2 交接证据。

---

## Task 1：锁定 `ts-fsrs@5.4.1` 并证明环境兼容

**文件：**

- Create：`src/utils/fsrs.test.ts`
- Modify：`package.json`
- Modify：`pnpm-lock.yaml`

**接口：**

- Consumes：项目 Node.js `>=22.23.0` 约束。
- Produces：可由 Node.js ESM 和 TypeScript 解析的 `ts-fsrs@5.4.1`。

- [ ] **Step 1：写缺少依赖的 RED 测试**

创建 `src/utils/fsrs.test.ts`：

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { createEmptyCard, fsrs } from 'ts-fsrs'

describe('FSRS dependency contract', () => {
  it('loads the scheduler through ESM', () => {
    assert.equal(typeof fsrs, 'function')
    assert.equal(createEmptyCard(new Date(0)).due.getTime(), 0)
  })

  it('runs on the declared Node.js baseline', () => {
    const major = Number.parseInt(process.versions.node.split('.')[0], 10)

    assert.ok(major >= 20)
  })
})
```

- [ ] **Step 2：运行 RED**

```powershell
node --test src/utils/fsrs.test.ts
```

Expected：FAIL，包含找不到 `ts-fsrs` 的 `ERR_MODULE_NOT_FOUND` 或等价错误。

- [ ] **Step 3：精确安装依赖**

```powershell
pnpm add --save-exact ts-fsrs@5.4.1
```

若供应链联网校验阻断 `pnpm`，不修改代理；改用本机已有 pnpm store 或记录阻断后停止依赖变更。

- [ ] **Step 4：验证 GREEN 和锁定方式**

```powershell
node --test src/utils/fsrs.test.ts
node -e "const p=require('./package.json'); if(p.dependencies['ts-fsrs']!=='5.4.1') process.exit(1)"
node -e "const major=Number(process.versions.node.split('.')[0]); if(major<20) process.exit(1)"
```

Expected：测试 2/2 通过；依赖值严格等于 `5.4.1`；实际 Node.js major 大于等于 20。

- [ ] **Step 5：提交依赖基线**

```powershell
git add -- package.json pnpm-lock.yaml src/utils/fsrs.test.ts
git -c user.name="lloplop233" -c user.email="239779306+lloplop233@users.noreply.github.com" commit -m "test(fsrs): lock scheduler dependency"
```

---

## Task 2：定义项目自有状态并冻结双向状态映射

**文件：**

- Create：`src/types/fsrs.ts`
- Create：`src/utils/fsrs.ts`
- Modify：`src/utils/fsrs.test.ts`

**接口：**

- Consumes：`ReviewPhase`、`ts-fsrs State`。
- Produces：`FsrsSchedulingState`、`FsrsParametersSnapshot`、`toFsrsState()`、`fromFsrsState()`。

- [ ] **Step 1：写状态与类型 RED 测试**

在 `src/utils/fsrs.test.ts` 加入：

```ts
import { State } from 'ts-fsrs'

import type { FsrsSchedulingState } from '../types/fsrs'
import type { ReviewState } from '../types/review'
import { fromFsrsState, toFsrsState } from './fsrs'

describe('FSRS state boundary', () => {
  it('maps every project phase in both directions', () => {
    const cases = [
      ['new', State.New],
      ['learning', State.Learning],
      ['review', State.Review],
      ['relearning', State.Relearning],
    ] as const

    for (const [phase, state] of cases) {
      assert.equal(toFsrsState(phase), state)
      assert.equal(fromFsrsState(state), phase)
    }
  })

  it('keeps business and algorithm state keys disjoint', () => {
    const review = {
      wordId: 'dignity',
      phase: 'learning',
      dueAt: 1_788_105_660_000,
      lastReviewedAt: 1_788_105_600_000,
      reviewCount: 1,
      lapseCount: 0,
    } satisfies ReviewState
    const scheduling = {
      stability: 2.3065,
      difficulty: 5,
      scheduledDays: 0,
      learningSteps: 1,
    } satisfies FsrsSchedulingState

    const overlappingKeys = Object.keys(review).filter(key => key in scheduling)
    assert.deepEqual(overlappingKeys, [])
  })
})
```

- [ ] **Step 2：运行 RED**

```powershell
node --test src/utils/fsrs.test.ts
```

Expected：FAIL，缺少 `../types/fsrs` 和 `./fsrs`。

- [ ] **Step 3：实现最小项目类型**

创建 `src/types/fsrs.ts`：

```ts
export interface FsrsSchedulingState {
  stability: number
  difficulty: number
  scheduledDays: number
  learningSteps: number
}

export interface FsrsParametersSnapshot {
  requestRetention: number
  maximumInterval: number
  weights: readonly number[]
  enableFuzz: boolean
  enableShortTerm: boolean
  learningSteps: readonly string[]
  relearningSteps: readonly string[]
}
```

- [ ] **Step 4：实现穷尽状态转换**

创建 `src/utils/fsrs.ts`，先实现：

```ts
import { State } from 'ts-fsrs'

import type { ReviewPhase } from '../types/review'

export function toFsrsState(phase: ReviewPhase): State {
  switch (phase) {
    case 'new': return State.New
    case 'learning': return State.Learning
    case 'review': return State.Review
    case 'relearning': return State.Relearning
  }
}

export function fromFsrsState(state: State): ReviewPhase {
  switch (state) {
    case State.New: return 'new'
    case State.Learning: return 'learning'
    case State.Review: return 'review'
    case State.Relearning: return 'relearning'
    default: throw new RangeError(`Unsupported FSRS state: ${state}`)
  }
}
```

- [ ] **Step 5：运行 GREEN**

```powershell
node --test src/utils/fsrs.test.ts
node .\node_modules\vue-tsc\bin\vue-tsc.js --noEmit
node .\node_modules\eslint\bin\eslint.js src/types/fsrs.ts src/utils/fsrs.ts src/utils/fsrs.test.ts
```

Expected：全部退出码为 `0`。

- [ ] **Step 6：提交状态边界**

```powershell
git add -- src/types/fsrs.ts src/utils/fsrs.ts src/utils/fsrs.test.ts
git -c user.name="lloplop233" -c user.email="239779306+lloplop233@users.noreply.github.com" commit -m "feat(fsrs): define scheduler state boundary"
```

---

## Task 3：实现评分映射与严格时间边界

**文件：**

- Create：`src/constants/fsrs.ts`
- Modify：`src/utils/fsrs.ts`
- Modify：`src/utils/fsrs.test.ts`

**接口：**

- Consumes：项目 `Rating`、`Timestamp`。
- Produces：`toFsrsRating()`、`timestampToDate()`、`dateToTimestamp()`、`MAX_TIMESTAMP`。

- [ ] **Step 1：写评分和时间 RED 测试**

在测试中加入三档映射、合法边界和非法表驱动用例：

```ts
import { Rating as FsrsRating } from 'ts-fsrs'

import { MAX_TIMESTAMP } from '../constants/fsrs'
import {
  dateToTimestamp,
  timestampToDate,
  toFsrsRating,
} from './fsrs'

describe('FSRS rating and time boundary', () => {
  it('maps the three product ratings exactly', () => {
    assert.equal(toFsrsRating('again'), FsrsRating.Again)
    assert.equal(toFsrsRating('hard'), FsrsRating.Hard)
    assert.equal(toFsrsRating('good'), FsrsRating.Good)
  })

  it('round-trips the valid timestamp boundaries', () => {
    for (const timestamp of [0, 1_788_105_600_000, MAX_TIMESTAMP]) {
      assert.equal(dateToTimestamp(timestampToDate(timestamp)), timestamp)
    }
  })

  it('rejects every invalid timestamp input', () => {
    const invalid = [8_640_000_000_000_001, Number.NaN, Infinity, 1.5, -1, null]

    for (const value of invalid)
      assert.throws(() => timestampToDate(value), RangeError)
  })

  it('rejects Invalid Date', () => {
    assert.throws(() => dateToTimestamp(new Date(Number.NaN)), RangeError)
  })
})
```

- [ ] **Step 2：运行 RED**

```powershell
node --test src/utils/fsrs.test.ts
```

Expected：FAIL，目标常量和函数尚不存在。

- [ ] **Step 3：实现常量和最小转换**

创建 `src/constants/fsrs.ts`：

```ts
export const FSRS_ALGORITHM = 'FSRS-6' as const
export const FSRS_LIBRARY = 'ts-fsrs' as const
export const FSRS_LIBRARY_VERSION = '5.4.1' as const
export const MAX_TIMESTAMP = 8_640_000_000_000_000

export const FSRS_PARAMETER_OVERRIDES = Object.freeze({
  requestRetention: 0.9,
  maximumInterval: 36_500,
  enableFuzz: false,
  enableShortTerm: true,
  learningSteps: Object.freeze(['1m', '10m'] as const),
  relearningSteps: Object.freeze(['10m'] as const),
})
```

在 `src/utils/fsrs.ts` 中新增唯一评分表和严格转换函数。`timestampToDate(value: unknown)` 先检查 `typeof value === 'number'`、`Number.isSafeInteger`、范围，再构造 `Date` 并验证 `getTime()`；`dateToTimestamp(value: Date)` 检查 `instanceof Date`、有限值、安全整数和范围。所有非法值统一抛出 `RangeError`。

- [ ] **Step 4：运行 GREEN**

```powershell
node --test src/utils/fsrs.test.ts
node .\node_modules\vue-tsc\bin\vue-tsc.js --noEmit
node .\node_modules\eslint\bin\eslint.js src/constants/fsrs.ts src/utils/fsrs.ts src/utils/fsrs.test.ts
```

Expected：全部退出码为 `0`；非法输入逐项触发 `RangeError`。

- [ ] **Step 5：提交评分与时间边界**

```powershell
git add -- src/constants/fsrs.ts src/utils/fsrs.ts src/utils/fsrs.test.ts
git -c user.name="lloplop233" -c user.email="239779306+lloplop233@users.noreply.github.com" commit -m "feat(fsrs): enforce rating and time boundaries"
```

---

## Task 4：冻结参数快照和新词 golden behavior

**文件：**

- Modify：`src/utils/fsrs.ts`
- Modify：`src/utils/fsrs.test.ts`

**接口：**

- Consumes：`FSRS_PARAMETER_OVERRIDES`、`generatorParameters()`。
- Produces：`createFsrsParametersSnapshot()`。

- [ ] **Step 1：写参数与 golden RED 测试**

加入测试：

```ts
import { createEmptyCard, fsrs } from 'ts-fsrs'

import {
  createFsrsParametersSnapshot,
  timestampToDate,
  toFsrsRating,
} from './fsrs'

it('freezes the complete FSRS-6 parameter snapshot', () => {
  const snapshot = createFsrsParametersSnapshot()

  assert.equal(snapshot.requestRetention, 0.9)
  assert.equal(snapshot.maximumInterval, 36_500)
  assert.equal(snapshot.enableFuzz, false)
  assert.equal(snapshot.enableShortTerm, true)
  assert.deepEqual(snapshot.learningSteps, ['1m', '10m'])
  assert.deepEqual(snapshot.relearningSteps, ['10m'])
  assert.equal(snapshot.weights.length, 21)
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot)
})

it('keeps the new-card learning-step golden behavior', () => {
  const now = 1_788_105_600_000
  const scheduler = fsrs()
  const cases = [
    ['again', 60_000],
    ['hard', 360_000],
    ['good', 600_000],
  ] as const

  for (const [rating, expectedOffset] of cases) {
    const card = createEmptyCard(timestampToDate(now))
    const result = scheduler.next(card, timestampToDate(now), toFsrsRating(rating))
    assert.equal(result.card.due.getTime() - now, expectedOffset)
  }
})
```

- [ ] **Step 2：运行 RED**

```powershell
node --test src/utils/fsrs.test.ts
```

Expected：FAIL，缺少 `createFsrsParametersSnapshot()`。

- [ ] **Step 3：实现最小参数快照转换**

在 `src/utils/fsrs.ts` 中调用 `generatorParameters()`，显式传入已经冻结的参数覆盖，然后将 snake_case 库字段复制为 `FsrsParametersSnapshot` 的 camelCase JSON 字段。所有数组使用新数组复制，不能把第三方对象直接暴露给调用方。

- [ ] **Step 4：运行 GREEN**

```powershell
node --test src/utils/fsrs.test.ts
node .\node_modules\vue-tsc\bin\vue-tsc.js --noEmit
node .\node_modules\eslint\bin\eslint.js src/constants/fsrs.ts src/types/fsrs.ts src/utils/fsrs.ts src/utils/fsrs.test.ts
```

Expected：golden behavior 精确为 `+60_000`、`+360_000`、`+600_000` 毫秒，即 `+1m`、`+6m`、`+10m`；全部检查退出码为 `0`。

- [ ] **Step 5：提交参数与 golden contract**

```powershell
git add -- src/utils/fsrs.ts src/utils/fsrs.test.ts
git -c user.name="lloplop233" -c user.email="239779306+lloplop233@users.noreply.github.com" commit -m "test(fsrs): freeze parameters and learning steps"
```

---

## Task 5：证明 JSON 恢复后 `learning_steps` 可继续推进

**文件：**

- Modify：`src/utils/fsrs.test.ts`

**接口：**

- Consumes：真实 `Card`、`ReviewState`、`FsrsSchedulingState`、现有状态和时间转换函数。
- Produces：只用于契约验证的 test-only `persistCard()` 和 `restoreCard()`；不新增生产调度 API。

- [ ] **Step 1：写状态恢复测试**

在测试文件内添加 test-only helper：

```ts
function persistCard(wordId: string, card: Card) {
  const review = {
    wordId,
    phase: fromFsrsState(card.state),
    dueAt: dateToTimestamp(card.due),
    lastReviewedAt: card.last_review ? dateToTimestamp(card.last_review) : null,
    reviewCount: card.reps,
    lapseCount: card.lapses,
  } satisfies ReviewState
  const scheduling = {
    stability: card.stability,
    difficulty: card.difficulty,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
  } satisfies FsrsSchedulingState
  return { review, scheduling }
}
```

`restoreCard()` 将嵌套项目状态恢复为 `CardInput`：`due` 和 `last_review` 使用严格时间转换，`state` 使用 `toFsrsState()`，`reps/lapses` 和四个算法字段分别取自其唯一拥有者，`elapsed_days` 仅填兼容初值 `0`。

- [ ] **Step 2：验证恢复后继续调度**

测试流程：

1. 在固定时间创建新词并评分 `Again`，得到仍处于学习阶段的 Card；
2. 一条路径直接在到期时间使用 `Good` 调用下一次 `next()`；
3. 另一条路径先 `persistCard()`，经原生 JSON 往返，再 `restoreCard()`，在相同到期时间使用 `Good`；
4. 断言两条路径的 `state`、`learning_steps` 和 `due.getTime()` 完全一致；
5. 断言恢复前后的 `learningSteps` 相等；
6. 断言 `ReviewState` 和 `FsrsSchedulingState` 的键集合无交集。

- [ ] **Step 3：运行测试**

```powershell
node --test src/utils/fsrs.test.ts
node .\node_modules\vue-tsc\bin\vue-tsc.js --noEmit
node .\node_modules\eslint\bin\eslint.js src/utils/fsrs.test.ts
```

Expected：JSON 恢复路径与直接路径完全一致；全部命令退出码为 `0`。

- [ ] **Step 4：提交恢复契约**

```powershell
git add -- src/utils/fsrs.test.ts
git -c user.name="lloplop233" -c user.email="239779306+lloplop233@users.noreply.github.com" commit -m "test(fsrs): verify JSON learning-step recovery"
```

---

## Task 6：全量验证并更新交接

**文件：**

- Modify：`P1-2 FSRS实现策略.md`
- Modify：`项目实施计划.md`
- Modify：`交接文档.md`
- Modify：`P1交接文档.md`

**接口：**

- Consumes：Tasks 1～5 的实现和验证结果。
- Produces：P1-2 完成状态与 P1-3 可直接消费的决策记录。

- [ ] **Step 1：记录构建前后证据**

生产构建后记录 `dist/assets` 中 JavaScript 文件名和字节数。若没有可复现的依赖接入前构建产物，只记录接入后的实际值，不编造差值。

- [ ] **Step 2：运行完整质量门禁**

优先运行：

```powershell
pnpm check
```

若宿主供应链联网校验阻断，运行等价分项：

```powershell
node .\node_modules\vue-tsc\bin\vue-tsc.js --noEmit
node .\node_modules\eslint\bin\eslint.js .
node --test
node .\node_modules\vite\bin\vite.js build --mode production
```

Expected：全部分项退出码为 `0`；只允许交接文档已经记录的 Vite `NODE_ENV` 和 PostCSS `from` 非阻断警告。

- [ ] **Step 3：运行工程规范扫描**

```powershell
$issues = @()
$vanVars = rg -n --glob '*.vue' --glob '*.ts' -- '--van-' src
if ($LASTEXITCODE -eq 0) { $issues += $vanVars }
$vanClasses = rg -n '\.van-' src
if ($LASTEXITCODE -eq 0) { $issues += $vanClasses }
$hex = rg -ni --glob '!src/styles/**' --glob '!src/assets/**/*.svg' --glob '!*.svg' '#[0-9a-f]{3,8}\b' src
if ($LASTEXITCODE -eq 0) { $issues += $hex }
$literalUnits = rg -n --glob '*.vue' --glob '*.ts' '(?:\b\d+(?:\.\d+)?(?:px|rem|em|vw|vh)\b)' src/components src/pages
if ($LASTEXITCODE -eq 0) { $issues += $literalUnits }
if (Test-Path -LiteralPath 'src/api') { $issues += '存在 src/api' }
if ($issues.Count -gt 0) { $issues; exit 1 }
```

Expected：退出码 `0`，无输出。

- [ ] **Step 4：更新项目状态和交接**

- `P1-2 FSRS实现策略.md`：状态改为已实现并验证，写入实际依赖、Node.js、测试和构建证据。
- `项目实施计划.md`：只有全部验收通过才把 P1-2 改为 `[x]`，下一任务保持 P1-3。
- `交接文档.md`：已完成加入 P1-2，下一步改为 P1-3。
- `P1交接文档.md`：按“已完成、修改文件、验证、关键决策、未完成或风险、下一任务与风险”更新。

- [ ] **Step 5：检查手术式改动范围**

```powershell
git status --short
git diff --stat
git diff --name-only
```

Expected：只包含本计划列出的依赖、FSRS 类型/常量/工具/测试和文档；自动生成 `.d.ts`、页面、Store、Service 和样式文件不出现。

- [ ] **Step 6：提交最终文档**

```powershell
git add -- 'P1-2 FSRS实现策略.md' '项目实施计划.md' '交接文档.md' 'P1交接文档.md'
git -c user.name="lloplop233" -c user.email="239779306+lloplop233@users.noreply.github.com" commit -m "docs: complete P1-2 handoff"
```

- [ ] **Step 7：最终核验**

```powershell
git status --short --branch
git log --oneline -10
```

Expected：工作区干净；P1-2 的依赖、状态边界、评分/时间、golden test、JSON 恢复和交接提交全部可追溯。
