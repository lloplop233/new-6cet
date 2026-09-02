# AGENTS.md — 六级词汇背记工具

移动端 H5 网页词汇背记工具（CET-6），手机浏览器用、不打包 App、无后端、单人使用。
本文件只记录长期、稳定、不可违逆的规则；**当前状态和下一步只看 `交接文档.md`**。

## 新会话恢复与事实来源

1. 新会话先读 `AGENTS.md` 和 `交接文档.md`，再运行 `git status --short --branch`、`git status --porcelain -uall`、`git diff --stat`、`git diff` 和 `git diff --cached`；存在或提到 worktree 时再运行 `git worktree list`。
2. 先确认本窗口唯一的 coherent deliverable、Scope 和 Non-goals，再读取 `交接文档.md` 链接的当前任务小节、spec、plan、相关代码和测试；不要默认扫描整个仓库或阅读完整 Git 历史。
3. 实际仓库状态以 Code + Git 为准，行为是否成立以 Tests / Build / Browser 为准，预期行为以用户已确认的 Project Docs / Specs 为准。文档与这些事实冲突时必须指出并先解决冲突，不能猜测。
4. 历史聊天、context compaction 摘要和 Codex 对旧对话的记忆不是事实来源。只有信息不足或发生冲突时才扩大调查范围。

## 项目级文档真相源与 Feature Branch 生命周期

- `main` 最新提交中的 Code、Git 状态和项目级当前状态文档，是当前项目事实的唯一来源。项目级文档包括 `AGENTS.md`、`交接文档.md`、`项目实施计划.md`、仍承担当前状态职责的阶段总交接，以及当前产品、UI、Roadmap、架构和工程规则文档。Feature branch 中这些文档只代表该 branch 最后一次与 `main` 对齐时的快照，不得在后续任务中直接视为当前项目事实。
- 启动新任务、恢复长期 Feature branch 或进行 finalization 前，必须先核对最新 `main` 的 commit、工作区、项目级状态文档、当前 UI / 产品语义、Roadmap 和阶段完成情况，再读取本任务的专项设计、实施计划、ADR、Review、测试证据和 branch 历史。两类事实发生差异时，当前产品、UI、Roadmap 和阶段状态以 `main` 为准；本 Feature 已确认且未被后续实现改变的专项技术契约，以该 Feature 的历史记录为准。
- 集成 Feature branch 时，项目级文档必须以最新 `main` 为底稿，只重新叠加本 Feature 真正新增或修改的状态、决策和验证证据。禁止直接用 Feature branch 的旧项目文档覆盖 `main`；Git merge 无文本 conflict 不等于文档语义未过期，仍须检查 UI、产品语义、Roadmap、阶段状态、checkpoint 和架构决策。
- 任务专项设计、实施计划、ADR、Review 报告、冻结契约、测试证据和完成记录属于历史性 / 专项性文档。只要对应实现和契约没有变化，不要求因后续 UI、视觉、页面结构或 Roadmap 演进而持续同步；其中关于“当前 branch”“当前状态”“下一步”的文字只解释该历史 checkpoint，不得提升为项目当前事实。
- Feature branch 的正常生命周期是创建、实现、测试、Review、finalization、集成并结束。已经完成且通过所需 Review 的 branch 应优先 merge 或通过 PR 集成，不长期承担跟踪整个项目最新 UI、产品状态和 Roadmap 的职责。

## 任务分层、模型与 Agent 协作

- 按任务本身快速判断 L0-L3；Workflow、Review Budget 和 Checkpoint 只由风险等级决定。复杂任务、并行、Review 或失败升级时再定向阅读 `模型与Agent协作指南.md`。
- 具体开发顺序、任务状态、依赖和验收标准以 `交接文档.md` 指向的 `项目实施计划.md` 相关小节为准，不从聊天记录猜测当前阶段。
- 模型在 Workflow 确定后按“最低充分能力”运行时选择；项目规则不固定厂商、型号、版本，也不因模型身份追加 Review。
- 领域模型、FSRS、存储协议、数据迁移、双模式状态机、PWA 更新或全局 UI 等高风险工作通常属于 L3，必须使用能够可靠处理复杂状态和跨模块影响的模型。
- 当前模型无法理解任务、连续出现两次实质性失败、验证持续失败、范围扩大或接口需要变化时，重新判断风险并升级执行模型；成功且验收通过后停止。
- Review Budget 固定为：L0 为 0；L1 默认 0；L2 每个 Feature/Batch 默认 1 次；L3 为 1 次独立 Review，实质性修复后最多 1 次条件复审。
- 一个 Codex 窗口优先对应一个可独立验收的 coherent deliverable。同一任务或 Bug 未完成时继续当前窗口；任务/阶段完成、领域切换、独立 Review、目标变化、重复调查或多次 compaction 后状态漂移时，先 checkpoint 再考虑新窗口。
- Checkpoint 只在任务/阶段完成、重要决策改变、切换窗口或下一任务改变领域时更新 `交接文档.md`；记录当前 branch/worktree、Scope、Non-goals、已验证结果、关键决策、剩余风险和下一步，不记录聊天历史或每次尝试。

## 不可违逆的约束

1. **UI 库只有 Vant 4 一个**，禁止混入任何第二个 UI 库。
2. **设计系统已定稿，不要改**（详见 `设计系统.md`）：主色青墨 `#0E8C7F`；「认识」档**就用品牌色，不另设绿色**；单词本体用**衬线**；**不加进度环**，签名元素只用横线段队列条。
3. **所有 Vant 外观改动只许走主题配置（CSS 变量）**：
   - 禁止写 `.van-*` 类选择器覆盖样式。
   - 禁止用 `theme-vars` 做覆盖（`scope="local"` 局部不传播，不生效）。
   - 覆盖 Vant 变量必须写在 `src/styles/var.less`，用 `:root:root` 提高特异性。
   - 具体数值只许出现在 `src/styles/tokens.less`，其他文件只写 `var(--xxx)`。
4. **组件/页面里禁止字面样式值**：颜色、字号、圆角、间距一律用 token（`#0E8C7F`/`16px`/`border-radius: 12px` 即违规）。
5. **文件归位**（`工程规范.md`，目录树定死）：`pages/`、`components/{layout,ui,word}/`、`composables/`、`services/`、`stores/`、`utils/`、`types/`、`styles/`、`constants/`；**不许新增顶层目录**。本项目**没有 `src/api/`**（无后端），数据访问层叫 `src/services/`。
6. **组件复用**：第二次出现就封装（不是三次法则）。四条硬约束——① 无字面样式值；② 组件只写 `padding` 不写 `margin`；③ props > 6 说明抽错了；④ 抽完必须删掉原副本。
7. **类型文件名用 `.ts`**；`src/types/` 下自动生成的 `.d.ts` 文件**不要手改**。

## 关键坑

- **项目必须在 NTFS 盘**。现在在 `D:\工作\ddff`。别搬去 E 盘（E 是 exFAT，装依赖/删目录/改名都被锁）。旧项目 `E:\everlasting\项目\六级复习工具`（v1.0）不可修改。
- 停 vite 时 bash 包装停了，node 子进程可能还在占端口/锁目录，需 `taskkill //F //PID <pid>` 单独杀。

## 运行

```bash
cd "D:\工作\ddff"
pnpm install
pnpm dev        # 端口以终端实际输出为准
pnpm check      # 类型检查、Lint、测试和生产构建
```

- 本机和手机访问地址都以 `pnpm dev` 输出为准；`/tokens` 保留为设计 token 验收页。
