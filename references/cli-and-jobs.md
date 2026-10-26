# CLI 调用与持久 Job

## 绑定与参数

先从本机安装、项目文档和官方 `--help` 确认 `unity` 可执行文件及当前语法，不猜端口或进程名。官方子命令前后的参数分层不同：

```text
unity --json status --project-path <absolute-project>
unity --json command --project-path <absolute-project> <registered-command> -- <command-options>
```

`--project-path` 属于声明它的子命令，不是 `unity` 的全局 option。命令参数只用当前 help/schema 的拼写，不能从 C# 字段名推断。所有变更命令按 contract 提交精确的 expected project path；dangerous contract 的确认参数也必须显式提供。

可用 `UNITY_NO_CONSENT_PROMPT=1` 避免非交互流程卡住，但不能替用户选择 analytics opt-in/opt-out。项目名、basename、窗口标题和最近连接只供显示，不能代替绝对路径绑定。路径正确仍选错实例时修绑定 owner。

## 渐进发现

1. 官方 CLI 小范围 query/tag/limit 找入口；不列完整命令表。
2. `vm_catalog_list` 使用一个小页和具体 query；继续分页只为补齐本次候选。
3. 对要执行的一个精确名称调用 `vm_catalog_get`，读取 input/output schema、preconditions、effects、error codes、owner 和 completion evidence。
4. 通过当前正式 executor 调用；验证 envelope 与内部 domain 结果两层。合法基础设施入口以当前 CLI 为准，不用固定数量或旧命令白名单限制它。

以下只示意参数分层；执行前以当前 contract 核对：

```text
unity --json command --project-path <absolute-project> vm_catalog_list -- --query folder-organization --limit 4 --offset 0
unity --json command --project-path <absolute-project> vm_catalog_get -- --name <exact-name>
unity --json command --project-path <absolute-project> vm_automation_call -- --command <exact-name> --arguments_json <json> --expected_project_path <absolute-project>
```

用进程参数数组或正确的 shell 引号传 JSON，不能把 `JSON.stringify` 当成 shell escaping。重复调用复用一个官方 shell：

```text
unity --non-interactive --no-banner shell --protocol ndjson
```

按当前协议发送每行一个带相关 ID 的 argv 请求并逐行解析响应；例如：

```json
{"id":"1","argv":["status","--project-path","<absolute-project>"]}
```

不要为每个小调用重启 CLI，也不通过自建 server/adapter 获得另一套传输。

## 持久任务

- 保留提交响应的完整 `polling.command` / `polling.arguments`，不要只返回内层 `result` 丢弃它。该原生调用映射是首选轮询入口；当前 `vm_job_status` 在主线程被构建/导入阻塞时仍能读取快照，不能换成需要主线程的 facade 查询然后把阻塞当成 Job 失败。
- 长操作取得 `jobId`、类型、poll route 和 capability 后，先把 capability 存在项目私有临时检查点中，不放进 Git 或公开报告。
- 某些任务首次 authorized poll 才从 queued 获准运行；取得 receipt 后立即按当前 contract 轮询原任务。
- reload、连接暂时中断、日志停止或 CLI 超时都不等于 Job 失败。恢复当前官方连接后继续原 ID/capability；不能创建替代任务或换传输。
- 以 terminal status 和任务自己的 completion evidence 为准。失败、取消、中断分别报告；不靠固定 sleep、进程存活或日志尾部推断完成。
- 取消和清理使用同一个 owner 公布的正式 route。临时资源在成功、失败、取消、reload 和退出时成对闭合，验证 finally 后读回无残留。

Editor 与 Runtime catalog 分离。RuntimeOnly 由运行时 Pipeline/service 提供，不能借运行时命令绕过 Editor 写入边界。Game View 查询、选择已有尺寸、临时尺寸会话与永久偏好维护也必须使用各自 contract；普通验证复用已有窗口，不建立永久验证预设。

## 可复用 JavaScript 调用端

[unity-cli-client.mjs](../scripts/unity-cli-client.mjs) 使用 Node.js 18+ 标准库，
只启动官方 shell，不增加 Editor server、HTTP bridge 或新传输：

```javascript
import { createUnityCliClient, redactCapabilities } from './scripts/unity-cli-client.mjs';

const client = createUnityCliClient({ executablePath: officialUnityCliPath, projectPath: absoluteProject });
try {
  // exactContractName / commandArguments 已通过当前 catalog 核对。
  const receipt = await client.automation(exactContractName, commandArguments);
  await savePrivateReceipt(receipt);
  const snapshot = await client.poll(receipt.polling);
  // 按该 Job contract 判定 queued/running/terminal；公开记录先脱敏。
  await savePublicEvidence(redactCapabilities(snapshot));
} finally {
  client.close();
}
```

实例拥有自己的进程、请求和关闭状态。JS 宿主可能按文件路径缓存模块，不能假设
不同 query-string 代表新模块；关闭后必须显式创建新实例。关闭、进程退出、
管道错误、协议异常和请求期限会明确拒绝待决调用，不自动重发请求，也不取消已
提交到 Unity 的持久 Job。默认响应期限为 15 秒，可按正式调用需求显式传
`timeoutMs`（至多 60 秒）；长操作应提交 Job 并用原生轮询，不用扩大期限掩盖错误
入口。宿主重置后，从私有 receipt 恢复。

响应以字节分帧后解码 UTF-8，保留跨 chunk 的中文字符；异常 ID、截断和超量响应
不能被静默丢弃。边界与成本见 [client-cost-ledger.md](client-cost-ledger.md)，
回归执行 `node --test scripts/unity-cli-client.test.mjs`。

## 发现能力缺陷

保留精确请求、绑定路径、revision、错误 envelope 和原 Job 检查点。区分调用误用、连接问题与 owner 缺陷。只读源码/日志可用于归因，不能代替正式接口验收。修复应同步 typed schema、描述、producer、错误契约、测试和消费链；不在 facade 或项目层重复补偿。旧传输迁移须逐 route 决定合并、正式注册或删除，并证明旧 consumer/config/process 已退役。
