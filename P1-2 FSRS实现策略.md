# P1-2 FSRS 实现策略

> 日期：2026-08-31  
> 对应任务：`项目实施计划.md` P1-2  
> 状态：设计已确认；`codex/p1-fsrs-strategy@e6032e3` 已有主要实现，待 Task 6、当前验证、L3 独立 Review 和集成
> 范围：选择 FSRS 实现并冻结评分映射、时间边界、初始化参数、算法状态和升级约束

## 一、目标

为浏览器端 TypeScript 项目选择成熟的 FSRS 实现，并建立项目领域类型与第三方库之间的最小稳定边界，使后续 P1-3 存储协议和 P4-1 调度适配层无需重新决定以下问题：

- 使用哪个 FSRS 库和版本；
- 产品三档评分如何映射到库等级；
- `Timestamp` 如何与库时间类型转换；
- 新词使用哪些初始化参数；
- 哪些算法状态必须持久化；
- 库升级时如何避免静默改变已有用户的调度行为。

本阶段不实现完整调度服务、存储键、迁移链、Store、学习会话状态机、页面或 UI。

## 二、候选与结论

### 2.1 选择 `ts-fsrs@5.4.1`

项目精确依赖稳定版 `ts-fsrs@5.4.1`，不使用范围版本。该版本实现 FSRS-6，提供 ESM、CommonJS、UMD 和 TypeScript 类型，要求 Node.js `>=20.0.0`，采用 MIT 许可证，与本项目 Node.js `>=22.23.0` 和 Vite 浏览器构建兼容。

Open Spaced Repetition 的官方实现清单将 `ts-fsrs`列为 TypeScript 的 FSRS-6 scheduler。旧 `fsrs.js` 仓库已明确建议迁移到 `ts-fsrs`，理由是旧实现维护资源不足，而 `ts-fsrs` 的维护、功能和文档更活跃。

npm registry 在 2026-08-31 返回的 `5.4.1` 包元数据为：无运行时依赖、解包大小约 700 KB、13 个文件。该数字不是生产 bundle 大小；安装后必须通过 Vite 生产构建记录实际产物变化。

### 2.2 不选择 beta 或优化器

- 不采用 `ts-fsrs@6.0.0-beta.7`：beta API 尚未冻结，并计划移除 `elapsed_days` 等兼容字段，不适合作为长期本地进度协议的基础。
- 不安装 `@open-spaced-repetition/binding`：本项目当前只需要 scheduler，不训练个性化参数；该优化器包仍处于公开测试阶段。
- 不采用 `fsrs.js`：官方已经建议迁移。
- 不手写 FSRS 核心算法：避免偏离成熟实现，也符合项目计划约束。

### 2.3 官方依据

