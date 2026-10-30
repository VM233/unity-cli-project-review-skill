---
name: unity-cli-project-review
description: "Operate Unity through official CLI/Pipeline, repair CLI faults, add missing CLI capabilities, manage durable jobs and package adoption, and review owned script/resource folders. Apply to Unity automation and CLI failures or capability gaps; excludes gameplay design and reorganizing third-party plugins. 官方 Unity CLI 故障修复、能力补齐与项目审查。"
---

# Unity CLI 与项目审查

通过官方 Unity CLI 操作正确的 Unity 项目，取得可读回的完成证据，并审查项目自有脚本与资源的分类。此 skill 提供操作流程；用户请求和仓库规则决定权限，当前工具 schema 决定参数及结果契约。

## CLI 故障立即修复，缺失能力直接补齐

- 已授权任务遇到 CLI 调用、连接、绑定、catalog/schema、错误映射、持久 Job 或调用端问题时，立即归因并修复；所需 CLI 功能缺失时，直接在权威 owner 补齐正式能力，再继续原任务。不要询问用户“要不要修 CLI”“要不要补命令”或“是否改用手工操作”，不要把问题登记、建议或临时绕行当作完成。
- 先核对当前 help、catalog、请求、revision 和原生错误，区分调用误用、暂时未就绪、真实缺陷与能力缺口。修正误用的调用方，保留暂时中断的原 Job；确认缺陷或缺口后修对应 producer/contract，不把正常业务拒绝当成 CLI Bug，也不盲目重发变更请求。
- 读取 [CLI 修复与能力补齐](references/cli-repair-and-extension.md)，闭合实现、注册、typed schema、错误与生命周期、受影响 consumer、聚焦回归和文档；按当前请求及适用规则已授权的范围完成发布、接入和正式请求重跑，不为这些技术处理再次提问。
- 只有无法自行取得的必要源码、凭据、上游写权限、不可替代环境或未授权的破坏性/产品选择才是阻点。先完成仍可执行的归因和修复，准确说明具体缺口；不能用工具报错或“功能不存在”本身作为交回用户的理由。

## 先确定入口与所有权

- 读取仓库 `AGENTS.md` 及本次命中的安全、代码、资源和 package 规则。确认真正含 `Assets`、`Packages`、`ProjectSettings` 的 Unity 根目录，不能用 monorepo 根或窗口标题代替。
- 以规范化绝对路径绑定每次调用。先用官方 `unity status --project-path <absolute-project>` 确认当前实例；没有可用 Editor 时按项目已有启动规则处理，不擅自打开额外窗口。
- 官方 Unity CLI 与 `com.unity.pipeline` 是唯一传输。通用 Automation、framework 领域工具和项目编排分别回到各自 owner；不能用直接 socket/HTTP、鼠标菜单、通用 execute-code 或临时项目脚本补缺失能力。
- 同一任务已经授权的实现和必要验证直接完成；发布、全局偏好、第三方仓库和其他项目仍按实际授权处理，本 skill 不额外授权。

## 选择本次流程

- **调用、发现或连接**：读 [CLI 调用与 Job](references/cli-and-jobs.md)。按需查少量候选，再读取一个精确 contract；重复调用复用官方 NDJSON shell。故障或能力缺失同时执行上面的直接修复要求。
- 需要 JavaScript 调用端时复用 [官方 CLI 客户端](scripts/unity-cli-client.mjs)，显式创建和关闭实例。连接退役后显式 reconnect 保留客户端身份及已有回调，或创建新实例并同步全部调用者；不得靠改变 import URL 参数重启。保留原生 polling 元数据，重连后只续查原任务，不重发不确定的变更；区分传输、领域与作业终态。
- Windows 大参数使用该客户端的 `automationFromFile` 与正式 `arguments_file`；调用方持有项目 Temp 中的 UTF-8 JSON，收到响应后清理，不确定结果时保留核对，不能把长 JSON 继续塞进子进程 argv。
- **新增/调整脚本、资源或目录**：读 [目录分类与审查](references/folder-organization.md)。默认盘点 Assets 根层，并递归审查 Scripts、Editor、Resources、GameResources、Game Resources 中存在的范围。外部插件、package 和供应商资源保持原布局。
- **代码、package 或工具变更后的验收**：读 [验证与采用](references/validation-and-adoption.md)。复用正式审查 owner，按风险执行编译、聚焦回归和消费端采用；不能把传输成功当作业务成功。

目录审查须在日常任务收尾执行，也应由已有项目内容验证入口组合通用 owner，不能复制另一个扫描器或只在有人主动提醒时检查。检查超限意味着要判断职责和内容是否混杂，不授权自动搬动文件，也不要求把同类目录机械拆成数字分箱。

## 缺陷与收尾

保持既有用户改动，不编辑 PackageCache，不顺带升级未授权的消费项目。修复或补齐后必须恢复原任务，用正式 CLI 证明原失败请求或原缺失能力已经可用；改代码、单元测试或登记问题均不能单独证明闭环。

交付说明实际改变、已采用 revision、完成的检查及剩余问题。区分静态、编译、正式 CLI 调用与运行画面证据。目录报告需列出真正扫描的范围、配置来源、超限计数及分类依据；未完成、被截断或尚未检查的部分不能报为通过。
