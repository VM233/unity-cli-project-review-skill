# Unity CLI Project Review

可安装的 Codex skill：通过官方 Unity CLI/Pipeline 操作项目、直接修复 CLI 故障并补齐任务所需能力、处理持久 Job，审查项目自有脚本与资源的目录组织，并验证 package 的正式采用。

安装到 Codex 的 skills 目录：

```text
git clone https://github.com/VM233/unity-cli-project-review-skill.git ~/.codex/skills/unity-cli-project-review
```

在新会话使用 `$unity-cli-project-review`，也支持按任务自动选择。已存在该目录时不要覆盖，先确认其归属与当前安装。

入口为 [SKILL.md](SKILL.md)。工具要求：官方 Unity CLI、项目已安装的 `com.unity.pipeline` 和提供所需 contract 的 VMUnityAutomation。目录内置默认策略与 shallow root 需要 VMUnityAutomation 0.6.285 或后续提供同契约的版本；执行参数始终查询当前 catalog。

CLI 故障与缺失能力的直接处理、正式回归和继续原任务见 [修复与补齐流程](references/cli-repair-and-extension.md)；既有用户授权和仓库权限边界保持有效。

默认检查 Assets 根层与存在的 Scripts、Editor、Resources、GameResources、Game Resources；外部插件保持原布局。skill 不携带项目文件、凭据、Editor 传输实现或文件搬运脚本。

需要 JavaScript 调用端时，使用 [显式生命周期的官方 CLI 客户端](scripts/unity-cli-client.mjs)
（Node.js 18+，无外部依赖）。用法与回归见 [CLI/Job 说明](references/cli-and-jobs.md)。