- [`ts-fsrs` 官方仓库](https://github.com/open-spaced-repetition/ts-fsrs)
- [`ts-fsrs` scheduler README](https://github.com/open-spaced-repetition/ts-fsrs/blob/v5.4.1/packages/fsrs/README.md)
- [`ts-fsrs@5.4.1` 包配置](https://github.com/open-spaced-repetition/ts-fsrs/blob/v5.4.1/packages/fsrs/package.json)
- [Open Spaced Repetition 实现清单](https://github.com/open-spaced-repetition/awesome-fsrs)
- [`fsrs.js` 迁移说明](https://github.com/open-spaced-repetition/fsrs.js)

## 三、稳定边界

项目领域类型不得暴露第三方 `Card`、`State`、`Rating`、`FSRSParameters` 或 `Date`。第三方类型只允许出现在 FSRS 适配模块内部。

本阶段新增项目自有 `FsrsSchedulingState`，只保存继续调度所需且无法从既有 `ReviewState` 稳定推导的算法状态：

```ts
export interface FsrsSchedulingState {
  stability: number
  difficulty: number
  scheduledDays: number
  learningSteps: number
}
```

既有 `ReviewState` 与 `ts-fsrs Card` 的语义映射固定为：

| 项目字段 | `ts-fsrs Card` 字段 |
|---|---|
| `phase: 'new'` | `State.New` |
| `phase: 'learning'` | `State.Learning` |
| `phase: 'review'` | `State.Review` |
| `phase: 'relearning'` | `State.Relearning` |
| `dueAt` | `due` |
| `lastReviewedAt` | `last_review` |
| `reviewCount` | `reps` |
| `lapseCount` | `lapses` |
| `FsrsSchedulingState.stability` | `stability` |
| `FsrsSchedulingState.difficulty` | `difficulty` |
| `FsrsSchedulingState.scheduledDays` | `scheduled_days` |
| `FsrsSchedulingState.learningSteps` | `learning_steps` |

`elapsed_days` 不作为当前 `next()` 前向调度所需的持久化核心状态。`ts-fsrs@5.4.1` 每次前向调度会根据 `last_review` 和调用方注入的本次复习时间重新计算该值；该字段在库中也已标记为将在 `6.0.0` 移除。适配层为 `5.4.1` 构造 `CardInput` 时可以填入兼容初值，但不得把它提升为当前前向调度的新持久化事实。若未来支持 `rollback`、revlog 持久化或 history replay，必须结合对应 API 对历史字段的要求重新评估，不能直接沿用本阶段结论。

本阶段不修改 `ReviewState` 已冻结字段。P1-3 决定组合记录在备份和 `localStorage` 中的具体嵌套形状。

`ReviewState` 与 `FsrsSchedulingState` 的字段所有权必须互斥：业务状态拥有 `wordId`、phase、到期时间、末次复习时间和计数；算法状态只拥有 stability、difficulty、调度天数和学习步骤。两者使用嵌套组合，不允许把同一语义同时存入两个对象，也不允许用展开运算合并为可能发生键覆盖的扁平对象。测试必须证明两个类型的实际序列化键集合不存在交集。

## 四、评分映射

评分映射只能存在于一个 FSRS 适配来源中：

| 产品 `Rating` | `ts-fsrs Rating` | 产品含义 |
|---|---|---|
| `again` | `Rating.Again` | 不熟 |
| `hard` | `Rating.Hard` | 模糊 |
| `good` | `Rating.Good` | 认识 |

产品不暴露 `easy` 按钮，适配层也不得产生 `Rating.Easy`。FSRS 的一次状态转换只消费本次实际选择的一个等级，因此缺少 `Easy` UI 不妨碍使用 `Again`、`Hard`、`Good` 三种合法等级。

UI、Store 和会话状态机不得直接 import `ts-fsrs Rating`；它们只使用项目自有 `Rating`。

## 五、时间边界

项目内部和持久化数据继续只使用 `Timestamp`，语义为 UTC Unix epoch milliseconds。

转换规则固定为：

```ts
Timestamp -> new Date(timestamp)
Date -> date.getTime()
```

边界约束：

- 不使用日期字符串作为适配层输入或持久化格式；
- 不使用带本地时区语义的分量构造器；
- 纯函数和测试不得调用 `Date.now()`，当前时间由调用方注入；
- `Timestamp` 必须是位于 `[0, 8_640_000_000_000_000]` 范围内的安全整数；
- `null` 时间必须由调用方或可空转换入口显式处理，不得传入 `Date` 构造器；
- `Timestamp -> Date` 后必须再次验证 `date.getTime()` 为有限值；
- `Date -> Timestamp` 必须拒绝 `Invalid Date`，并对结果重新执行相同的安全整数与范围检查；
- 固定毫秒时间必须双向无损往返。

## 六、初始化参数

项目采用 `ts-fsrs@5.4.1` 的 FSRS-6 默认权重，并显式冻结以下非权重参数：

```ts
{
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: false,
  enable_short_term: true,
  learning_steps: ['1m', '10m'],
  relearning_steps: ['10m'],
}
```

理由：

- 当前没有用户复习历史可用于参数优化，修改权重没有证据；
- 期望记忆率 `0.9` 是库默认值，适合在没有个性化数据时作为保守起点；
- 关闭 fuzz 使测试、恢复和问题复现保持确定性；
- 保留默认短期学习与重学步骤，避免在 P1-2 自行设计未经验证的学习节奏；
- 最大间隔沿用库默认值，不为当前三个月备考周期引入无必要的自定义上限。

完整参数通过固定版本的 `generatorParameters()`生成，项目不手工复制 `w`。P1-3 保存实际完整参数快照，而不是只保存部分配置。

## 七、新词初始化与状态转换

- 新词必须使用调用方注入的 `Timestamp` 调用 `createEmptyCard(new Date(timestamp))`，不得依赖库的当前时间默认值。
- 新词的项目业务状态为 `phase: 'new'`、`reviewCount: 0`、`lapseCount: 0`、`lastReviewedAt: null`。
- 调度只调用 `scheduler.next(card, reviewedAt, mappedRating)`，因为产品在用户评分后只需要一个确定结果，不需要持久化 `repeat()` 返回的四套预览。
- `New`、`Learning`、`Review`、`Relearning` 与项目 `new`、`learning`、`review`、`relearning` 一一映射，两个方向都必须穷尽处理。
- `Again`、`Hard`、`Good` 的具体到期时间和状态转换完全由库产生，项目不得复制或重写算法公式。

在固定时间创建的新词使用默认学习步骤时，首轮评分的 golden behavior 固定为：

| 评分 | 下次到期时间 |
|---|---|
| `Again` | 本次评分时间 `+1m` |
| `Hard` | 本次评分时间 `+6m` |
| `Good` | 本次评分时间 `+10m` |

测试不得只断言“得到合法日期”或“晚于当前时间”，必须断言精确毫秒差。该 golden test 同时保护三档映射和默认 `learning_steps` 配置。

完整的 `ReviewState + FsrsSchedulingState <-> CardInput/Card` 适配与调度函数属于 P4-1；P1-2 只实现足以验证映射、时间和序列化契约的最小纯函数。

## 八、序列化与升级约束

P1-3 的项目存储协议必须拥有独立的 `schemaVersion`，并能在 scheduler 元数据中记录：

```ts
{
  algorithm: 'FSRS-6',
  library: 'ts-fsrs',
  libraryVersion: '5.4.1',
  parameters: FsrsParametersSnapshot,
}
```

其中 `parameters` 是 `generatorParameters()`生成并经过项目边界校验的完整 JSON 快照，包括 `w`。上述元数据放在存储协议的统一位置，不在每个单词上重复保存。

`schemaVersion` 表示项目自身存储结构的版本，用于选择校验和迁移路径；`libraryVersion` 只表示生成或读取 FSRS 状态时使用的第三方库版本。两者职责不同，`libraryVersion` 不能代替、推导或兼任 `schemaVersion`。

每个已有进度必须包含 `ReviewState` 和 `FsrsSchedulingState`。不持久化 `Date`、库类实例、`Map`、`Set`、函数、四档预览结果或可重新计算的 `elapsed_days`。

序列化验证必须覆盖真实继续调度：先从库结果提取项目 JSON 状态，经原生 `JSON.stringify`/`JSON.parse` 恢复，再把恢复结果重建为库输入并调用下一次 `next()`。恢复路径的结果必须与未经过 JSON 往返的基线在状态、学习步骤和到期时间上完全一致，证明 `learning_steps` 没有在项目状态保存或恢复时丢失。

升级约束：

1. `package.json` 精确锁定 `5.4.1`；
2. 升级依赖必须视为数据迁移任务，不允许只修改版本号；
3. 升级前使用固定参数、固定时间、固定历史做旧版与新版对照测试；
4. 旧参数快照必须经过显式迁移或继续由兼容版本读取；
5. 不允许用新版本默认参数静默替换已有用户的参数快照；
6. `ts-fsrs` 自带的 17/19/21 权重迁移能力可以作为实现工具，但项目必须自行决定何时迁移并记录新的 schema 和库版本。

## 九、最小实现范围

P1-2 实现只包含：

- 在 `package.json` 和 `pnpm-lock.yaml` 中精确加入 `ts-fsrs@5.4.1`；
- 新增项目自有 `FsrsSchedulingState` 和参数快照类型；
- 新增唯一评分映射和 `Timestamp`/`Date` 转换纯函数；
- 新增固定参数生成入口；
- 使用真实 `ts-fsrs` 做一次固定时间的新词调度验证；
- 验证三档映射、时间无损往返、算法状态 JSON 往返及默认参数快照；
- 更新任务状态和交接文档。

本阶段不包含：

- `localStorage`、迁移链和损坏恢复；
- 完整调度 Service；
- Store、Composable、页面或组件；
- 参数优化器和复习历史训练；
- `Easy` 产品评分；
- 真实词库、TTS、PWA 或 UI 改动。

## 十、验收标准

P1-2 只有在以下条件全部满足后才能标记为完成：

1. `ts-fsrs@5.4.1` 被精确锁定，未安装 optimizer；
2. 三档映射只有一个实现来源，测试逐项覆盖；
3. 时间转换逐项拒绝 `8_640_000_000_000_001`、`NaN`、`Infinity`、小数、负数和 `null`，`Date -> Timestamp` 额外拒绝 `Invalid Date`；`0`、`8_640_000_000_000_000` 与固定毫秒值均通过 `Timestamp -> Date -> Timestamp` 无损测试；
4. 默认参数与本设计完全一致，`enable_fuzz` 为 `false`；
5. 项目自有算法状态经过原生 JSON 往返后值不变，恢复后继续 `next()` 与未序列化基线的状态、`learning_steps` 和到期时间一致；
6. 固定时间的新词使用 `Again`、`Hard`、`Good` 时，下一到期时间分别精确为 `+1m`、`+6m`、`+10m`；
7. 项目领域类型不 import 第三方 FSRS 类型；
8. `ReviewState` 与 `FsrsSchedulingState` 的序列化键集合无交集，不存在同一业务语义双写；
9. 状态转换测试穷尽验证 `New/Learning/Review/Relearning <-> new/learning/review/relearning`；
10. P1-3 交接约束明确区分 `schemaVersion` 与 `libraryVersion`；
11. `ts-fsrs` 声明的 Node.js 最低版本为 `>=20.0.0`，项目声明和实际验证环境均满足该要求；
12. `pnpm typecheck`、Lint、全部 Node 测试和生产构建通过；
13. 工程规范扫描通过；
14. 记录实际生产构建产物变化、修改文件、验证结果、关键决策和剩余升级风险；
15. 没有提前实现 P1-3、P1-4、P2 或页面功能。
