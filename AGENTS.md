# AGENTS.md — 六级词汇背记工具

移动端 H5 网页词汇背记工具（CET-6），手机浏览器用、不打包 App、无后端、单人使用。
本文件只记录长期、稳定、不可违逆的规则；**当前状态和下一步只看 `交接文档.md`**。

## 新会话恢复与事实来源

1. 新会话先读 `AGENTS.md` 和 `交接文档.md`，再运行 `git status --short --branch`、`git status --porcelain -uall`、`git diff --stat`、`git diff` 和 `git diff --cached`；存在或提到 worktree 时再运行 `git worktree list`。
2. 先确认本窗口唯一的 coherent deliverable、Scope 和 Non-goals，再读取 `交接文档.md` 链接的当前任务小节、spec、plan、相关代码和测试；不要默认扫描整个仓库或阅读完整 Git 历史。
3. 实际仓库状态以 Code + Git 为准，行为是否成立以 Tests / Build / Browser 为准，预期行为以用户已确认的 Project Docs / Specs 为准。文档与这些事实冲突时必须指出并先解决冲突，不能猜测。
4. 历史聊天、context compaction 摘要和 Codex 对旧对话的记忆不是事实来源。只有信息不足或发生冲突时才扩大调查范围。

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
