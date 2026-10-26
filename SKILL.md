---
name: unity-cli-project-review
description: "Use official Unity CLI/Pipeline for project-bound Editor commands, catalog discovery, durable jobs, package adoption and automated project review. Apply when Unity automation or script/resource folder organization is involved; excludes gameplay design and reorganizing third-party plugins. 官方 Unity CLI 与脚本、资源目录组织审查。"
---

# Unity CLI 与项目审查

通过官方 Unity CLI 操作正确的 Unity 项目，取得可读回的完成证据，并审查项目自有脚本与资源的分类。此 skill 提供操作流程；用户请求和仓库规则决定权限，当前工具 schema 决定参数及结果契约。

## 先确定入口与所有权

- 读取仓库 `AGENTS.md` 及本次命中的安全、代码、资源和 package 规则。确认真正含 `Assets`、`Packages`、`ProjectSettings` 的 Unity 根目录，不能用 monorepo 根或窗口标题代替。
- 以规范化绝对路径绑定每次调用。先用官方 `unity status --project-path <absolute-project>` 确认当前实例；没有可用 Editor 时按项目已有启动规则处理，不擅自打开额外窗口。
- 官方 Unity CLI 与 `com.unity.pipeline` 是唯一传输。通用 Automation、framework 领域工具和项目编排分别回到各自 owner；不能用直接 socket/HTTP、鼠标菜单、通用 execute-code 或临时项目脚本补缺失能力。
- 同一任务已经授权的实现和必要验证直接完成；发布、全局偏好、第三方仓库和其他项目仍按实际授权处理，本 skill 不额外授权。

## 选择本次流程

- **调用、发现或连接问题**：读 [CLI 调用与 Job](references/cli-and-jobs.md)。按需查少量候选，再读取一个精确 contract；重复调用复用官方 NDJSON shell。
- 需要 JavaScript 调用端时复用 [官方 CLI 客户端](scripts/unity-cli-client.mjs)，显式创建和关闭实例。模块导入不启动进程，不能用改变 import URL 参数来重启已关闭客户端；保留原生 polling 元数据并区分传输、领域与作业终态。
- **新增/调整脚本、资源或目录**：读 [目录分类与审查](references/folder-organization.md)。默认盘点 Assets 根层，并递归审查 Scripts、Editor、Resources、GameResources、Game Resources 中存在的范围。外部插件、package 和供应商资源保持原布局。
- **代码、package 或工具变更后的验收**：读 [验证与采用](references/validation-and-adoption.md)。复用正式审查 owner，按风险执行编译、聚焦回归和消费端采用；不能把传输成功当作业务成功。

目录审查须在日常任务收尾执行，也应由已有项目内容验证入口组合通用 owner，不能复制另一个扫描器或只在有人主动提醒时检查。检查超限意味着要判断职责和内容是否混杂，不授权自动搬动文件，也不要求把同类目录机械拆成数字分箱。

## 缺陷与收尾

发现绑定、schema、错误映射、Job、默认范围或输出不能表达真实结果时，定位权威 producer 并修复工具；不要加备用传输或静默默认值。保持既有用户改动，不编辑 PackageCache，不顺带升级未授权的消费项目。

交付说明实际改变、已采用 revision、完成的检查及剩余问题。区分静态、编译、正式 CLI 调用与运行画面证据。目录报告需列出真正扫描的范围、配置来源、超限计数及分类依据；未完成、被截断或尚未检查的部分不能报为通过。
