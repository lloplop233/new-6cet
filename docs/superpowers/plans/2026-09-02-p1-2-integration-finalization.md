# P1-2 FSRS Integration & Documentation Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以最新 `main` 为唯一底稿，安全吸收已完成并通过独立 L3 Review 的 P1-2 FSRS 成果，统一当前状态文档，并形成经完整质量门禁验证的本地 checkpoint。

**Architecture:** 从包含独立治理 checkpoint 的最新 `main` 创建隔离 integration branch，只按原顺序 cherry-pick 6 个纯实现/测试 commit；不直接引入 feature branch 的旧项目级文档 commit。完成证据通过手工叠加进入最新 `main` 文档，最终使用 `--ff-only` 更新本地 `main`，不 push、不开始 P1-3。

**Tech Stack:** Git worktree、Vue 3、TypeScript、Node.js test runner、ESLint、Vite、pnpm、`ts-fsrs@5.4.1`。

**Spec:** `AGENTS.md`、`P1-2 FSRS实现策略.md`，以及 2026-09-02 本会话确认的 P1-2 Integration & Documentation Finalization 要求。

## Global Constraints

- 最新 `main` 的 V0 UI、产品语义和项目级文档是集成底稿，不得被 feature branch 的旧快照覆盖。
- P1-2 Implementation、Verification 和 Feature Branch Finalization 已完成，但原 branch 没有留下任何独立 Review 报告，早先记录的 `APPROVED`（0/0/3）无证据支撑。Independent L3 Review 由本轮补做（见 Task 2A）；只按 Review 结论做最小修复，不重新设计已冻结的契约。
- 不实现 P1-3、Store、Session、正式 FSRS Service/页面接线、持久化、真实词库、TTS 或新 UI。
- `AGENTS.md` 的 8 行长期规则必须位于独立治理 commit，不混入 P1-2 commit。
- 不直接 cherry-pick `986f1f4`；只从中提取与当前代码和验证一致的完成证据。
- 自动生成的 `src/types/*.d.ts` 不得手工编辑或进入最终 diff。
- 最终状态必须通过完整 `pnpm check`、工程规范扫描、`git diff --check` 和范围审计。
- 不 push；不强制删除原 `codex/p1-fsrs-strategy` branch 或 worktree。

---

### Task 1: 建立治理与隔离基线

**Files:**
- Modify: `AGENTS.md`
- Create: `.worktrees/p1-2-integration-finalization/`

**Interfaces:**
- Consumes: `main@0fc6a24` 与既存的 8 行 `AGENTS.md` 改动。
- Produces: 独立治理 commit `d6ecb58` 和干净的 `codex/p1-2-integration-finalization` worktree。

- [x] **Step 1: 审查 `AGENTS.md` 差异并运行 `git diff --check`**

  结果：只包含 8 行“项目级文档真相源与 Feature Branch 生命周期”规则；检查通过。

- [x] **Step 2: 独立提交治理规则**

  ```powershell
  git add -- AGENTS.md
  git commit -m "docs: define feature document lifecycle"
  ```

  结果：`d6ecb58 docs: define feature document lifecycle`。

- [x] **Step 3: 创建隔离 integration worktree**

  ```powershell
  git worktree add ".worktrees/p1-2-integration-finalization" -b "codex/p1-2-integration-finalization" main
  ```

- [x] **Step 4: 安装锁定依赖并验证最新 `main` 基线**

  ```powershell
  pnpm install --frozen-lockfile
  pnpm check
  ```

  结果：基线 `pnpm check` 退出码 `0`，8/8 tests、TypeScript、ESLint 和 production build 通过；3 个 `.d.ts` 只有换行副作用并已精确恢复。

---

