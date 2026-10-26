# Unity CLI Project Review

可安装的 Codex skill：通过官方 Unity CLI/Pipeline 操作项目、处理持久 Job，审查项目自有脚本与资源的目录组织，并验证 package 的正式采用。

安装到 Codex 的 skills 目录：

```text
git clone https://github.com/VM233/unity-cli-project-review-skill.git ~/.codex/skills/unity-cli-project-review
```

在新会话使用 `$unity-cli-project-review`，也支持按任务自动选择。已存在该目录时不要覆盖，先确认其归属与当前安装。

入口为 [SKILL.md](SKILL.md)。工具要求：官方 Unity CLI、项目已安装的 `com.unity.pipeline` 和提供所需 contract 的 VMUnityAutomation。目录内置默认策略与 shallow root 需要 VMUnityAutomation 0.6.285 或后续提供同契约的版本；执行参数始终查询当前 catalog。

默认检查 Assets 根层与存在的 Scripts、Editor、Resources、GameResources、Game Resources；外部插件保持原布局。skill 不携带项目文件、凭据、Editor 传输实现或文件搬运脚本。
