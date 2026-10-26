# 目录分类与自动审查

通用扫描 owner 是 VMUnityAutomation 的 `asset/review-folder-organization`，通过当前 CLI catalog 查询其精确名称和 schema。此 skill 说明分类与工作流，不另写文件扫描脚本。

## 默认范围

没有 `ProjectSettings/VMUnityAutomationFolderAudit.json` 时，工具使用显式内置策略，只探测这些已知路径，不在整个 Assets 或插件内搜索同名文件夹：

| 范围 | 检查深度 | 每层直接文件/子目录上限 |
| --- | --- | --- |
| `Assets` | 仅根层 | 8 / 16 |
| `Assets/Scripts` | 存在时递归 | 24 / 32 |
| `Assets/Editor` | 存在时递归 | 24 / 24 |
| `Assets/Resources` | 存在时递归 | 64 / 32 |
| `Assets/GameResources` | 存在时递归 | 64 / 32 |
| `Assets/Game Resources` | 存在时递归 | 64 / 32 |

这些是通用起始阈值，实际执行以当前工具 contract 和项目配置为准。`.meta` 不作为第二份资源计数。每个阈值是当前层直接子项数量，不是整棵树总量。

Assets 根层盘点包含实际可见的直接目录，包括 Plugins 的目录入口，但不会因此遍历其内容。根层超量时只考虑合并项目自有分类入口；不得要求移动或拆分第三方目录。Packages、Library、构建、外部 checkout，以及未单独纳入策略的插件/供应商树都不递归检查。脚本或资源范围里若混有外部资源，先按来源证据配置 `excludePaths`，不能仅凭名字猜所有权。

## 项目配置

配置存在时完整替代默认策略，不与默认范围偷偷合并。已有无效文件必须报错，不能悄悄使用默认策略。示例里的路径必须确实存在；按项目现状保留对应根并注明第三方排除原因：

```json
{
  "schemaVersion": 1,
  "folders": [
    { "path": "Assets", "recursive": false, "maxDirectFiles": 8, "maxDirectSubfolders": 16 },
    { "path": "Assets/Scripts", "recursive": true, "maxDirectFiles": 24, "maxDirectSubfolders": 32 },
    { "path": "Assets/GameResources", "recursive": true, "maxDirectFiles": 64, "maxDirectSubfolders": 32 }
  ],
  "excludePaths": []
}
```

`recursive` 省略时为 true。浅层根只授权该目录本身，不能让 `paths` 指定其未纳入的子树。更具体阈值只在自身覆盖范围生效；显式递归父范围仍拥有其递归覆盖。排除采用完整目录段边界，整棵排除子树既不计数也不遍历；链接不跟随。`paths` 只能缩小范围，`maxIssues` 只限制返回条目，不能缩减扫描或隐藏总数。工具预算超限、空覆盖或截断时，不得把报告说成完整通过。

## 分类依据

参考 MarbleBattlers 的已检查布局：Assets 根层分为 Scripts、GameResources、Resources、Scenes、Settings、Shaders、Plugins 等稳定入口；Scripts 内按 AI、Animations、Buffs、Damage、Entities、GameCore、Items、Saves、UI 等职责，GameResources 内按 Audios、Configurations、Effects、Fonts、Images、Localization、Materials、Prefabs、Texts、UI Documents 等内容类型。

借用分类原则，不复制该项目文件或强制所有项目采用相同目录。先确认项目原生加载/生成 owner、引用、Resources 路径及 Addressables key，再选择能表达职责和资源语义的分组。统一生成的类型目录和同类资源集合可能合理，超限时记录事实和依据，不能为消告警把目录随意分箱、提高阈值或排除自有内容。

整理前确认所有权；第三方 package/plugin 及其附带源码、Samples、Resources 和导入器按原发布布局保留，即使文件很多也不能作为本项目自有内容重排。用户维护的通用 package 的真实源码问题回其权威仓库处理，不在消费项目缓存里改。

Unity 资源迁移使用正式原生 asset 工具保留 GUID/local file ID，并验证引用、字符串加载、注册表及生成路径。不要用 shell 大批搬动资源或创建场景副本。整理功能不属于审查命令的副作用。

## 日常接入

新增或调整命中范围的脚本/资源后，在收尾运行通用审查；若项目已有内容验证入口，应组合这个 typed owner，使不传类别的常规审查也执行目录检查。不要复制项目专属扫描器。技能与已有校验流程负责调用，工具本身是只读按需审查，不声称存在文件系统后台监控。

读回配置来源、实际 roots、扫描计数、完整 issueCount、truncated 和每条 finding。说明哪些是职责混杂、哪些是同质集合以及哪些来源待确认。零数量告警只证明当前策略下未超限，不能代替资源、美术、行为或视觉验收。