### Task 2: 选择性吸收 P1-2 实现与测试历史

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/constants/fsrs.ts`
- Create: `src/types/fsrs.ts`
- Create: `src/utils/fsrs.ts`
- Create: `src/utils/fsrs.test.ts`

**Interfaces:**
- Consumes: `codex/p1-fsrs-strategy` 的 6 个已验证实现/测试 commit。
- Produces: 位于最新 V0 `main` 之上的同等 P1-2 代码、测试和依赖边界。

- [x] **Step 1: 按原顺序 cherry-pick 6 个纯实现/测试 commit**

  ```powershell
  git cherry-pick 575062f 631afe1 6eee643 1091764 a4cdd75 e6032e3
  ```

- [x] **Step 2: 更新 integration worktree 的依赖链接**

  ```powershell
  pnpm install --frozen-lockfile
  ```

- [x] **Step 3: 核对实现范围和原 branch 的最终 blob**

  ```powershell
  git diff --name-status d6ecb58..HEAD
  git diff --exit-code codex/p1-fsrs-strategy -- package.json pnpm-lock.yaml src/constants/fsrs.ts src/types/fsrs.ts src/utils/fsrs.ts src/utils/fsrs.test.ts
  ```

  Expected：只出现上述 6 个实现文件；与原 feature branch 的对应文件无差异。

---

### Task 2A: 补做独立 L3 Review 并修复 Important（2026-09-03 追加）

**Files:**
- Modify: `src/types/fsrs.ts`
- Modify: `src/utils/fsrs.ts`
- Modify: `src/utils/fsrs.test.ts`

**Interfaces:**
- Consumes: Task 2 的集成树。
- Produces: 真实的 Review 结论、6 项 Important 的修复 commit `c8dd7e3`，以及证明修复具备检测能力的反证证据。

**背景：** 用户确认原 branch 从未执行独立 L3 Review，工作区文档中的 `APPROVED`（Critical 0、Important 0、Minor 3）无证据支撑。P1-2 为 L3，Review Budget 要求 1 次独立 Review，因此本轮先补做。

- [x] **Step 1: 由独立 Reviewer 审查 6 文件 / 317 行**

  结论 `APPROVED WITH CONDITIONS`，Critical 0、Important 6、Minor 8。Reviewer 实跑 `pnpm test`、`pnpm typecheck`、`pnpm lint` 并逐项核对 `ts-fsrs@5.4.1` 库源码；未跑 production build。

  6 项 Important：① JSON 恢复测试用 `again` 作首轮评分，`learning_steps` 停在 0，而库内部把 0 与字段缺失视为等价，该测试无法检测它唯一声称保护的丢失场景；② `stability` / `difficulty` 的 JSON 往返不变性无断言；③ golden test 用裸 `fsrs()` 读库默认参数，从未触碰项目冻结参数，且 `FsrsParametersSnapshot` 类型无法回喂给库；④ 21 个权重只锁长度不锁值；⑤ `timestampToDate(value: unknown)` 抹掉编译期保护，与 `dateToTimestamp(value: Date)` 口径不一致；⑥ `FSRS_LIBRARY_VERSION` 与实际安装依赖无绑定测试。

- [x] **Step 2: 按 Review 结论做最小修复**

  `src/types/fsrs.ts` 新增 `FsrsStepUnit` 并收窄两个步骤字段（保持零第三方依赖）；`src/utils/fsrs.ts` 新增 `toFsrsParameters()` 使快照可回喂，`timestampToDate` 签名收窄为 `Timestamp`；`src/utils/fsrs.test.ts` 冻结 21 个权重值、新增版本绑定与快照回喂用例、golden test 改用项目参数、JSON 恢复测试首轮改 `good` 并加 `deepStrictEqual` 严格往返与精确键集合断言，删除永真的 `includes('Date')`。

  结果：`c8dd7e3 fix(fsrs): enforce frozen parameter and timestamp contracts`，3 文件 +114/-14，测试 19/19 → 22/22。

- [x] **Step 3: 反证每项修复确实具备检测能力**

  逐项注入目标失败模式后确认对应测试变红，随后还原：

  | 注入的失败模式 | 变红的测试 |
  |---|---|
  | 恢复时删掉 `learningSteps` 字段 | JSON state recovery |
  | 序列化环节把 `stability` 篡改为 `999.5` | JSON state recovery |
  | 单个权重 `0.212` → `0.213` | parameter snapshot |
  | 项目 `learningSteps` 改为 `['5m','30m']` | parameter snapshot + golden behavior |
  | `FSRS_LIBRARY_VERSION` 改为 `'5.5.0'` | library metadata binding |
  | `timestampToDate` 签名放宽回 `unknown` | `pnpm typecheck` 报 TS2578 |

  还原后 22/22 通过，`git status` 与注入前一致。

- [x] **Step 4: 处置 Minor**

  8 项 Minor 中 2 项随本次修复解决（永真 `Date` 断言、文档与 Review 结论冲突）；`learningSteps` 一名两义经用户决定保留现状；其余 5 项记入 `交接文档.md` 已知风险，留待 P1-3/P4-1 接线前评估。

---

### Task 3: 以最新 `main` 为底稿完成状态文档收口

**Files:**
- Modify: `项目实施计划.md`
- Modify: `交接文档.md`
- Modify: `P1交接文档.md`
- Modify: `P1-2 FSRS实现策略.md`
- Modify: `P1-2 FSRS实施计划.md`
- Modify: `P1-2任务交接文档.md`
- Create: `docs/superpowers/plans/2026-09-02-p1-2-integration-finalization.md`

**Interfaces:**
- Consumes: 最新 `main` 的 V0 产品/路线图语义、原 P1-2 branch 的完成证据、最终 integration branch 的 Git 事实。
- Produces: 统一表达 P1-2 已实现、已验证、Review Approved、已进入最新 `main` 的当前项目文档；P1-3 仍为未开始。

- [x] **Step 1: 更新 `项目实施计划.md`**

  将 P1-2 标记为 `[x]`，记录最终集成验证和 checkpoint 口径；保持 P1-3 为 `[ ]`，当前推荐起点改为 P1-3 但不得在本轮启动。

  结果：P1-2 状态改为 `[x]`，完成证据改为「原 branch 无 Review 报告 + 本轮补做 Review 结论 0/6/8」，集成证据补入 `c8dd7e3` 和 22/22；P1-3 仍为 `[ ]` 并新增开始前提；§十三 推荐起点改为 P1-3。

- [x] **Step 2: 更新唯一当前状态入口 `交接文档.md`**

  以 V0 `main` 内容为底稿，加入 P1-2 已集成的 commit、文件、验证、Review 和限制；移除“等待集成”的当前态表述。

  结果：§2.B 改为「`main`：P1-2 FSRS 策略已集成」，新增独立 Review 小节记录真实结论与 6 个反证实验；作废无据的 `APPROVED`（0/0/3）；验证口径更新为 2026-09-03、22/22、Vite `8.2.0`、产物不含 `ts-fsrs`；§5 用真实的 Minor 处置替换原「3 项 Minor」表述。

- [x] **Step 3: 更新 P1 阶段与 P1-2 专项文档**

  在 `P1交接文档.md`、`P1-2 FSRS实现策略.md` 中把“尚未集成”改为最终集成事实；在 `P1-2 FSRS实施计划.md` 顶部增加历史计划说明和 Completion/Verification/Integration 状态，不机械勾选历史步骤。

  结果：`P1-2 FSRS实现策略.md` 的状态行、`P1-2 FSRS实施计划.md` 的顶部声明各改 1 行，均改为历史定位并指向 `交接文档.md`；历史复选框未机械勾选。`P1交接文档.md` 顶部已有「历史 checkpoint」声明且无过期集成表述，按手术式改变原则不改动。

- [x] **Step 4: 消除旧任务交接的当前态歧义**

  在 `P1-2任务交接文档.md` 顶部明确它是 P1-2 启动前的历史快照，当前事实只看 `交接文档.md`。

  结果：该文件顶部已有「历史快照，禁止作为当前启动指令」声明，已满足要求，不改动。

- [x] **Step 5: 扫描当前文档中的陈旧状态和占位符**

  ```powershell
  rg -n "P1-2.*\[~\]|Task 6.*尚未完成|尚待用户.*集成|等待集成|Integration into latest `main`：Pending" 项目实施计划.md 交接文档.md P1交接文档.md "P1-2 FSRS实现策略.md" "P1-2 FSRS实施计划.md"
  $markers = @('T' + 'BD', 'TO' + 'DO', '【这里' + '写一个任务】')
  $planText = Get-Content -LiteralPath 'docs/superpowers/plans/2026-09-02-p1-2-integration-finalization.md' -Raw
  if ($markers | Where-Object { $planText.Contains($_) }) { exit 1 }
  ```

  Expected：两次扫描均无输出。

  结果：以 bash / `rg` 等价实现执行，陈旧状态扫描（含 `[~]`、`Task 6 尚未完成`、`等待集成`、`待 Task 6`、`尚未集成`）与占位符扫描均无输出，退出码 `1`。

---

### Task 4: 验证最终 integration tree 和手术式范围

**Files:**
- Test: `src/types/domain.test.ts`
- Test: `src/utils/round.test.mjs`
- Test: `src/utils/fsrs.test.ts`

**Interfaces:**
- Consumes: Task 2 的实现和 Task 3 的文档收口。
- Produces: 可支持本地集成 checkpoint 的完整验证证据。

- [x] **Step 1: 运行完整质量门禁**

  ```powershell
  pnpm check
  ```

  Expected：TypeScript、ESLint、全部 Node tests 和 production build 退出码均为 `0`。

  结果：退出码 `0`。TypeScript 0 error、ESLint 0 problem、22/22 Node tests、Vite `8.2.0` production build 成功，PWA precache 48 entries。产物中不含 `ts-fsrs` chunk，直接证实 FSRS 模块未接线进应用 bundle。

- [x] **Step 2: 清理并证明自动生成文件没有语义变化**

  若 `src/types/*.d.ts` 只产生换行副作用，先运行 `git diff --ignore-space-at-eol --exit-code` 证明，再精确 `git restore --worktree`；若存在语义差异则停止。

  结果：`git diff --ignore-space-at-eol --exit-code -- src/types/auto-imports.d.ts src/types/components.d.ts src/types/route-map.d.ts` 退出码 `0`，`--numstat` 无输出，确认仅行尾换行副作用；已对这三个文件精确 `git restore --worktree`，未手工编辑。

- [x] **Step 3: 运行工程规范扫描**

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

  结果：以 bash / `rg` 等价实现执行，五项扫描全部无输出，`src/api` 不存在。另外确认本次只触及 `src/constants/`、`src/types/`、`src/utils/`，均为 `main` 上已存在的目录，无新增顶层目录。

- [x] **Step 4: 验证 V0 UI 和范围未变化**

  ```powershell
  git diff --exit-code d6ecb58 -- src/App.vue src/main.ts src/components src/pages src/router src/styles src/constants/index.ts src/constants/mock-words.ts src/stores
  git diff --name-only d6ecb58 -- src/services src/composables src/pages src/components src/stores
  git diff --check d6ecb58
  git status --short
  ```

  Expected：前两条范围命令无输出；`git diff --check` 通过；状态只包含计划内文档和 P1-2 实现。

  结果：V0 范围命令退出码 `0`、无输出；Service/Composable/页面/Store 无任何文件变化；`git diff --check` 通过。全仓库检索确认引用 FSRS 模块的文件只有它自身的 4 个文件，零接线。相对 `d6ecb58` 的实现改动为 `package.json`、`pnpm-lock.yaml` 和 4 个 FSRS 文件，共 417 行新增。

- [x] **Step 5: 审阅最终 diff 并提交文档 checkpoint**

  ```powershell
  git diff --stat d6ecb58
  git diff d6ecb58 -- 项目实施计划.md 交接文档.md P1交接文档.md "P1-2 FSRS实现策略.md" "P1-2 FSRS实施计划.md" P1-2任务交接文档.md docs/superpowers/plans/2026-09-02-p1-2-integration-finalization.md
  git add -- 项目实施计划.md 交接文档.md P1交接文档.md "P1-2 FSRS实现策略.md" "P1-2 FSRS实施计划.md" P1-2任务交接文档.md docs/superpowers/plans/2026-09-02-p1-2-integration-finalization.md
  git diff --cached --check
  git commit -m "docs: finalize P1-2 integration"
  ```

  结果：`d5ba6e2 docs: finalize P1-2 integration`，5 文件 +341/-21。实际改动的文档为 `项目实施计划.md`、`交接文档.md`、`P1-2 FSRS实现策略.md`、`P1-2 FSRS实施计划.md` 和本 plan；`P1交接文档.md` 与 `P1-2任务交接文档.md` 已有历史声明，未改动。`git diff --cached --check` 通过。

---

### Task 5: 以 fast-forward 完成本地 `main` 集成并复验

**Files:**
- Modify: local branch reference `main`

**Interfaces:**
- Consumes: 已提交且完整验证的 `codex/p1-2-integration-finalization`。
- Produces: 包含治理规则、V0 UI 和 P1-2 成果的本地 `main` checkpoint。

- [x] **Step 1: 确认 integration branch 干净且可 fast-forward**

  ```powershell
  git status --short --branch
  git merge-base --is-ancestor main codex/p1-2-integration-finalization
  ```

  结果：integration branch 工作区干净；`--is-ancestor` 退出码 `0`，确认可 fast-forward。

- [x] **Step 2: 更新本地 `main`**

  ```powershell
  git -C "D:\工作\ddff" merge --ff-only codex/p1-2-integration-finalization
  ```

  结果：fast-forward 成功，`main` 从 `d6ecb58` 前进到 `d5ba6e2`，引入 8 个 commit、11 文件 +758/-21。

- [x] **Step 3: 在最终 `main` 上复跑完整门禁和 Git 检查**

  ```powershell
  pnpm install --frozen-lockfile
  pnpm check
  git diff --check HEAD^
  git status --short --branch
  git log --oneline --decorate -10
  ```

  Expected：完整门禁退出码 `0`；除 `main` 相对 `origin/main` 的本地领先外工作区干净；不执行 push。

  结果：`pnpm install --frozen-lockfile` 通过供应链策略校验并装入 `ts-fsrs 5.4.1`；`pnpm check` 退出码 `0`，22/22 tests 与 production build 通过；`git diff --check HEAD^` 通过；本次 build 未产生 `.d.ts` 变化，工作区除未跟踪的 `.pnpm-store/` 外干净；`main` 领先 `origin/main` 9 个 commit，**未执行 push**。

  遗留的两项非阻断构建警告（`.env` 的 `NODE_ENV`、PostCSS `from`）与 P1-2 无关，已记入 `交接文档.md`。
