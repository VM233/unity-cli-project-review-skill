# 验证与 package 采用

## 按风险选择正式证据

- 规则、文档、Git、ProjectSettings 或独立 package 源码操作不为“编辑安全”额外查询或启动 Editor。写入 Assets/Unity 对象前按项目安全规则确认稳定 Edit Mode，Play/reload/实例变化会使该批次检查点失效。
- 第一方手写 C# 改动后，通过正式 `code/policy-review` 审查实际修改文件的精确去重列表，使用 `forbidPartial=true`、`maxTypeLines=1500` 或项目更严格门禁。检查扫描文件数、success/passed、errors 和 truncation，不在 skill 里复制 route 已拥有的结构规则。
- 最后一次代码或编译契约写入后执行正式 refresh/import、编译与 reload，检查完整 error、warning、obsolete/deprecated。聚焦本轮 owner 的因果回归，不因发布版本或改文档运行整套战斗测试。
- 脚本/资源组织改动执行通用 folder review；Prefab、Localization、Sprite、GamePrefab 等还须执行各自原生领域审查。编译和静态审查不证明运行画面或输入体验。
- 通过实际 executor/Pipeline 重放正式调用。直接运行纯 owner 的单元测试可验证算法，不能取代注册 schema、错误 envelope、绑定和实际调用路径的集成检查。

对具有递归/多循环/全量扫描的工具，首次可执行写入前按代码质量规则建立 Static Cost Ledger，冻结轴上界、真实乘积、昂贵调用、分配和主线程预算。工具的有限预算是 contract，不靠缩小目标或静默截断报告通过。

## 唯一 owner 与发布

先从 remote、manifest、解析路径和实际源码确认用户维护的权威 package。`VMUnityAutomation` 拥有通用 typed 命令、schema、错误和执行生命周期；framework package 拥有领域能力；消费项目只组合项目事实。外部插件默认保留，不能因为目录拥挤就接管。

授权修改的 package 在独立权威仓库完成。同步源码、聚焦测试、版本/CHANGELOG、专门文档及实际公开 contract；遵守仓库已有发布方式。禁止直接改 `Library/PackageCache`，也不使用 embedded、file:、symlink 或本地副本作为最终依赖。

共享规则已明确授权用户维护 package 的自动发布闭环时，完成上游提交/推送和当前已授权消费项目的精确 pin/lock/adoption，不重复询问；若不存在该授权，则遵守用户当前发布边界。不能自动升级其他项目，也不能夹带消费项目业务脏改、创建 PR 或新增发布渠道。

## Adoption 不是改一行 manifest

取得并读回不可变完整远端 SHA 后，让当前正式 package update/resolve Job 采用该 revision，保存并立即轮询原任务。证据须覆盖 manifest、lock、registered/resolved package path/hash、Asset refresh、编译、assembly reload 与实际 revision。

运行正式 `package/dependency-policy-review`，保持 `includeResolved=true`，metaRoots 覆盖本次触及且由当前项目拥有的根。检查报告对应当前 checkout、无 errors、通过且未截断；不在 skill 复制依赖与 metadata 检查清单。已验证上游 fixture 无须在消费端重复整套测试，但应验证当前任务真正依赖的正式命令。

Git 发布只包含授权路径；fetch/比较后无损保留其他 dirty 内容，推送后用远端读回证明目标 SHA 与本地一致、无剩余领先。不能仅凭本地 tracking ref 或 push 返回成功声称采用完成。临时 job capability、凭据、机器绝对路径和项目内容不进入通用 skill 仓库。
