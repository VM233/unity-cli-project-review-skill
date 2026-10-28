# CLI 修复与能力补齐

已授权任务中的 CLI 技术故障和必要能力缺口直接处理，不询问是否修复、是否新增命令或是否改走手工。完成工具链修复后继续原任务；本文件不扩大第三方仓库、其他消费项目、真实用户数据或产品发布权限。

## 先确定失败边界

- 保留精确请求、绝对项目路径、CLI/package revision、原生错误 envelope、首个非法状态和原 Job receipt。公开证据脱敏 capability 字符串，不能删除同名的对象型 schema 定义。
- 从当前 help 和 bounded catalog 核实正式入口；调用误用修 caller，暂时未就绪按原 contract 恢复连接并继续同一个 Job。不得因传输中断重复提交、取消或替换尚未证明失败的任务。
- 正常业务拒绝、没有匹配数据和明确未满足的前置条件按其领域契约处理。命令未注册、schema/描述与实现矛盾、绑定错误、Job 假完成、状态或输出失真是工具缺陷；当前任务需要的行为在正式能力中确实不存在才是能力缺口。
- 用 remote、manifest/lock、实际解析路径与源码确认唯一 owner。没有写权限的第三方上游不能伪称可发布；可维护源码和现有契约都能自行发现时，不把技术方案选择交回用户。

## 修复或补齐权威能力

通用 Unity 行为、typed contract、schema、错误和资源生命周期归 `VMUnityAutomation`；实例发现、绑定、调用和通用 Job 基础设施归 `VMUnityPipeline`；VMFramework 领域能力归 `VMFramework-Pipeline`；项目工具只组合项目事实。官方 CLI 调用端问题在该调用端修复，不在消费项目重复补偿。

1. 沿原请求确定 producer、caller、状态和生命周期；审查同一机制的相关入口。优先扩展已有职责，只有真实不同的语义或生命周期才新增正式命令。
2. 同步实现、注册、typed input/output schema、description、稳定错误码、effects、preconditions、transaction 与完成证据。Dictionary 请求也须闭合 schema；不能仅写文档让调用者猜参数。
3. 长操作提供持久 Job、原生 polling/取消/清理入口和跨 reload 所需 capability。临时资源由同一 owner 覆盖成功、失败、取消、reload 和退出，不能靠更换任务名规避泄漏。
4. 同步实际 consumer、相关聚焦回归、公开文档与示例；删除同源 workaround、失效 route/schema/alias 和重复状态。不得使用鼠标/菜单、直接 HTTP/socket、退役 route、通用 execute-code、临时项目脚本、文件改写或 PackageCache 补丁替代正式能力。

## 正式回归与继续原任务

按 [验证与采用](validation-and-adoption.md) 完成风险匹配的检查与已授权发布接入。代码或编译契约变更执行最后一次正式 refresh/import、编译和 reload，处理全部 error 并单独检查 warning/obsolete；纯规则或文档修改只做静态校验。

必须通过真实 executor/Pipeline 重放原失败请求；新增能力则运行当前任务原本需要的请求，核对绑定、参数和确认、原生 envelope、内部 domain 结果、实际副作用及读回。typed handler 的本地测试不能证明正式入口已经注册并可用。用户级持久写入还要核对最新原生状态与文件版本，不能使用旧 Editor 内存覆盖新状态。

修复后恢复原任务和原持久 Job。进度说明处理方式与结果即可，不提出已获授权的修复选择题；最终准确区分已修复、已发布、当前项目已采用和仍未验证的部分，不能在正式回归前宣称 CLI 已恢复。

## 旧传输迁移时才执行

逐个旧 route 明确选择正式注册（`custom_cli`）、并入现有能力（`merge_into`）或删除冗余（`delete_redundant`），然后验证新 catalog、consumer rewrite 与旧 consumer 为零。完成后清理权限范围内的旧 package/server、配置、进程入口、route/schema、示例、兼容 alias、被替代的旧传输仓库及一次性迁移台账；不能以留档为由保留活动或可发现的旧实现。

结合当前授权范围读回 manifest/lock、package metadata、项目/用户/宿主配置、活动进程、README 与 Agent 规则，确认旧表面已经退役，依赖为 registry 版本或完整远端 Git SHA。用户的其他独立 checkout 和 dirty 内容不作为遗留删除。
