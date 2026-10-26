# easy-code 架构评审

> 状态：Phase 0 已落地（core + cli + CI/release）
>
> 日期：2026-10-26
>
> 仓库：ShenganLee/easy-code
>
> 基线：Node 22.23.4+ · pnpm 12.15 · TypeScript 7.0

一套开源的 TypeScript 开发者提效工具集，从空仓库开始设计 pnpm workspace、Tree Shaking、构建与发布体系。四位评审分别从开源规范、开发发布流程、技术架构和反方视角给出结论，最后收敛为一套可落地的 v0 方案。

## 01 结论先行

不是把 2026 年最流行的工具全部装上，而是先定义不可退让的契约，再为每个选择留下回退路径。

| #   | 决策                                            | 说明                                                                                                                                                                                              |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | **先发两个包，不做五包骨架**                    | v0 只发布 `@shengan/easy-code-core` 与 `@shengan/easy-code-cli`。`kit` 在第二个消费者出现时再拆，`plugin-*` 留到 Phase 2。架构预留位置，但不提前支付维护成本。                                    |
| 02  | **库包 ESM-only，Tree Shaking 可证伪**          | `"type": "module"`、`"sideEffects": false`、显式 `exports` 子路径（含 `default` 条件），Node 22.23.4+ 用 `require(esm)` 兜底 CJS。CI 用 marker 测试和体积预算证明树摇，而不是口头承诺。           |
| 03  | **tsdown + TS 7，库用 unbundle，CLI 用 bundle** | `tsdown 0.23.2` 负责 ESM 与 d.ts，`dts: { generator: 'oxc' }` + `isolatedDeclarations`；库包保留模块边界，CLI 打包并按命令懒加载。库包用 publint + attw，CLI 只做 publint（bin-only 没有 d.ts）。 |
| 04  | **pnpm catalog + Turborepo，不启用远程缓存**    | `pnpm 12` 统一版本与构建白名单，Turbo 只负责 `build` / `typecheck` 的依赖图。两三个包阶段不引入远程缓存和额外平台，CI 超过 5 分钟再评估。                                                         |
| 05  | **Version PR + tag 触发发布**                   | `main` 只跑 Version PR；`v*` tag 发 core+cli 固定组，`<dir>-v*` tag 只发对应独立包。`id-token: write` 只给 tag 发布作业，发布作业挂 `npm-release` environment；全程不出现 `NPM_TOKEN`。           |
| 06  | **治理只上 P0，文档站延后**                     | 先写 README、CONTRIBUTING、CODE_OF_CONDUCT 3.0、SECURITY、Issue/PR 模板与 CODEOWNERS。GOVERNANCE、ROADMAP、双语文档站、Scorecard 等在有外部贡献者之后再补。                                       |

**一句话原则：** 把 Tree Shaking 变成 CI 可证伪的契约，把发布变成一条可重复的流水线，其余基础设施都服务于这两件事，而不是反过来。

## 02 事实底座

方案里的版本与能力都做了 registry / 官方文档核对；关键配置还在本机做了最小 spike。

| 事项         | 核实结果                                                                                                                                                                                                                                                                | 对设计的影响                                                                                                                                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm 包名     | 裸名 `easy-code` 已被占用（2.0.0，2018 年后未更新，依赖 `express-session`/`gd-bmp`），`easy-code-cli` 也被占用（1.0.6）；`@shengan/easy-code-core` 与 `@shengan/easy-code-cli` 当前在 registry 未发现占用。`easy-code-cli` 还声明了 `easy-code` / `easycode` 两个 bin。 | 已定使用 `@shengan/easy-code-*`；发布前在 npm 登录态确认 `@shengan` org 可写。**绝不宣传 `npx easy-code`**，它会安装 2018 年的无关包；只写 `npx @shengan/easy-code-cli`。bin 名本地安装通常无碍，全局安装可能与旧包互相覆盖，建议评估 `ec`/`ezc`。 |
| TypeScript   | 最新稳定版 7.0.2；Go 原生编译器，类型检查显著加速；programmatic API 预计 7.1 才稳定。                                                                                                                                                                                   | 用 TS 7 做类型检查与 d.ts；不用依赖 TS API 的 API Extractor、typescript-eslint。生态工具缺失是已知代价，不是意外。                                                                                                                                 |
| tsdown       | 0.23.2（0.x 语义化版本），基于 Rolldown 1.2，支持 TS 7、oxc d.ts、publint、attw、treeshake。其 d.ts 插件依赖 `rolldown-plugin-dts` 0.29 beta 线。                                                                                                                       | 作为构建器，但精确锁版本；`dts` 显式指定 `generator: 'oxc'`。实测多入口会抽 shared chunk，库包因此选择 `unbundle`；`exports: true` 会重写 package.json，故手动维护 exports。dts 若被 beta 插件阻塞，临时用 TS 6.0.3 生成声明，而不是降级整个项目。 |
| pnpm         | 最新 12.15.0（Rust 重写）；配置集中在 `pnpm-workspace.yaml`；`allowBuilds` 取代旧版 `onlyBuiltDependencies`；`minimumReleaseAge` 默认 1440 分钟；`engineStrict`/`minimumReleaseAgeStrict`/`blockExoticSubdeps`/`strictDepBuilds` 可用。                                 | 本地 pnpm 10.28.2 需要升级；`.npmrc` 只保留 auth/registry；catalog、构建白名单、供应链策略都写进 workspace 配置。CI 用 `pnpm/setup@v3`，它同时安装 pnpm 与 Node，不再依赖 Corepack。                                                               |
| Node         | Node 26 于 2026-10-27 进入 LTS，Node 24 已转 Maintenance；Astro 7.4.2 要求 Node ≥ 22.23.4。                                                                                                                                                                             | engines 统一为 `^22.23.4`、`^24.11.0`、`^26.0.0` 三段，避免文档站加入后再次改口；CI 跑 22.23.4 / 24 / 26。                                                                                                                                         |
| Changesets   | 3.0.3（2026-08 发布，ESM-only）；`changeset version` 在没有 changeset 时退出码为 1；`format` 支持 prettier/oxfmt 等，不支持 Biome。                                                                                                                                     | 用 `select-mode` 判断模式，避免空跑；`format: false`，由 Biome 负责格式；action 必须用 v2 与 CLI v3 配套。                                                                                                                                         |
| npm 可信发布 | 需要 npm ≥ 11.5.1、GitHub 托管 runner、`id-token: write`、workflow 文件名精确匹配；新包首次发布需人工完成，配置后 2 天内要完成首次验证。                                                                                                                                | 发布作业单独拆出，安装 npm 11.21.1；不放 `NPM_TOKEN`，不设 `registry-url`，避免 setup-node 写入过期的 token 占位符。                                                                                                                               |
| Biome        | 2.6.3；支持 Markdown/YAML/SCSS 格式化；`linter.domains.types` 提供类型感知规则，但不少关键规则仍在 nursery。                                                                                                                                                            | 作为 format + lint 主力；类型正确性以 `tsc --noEmit` 和测试为准，不把 nursery 规则当发布门禁。                                                                                                                                                     |
| 文档站       | Astro 7.4.2 + Starlight 0.42（Starlight 仍是 0.x）；Astro 7 要求 Node ≥ 22.23.4。                                                                                                                                                                                       | docs 是 Phase 1 的私有 app，不阻塞 0.1.0；先 README，后站点，避免文档站反过来定义产品。                                                                                                                                                            |

**已经验证/核对过的配置：** 本地 spike 覆盖 tsdown 0.23.2 的 ESM 构建、`unbundle`、d.ts、publint/attw，esbuild 对产物的树摇，pnpm 12 的 catalog / `allowBuilds` / `minimumReleaseAge` / 新增供应链设置，TS 7 的 `isolatedDeclarations` + `noEmit` 组合，以及 CLI-only 包的 attw 行为（无 d.ts 会报错，故 CLI 关闭 attw）。`pnpm/setup@v3` 的输入与版本按官方 README 核对，未在 CI 实跑。本文其余配置不是纸面推演。

## 03 四人评审

四个角色看同一份基线方案，结论并不一致。分歧本身比共识更有价值，因此先保留各自立场，再用一张裁决表收敛。

### Reviewer 01 · 开源规范

> “一个没有 SECURITY.md、没有可信发布链的包，不应该出现在 npm 上。”
- **命名已收敛。** 使用 `@shengan/easy-code-*`；发布前在 npm 登录态确认 `@shengan` org 可写。**绝不宣传 `npx easy-code`**——它会安装 2018 年的无关包；只写 `npx @shengan/easy-code-cli`。
- **P0 只上六类文件。** README、CONTRIBUTING、CODE_OF_CONDUCT 3.0、SECURITY、Issue/PR 模板、CODEOWNERS。贡献者协议用 DCO，不上 CLA；DCO 用仓库内检查，不依赖已停摆的第三方 App。
- **包元数据要完整。** `repository.directory`、homepage、bugs、keywords、author、files、license、engines、`publishConfig.access=public`；根 LICENSE 不会进入子包 tarball，每个包目录各放一份 LICENSE 与 README。
- **API 稳定策略先写清楚。** 0.x 允许 minor 破坏，但 CHANGELOG 必须标 BREAKING；注意 Changesets 在 0.x 用 `major` 会直接到 1.0.0，破坏性变更应写 `minor`。1.0 后至少保留一个 minor 的 deprecation；公共 API 只认 exports map，dist 深导入不支持。
- **发布安全。** npm 2FA；每包 trusted publishing；Publishing access 设为“Require 2FA and disallow tokens”；2026-09-03 后新建 trusted publisher 默认只允许 stage publish，必须显式勾选 npm publish；第三方 Action 固定 SHA。
- **治理文件延后。** GOVERNANCE、ROADMAP、SUPPORT、Scorecard、SBOM、签名标签在第一个外部贡献者或 1.0 之前都是表演；用 GitHub Milestones 代替静态路线图。

**反对：** 空壳治理、CLA、没有发布就先堆 badge、依赖第三方 DCO App。

### Reviewer 02 · 开发发布流程

> “版本 PR 也必须过 CI，但它不是功能 PR；给它单独的判断条件。”
- **pnpm-workspace.yaml 是唯一配置源。** `catalogMode: prefer`、`allowBuilds`、`minimumReleaseAge: 1440`、`minimumReleaseAgeStrict`、`trustPolicy: no-downgrade`、`engineStrict`、`blockExoticSubdeps`、`strictDepBuilds`；`.npmrc` 不再承载这些设置。
- **CI 分两层。** Node 24 做 lint / typecheck / build / test / 树摇 / pack 验证；Node 22.23.4、24、26 做测试矩阵；macOS/Windows 冒烟作为 P1，不阻塞首发。CI 用 `pnpm/setup@v3` 一步安装 pnpm 与 Node，不再依赖 Corepack。
- **Version PR 与发布分离。** `main` 上的 `version.yml` 只用 `select-mode` 判断是否创建 Version PR，权限只要 `contents: write` 与 `pull-requests: write`；推送 `v*` tag 才触发 `release.yml`，只有它拿 `id-token: write` 并挂 `npm-release` environment。core 与 cli 用 fixed 组锁步版本；插件独立。
- **OIDC 的坑要写进清单。** npm ≥ 11.5.1（建议 11.21.1）、workflow 文件名精确匹配、`repository.url` 一致、首次人工发布、配置后 2 天内完成验证、不要 `NPM_TOKEN`、不要 `registry-url`、新建 trusted publisher 要显式允许 npm publish（默认 stage-only）。
- **changeset status 只对功能 PR 生效。** `changeset-release/main` 分支跳过；docs/CI 改动用 `changeset --empty` 明确“无发布”。
- **Biome 与 Changesets 生成文件隔离。** Changesets 设 `format: false`，Biome 忽略 `.changeset/**` 与 `CHANGELOG.md`，否则 `biome ci` 会把生成的 changelog 当成待格式化的文件。

**反对：** 手工 `pnpm publish -r` 作为长期方案；在 version 作业暴露 OIDC；版本 PR 被 changeset status 误杀；单人维护时给自己加 required reviewer 卡住发布。

### Reviewer 03 · 技术架构

> “如果消费者不能用一个 marker 测试证明树摇，我们就不能说支持树摇。”
- **ESM-only 是前提，不是偏好。** CJS 静态分析会破坏树摇；Node 22.23.4+ 的 `require(esm)` 已能兜底大多数 CJS 消费。**exports 必须包含 `default` 条件**，只有 `import` 时 `require()` 会报 `ERR_PACKAGE_PATH_NOT_EXPORTED`；库入口禁止 top-level await。真遇到硬需求，再为单个包加 `require` 入口，不做全量双构建。
- **exports 显式、少而稳定。** `types` 条件放第一位，`import` 与 `default` 指向同一个 `.js`；不使用通配导出；`package.json` 也要导出。
- **不要运行时 TS 别名。** 源码用相对路径 + `.js` 扩展；TS paths 或 `#imports` 在发布后会指向源码或错位。工作区依赖用 `workspace:^`，不要用 paths 代替包边界。
- **库用 unbundle，CLI 用 bundle。** bundle 模式可能把未使用子模块的顶层副作用并进入口 chunk，即使声明 `sideEffects: false` 也摇不掉；unbundle 保留模块边界，树摇验证也更直接。CLI 则用动态 import 做命令级懒加载。
- **类型与 lint 分工明确。** `isolatedDeclarations` 要求导出函数/常量/类属性显式标注；tsdown 用 `dts: { generator: 'oxc' }`（TS 7 下 tsc 生成器不可用）；`tsc --noEmit` 是类型真相，Biome 负责快速 lint/format。
- **CLI 的 schema 库选 valibot。** 实测小 schema gzip：valibot 1.4KB，zod 4 根入口约 93KB，zod/mini 约 5.2KB。CLI 不需要 zod 的生态，valibot 的包体和树摇更适合。

**反对：** 为“平台无关”把 fs/exec 塞进 core；在 core 里放 zod/valibot 校验；过早做插件注册表；用 bundle 模式冒充 tree-shaking 保证。

### Reviewer 04 · 反方

> “仓库里还没有第一个包，基础设施已经比产品复杂了。”
- **五包 + Turbo + Changesets + 文档站 + 治理文件，是过度设计。** v0 砍到两个发布包；`kit` 等第二个消费者，插件等第二个工具，文档站等 README 写不下。
- **“最新”不等于“适合”。** TS 7 生态 API 未就绪、Biome 类型规则不足、tsdown 的 dts 插件依赖 beta、pnpm 12 是 Rust 重写、Changesets 3 刚发布。每一项都要有回退方案：dts 被阻塞时用 TS 6.0.3 生成声明，工具链升级失败时回退上一版并锁住。
- **ESM-only 会挡住一部分人。** Node 22.23.4+ 的 `require(esm)` 可用，但 Jest/旧 bundler 仍可能不认；先测量再决定。如果 CJS 需求集中在少数场景，用 `require(esm)` 或单包 CJS 入口解决，不要一开始就 dual。
- **树摇承诺没有消费者测试就是空话。** marker 测试、体积预算、打包后安装冒烟，至少要有前两个；最好再加一个 Rollup/Vite consumer fixture。否则删掉“支持 Tree Shaking”这句话。
- **单人维护最先荒废的是治理和跨 OS。** GOVERNANCE、双语文档、Windows 矩阵都可以延后；发布流程必须自动化到“合并即完成”。给自己加 environment required reviewer 只会卡住自己，用 deployment branch 限制 main 即可。
- **给 v0 加一条时间闸门。** 4 周内没有一条用户可用的 CLI 命令，就冻结所有基建，只写功能。

**我的更小 v0：** 一个 CLI（core 先作为内部 `src/core`），手工 `changeset version` + `pnpm publish -r --provenance`；等第一个真实库消费者出现，再把 core 拆成发布包并上 Turbo、docs、plugins。

### 争议裁决

| 议题              | 分歧                                              | 裁决                                           | 理由 / 回退触发                                                                                                                                                                                                                                                                          |
| ----------------- | ------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 包数量            | 架构方要 core/kit/cli；反方要 1 个包起步。        | **采纳** v0 两个发布包：core + cli；kit 按需。 | core 的平台无关边界值得保留；kit 只有在第二个消费者出现时才值得拆。若 3 个月仍只有一个消费者，取消 kit 计划。                                                                                                                                                                            |
| ESM-only          | 架构方坚持；反方担心 CJS 用户。                   | **采纳** ESM-only，Node 22.23.4+。             | 树摇与双包危害是硬约束；`require(esm)` 已覆盖支持范围，exports 必须带 `default`。若 CJS 相关 issue 连续出现，单包加 `require` 入口，不做全量 dual。                                                                                                                                      |
| Node 22 下限      | 22.18（tsdown 最低） vs 22.23.4（Astro 7 要求）。 | **采纳** 22.23.4。                             | 文档站虽在 Phase 1，但提前统一可避免以后改 engines 和 CI；22.23.4 仍属 Node 22 维护线。                                                                                                                                                                                                  |
| TypeScript 7      | “最新稳定”；反方指出生态 API 未就绪。             | **采纳** TS 7.0.2，精确锁版本。                | 避开依赖 TS API 的工具即可；tsdown 的 oxc d.ts 已验证。若 d.ts 被 oxc 插件 beta 阻塞，临时用 TS 6.0.3 生成声明，不降级整个项目。                                                                                                                                                         |
| 版本组            | fixed 锁步 vs independent 独立。                  | **采纳** core + cli fixed 组。                 | 两包兼容性优先，fixed 减少版本矩阵；插件独立。若 core 的 patch 频繁强迫 cli 发版，或未来包节奏明显分化，改 independent + peerDependencies。                                                                                                                                              |
| CLI schema        | zod 4 生态大 vs valibot 包体小。                  | **采纳** valibot 1.5.0。                       | 实测小 schema gzip：valibot 1.4KB，zod 4 根入口约 93KB，zod/mini 约 5.2KB。CLI 不需要 zod 生态；若未来必须用 zod，至少 `zod/mini`。                                                                                                                                                      |
| Biome 2.6         | 格式化/lint 一体；类型感知规则仍在 nursery。      | **采纳** Biome，tsc 为准。                     | 不做 typescript-eslint（TS 7 API 缺口）；类型正确性由 tsc 和测试兜底。若 missing rule 影响真实缺陷，再评估 oxlint 类型感知模式。                                                                                                                                                         |
| Turborepo         | 发布方推荐；反方认为两三个包不需要。              | **保留** 最小配置，无远程缓存。                | 只用来表达 build/typecheck 的依赖图；若 CI 低于 5 分钟或配置成为负担，回退 `pnpm -r`。                                                                                                                                                                                                   |
| Changesets + OIDC | 发布方要求自动化；反方觉得单人维护太重。          | **采纳** Version PR + tag + environment。      | npm 经典 token 已退出历史，OIDC 是长期正确解；tag 触发把“发布”变成一个明确动作，`main` 合并不会误发。fixed 组用 `v*`，独立包用 `<dir>-v*`；environment 限制到 `main`、`v*` 与 `*-v*`。required reviewer 等有第二个维护者再加。若发布每月超过 30 分钟，先简化 version 脚本，不放弃 OIDC。 |
| 文档站            | 开源规范列为 P1；反方认为过早。                   | **延后** Phase 1，不阻塞 0.1.0。               | README 先承担快速开始；docs 在第一个真实工具稳定后上线。Starlight 仍是 0.x，晚点上风险更小。                                                                                                                                                                                             |
| 治理文件          | 规范方要最小集；反方反对形式主义。                | **采纳** 只上 P0 六类。                        | GOVERNANCE、ROADMAP、SUPPORT、Scorecard 在有外部贡献者后补；不在 0.1.0 前写。                                                                                                                                                                                                            |
| 插件系统          | 架构方想预留协议；反方认为没有第二个工具。        | **只留类型** 不做插件包。                      | core 可以导出 `definePlugin` 类型与零副作用契约，但不做自动扫描、不做注册表、不发 `plugin-*`。第二个工具出现再实现。                                                                                                                                                                     |
| npm 命名          | 已定 `@shengan/easy-code-*`；org 可用性待确认。   | **已拍板** scope；发布前确认 org 可写。        | `@shengan/easy-code-core` 与 `@shengan/easy-code-cli` 当前未被占用。**绝不写 `npx easy-code`**——那是 2018 年的无关包。注意 `easy-code-cli` 已声明 `easy-code` / `easycode` 两个 bin：本地安装通常无碍，全局安装可能互相覆盖，建议评估 `ec` 或 `ezc`。                                    |
| 树摇证明          | 大家都同意要做，但对成本有分歧。                  | **必须** marker + 体积预算。                   | marker 测试几十行代码即可；体积预算先测基线再设阈值。`pnpm pack` 后安装冒烟作为 P1。                                                                                                                                                                                                     |

## 04 最终架构

目标结构保留扩展位，但 v0 只实现最少的两个发布包。依赖方向永远向下，core 不知道 Node，也不知道 CLI。

```text
消费层      @shengan/easy-code-cli        其他工具 / 脚本       @shengan/easy-code-plugin-* (Phase 2)
              ↓
Node 能力层  @shengan/easy-code-kit (Phase 1)    CLI 内部模块 · fs / exec / config
              ↓
内核层      @shengan/easy-code-core        类型 · 纯函数 · 契约 · 错误模型
              ↓
发布层      npm OIDC              GitHub Releases       Starlight 文档 (Phase 1)
```

实线为 v0 交付；虚线为明确的延后项。依赖只能向下：core 不导入 kit/cli，kit 不导入 cli，插件只 peer 依赖 core。

### 包职责与依赖

| 包                            | v0      | 职责                                                                                 | 运行时依赖                               | 平台 / 产物              |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------ | ---------------------------------------- | ------------------------ |
| `@shengan/easy-code-core`     | 发布    | 公共类型、纯函数、错误模型、插件/配置契约。不碰 fs、exec、env、process。             | 零                                       | neutral · ESM · unbundle |
| `@shengan/easy-code-cli`      | 发布    | bin 入口、命令注册、配置加载与校验、日志与退出码。命令按需动态加载。                 | core、cac、unconfig、valibot、picocolors | node22 · ESM · bundle    |
| `@shengan/easy-code-kit`      | Phase 1 | 可复用的 Node 能力：配置、进程、文件系统、包管理器探测。只有第二个消费者出现时才拆。 | core + node:*                            | node22 · ESM · unbundle  |
| `@shengan/easy-code-plugin-*` | Phase 2 | 显式安装、显式注册的插件；peer 依赖 core，不自动扫描 node_modules。                  | core（peer）                             | node22 · ESM             |
| `@shengan/easy-code-docs`     | Phase 1 | Astro + Starlight 文档站，私有包，不发布 npm。                                       | 无运行时依赖                             | 静态站点                 |
| `examples/*`                  | v0      | 一个最小示例，验证“安装包 → 跑 CLI → 导入库”的真实路径。                             | workspace 包                             | 私有                     |

### 边界规则

- **core 零 Node 依赖。** 禁止 `node:*`、`process`、`Buffer`、`fs`、`child_process`；需要平台能力时通过接口注入，而不是直接调用。
- **cli 是薄壳。** 命令实现可以逐步下沉到 kit，但 cli 不反向被任何包依赖；cli 的 exports 只暴露必要的程序化 API，主要入口是 bin。
- **kit 不提前存在。** 当第二个消费者需要同一段 Node 逻辑时再抽取；抽取前先复制，避免抽象税。
- **插件显式注册。** 用户在配置里列出插件包名，CLI 动态 import 并校验；不自动扫描 node_modules，避免隐式副作用和安全风险。
- **公共 API = exports map。** `dist` 内部文件不是 API；deep import 不承诺兼容。子路径只暴露稳定能力，内部模块不导出。exports 必须带 `default` 条件，才能让 Node 22.23.4+ 的 `require(esm)` 工作。
- **不使用运行时 TS 别名。** 源码用相对路径 + `.js` 扩展；工作区依赖用 `workspace:^`，不用 tsconfig paths 代替包边界。
- **库入口禁止 top-level await。** 否则 `require(esm)` 直接失败；需要异步初始化时暴露显式 `await setup()`。
- **`sideEffects: false` 是契约。** 任何 polyfill、全局注册、CSS import、`process.env` 写入都会破坏它；确有副作用文件时改成数组精确标注，不要全局撒谎。

## 05 Tree Shaking 契约

Tree Shaking 由四件事共同保证：包的声明、模块的写法、构建的形态、CI 的证明。缺一项，承诺就只停留在 README。

| 规则         | 做法                                                                                      | 为什么                                                                                                                                                                                 |
| ------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 仅 ESM       | `"type": "module"`，只输出 ESM；`exports` 用 `import` + `default` 指向同一个文件。        | CJS 的动态导出无法被静态分析，双格式还会引入双包危害。Node 22.23.4+ 的 `require(esm)` 已能兜底大多数 CJS 消费；只有 `import` 条件时 `require()` 会报 `ERR_PACKAGE_PATH_NOT_EXPORTED`。 |
| 无副作用     | 每个库包 `"sideEffects": false`；模块顶层不读 env、不改全局、不注册进程事件、不打印日志。 | bundler 只有确认模块可安全丢弃，才敢把未使用的整块代码删掉。`sideEffects: false` 是契约，不是优化开关。                                                                                |
| 显式入口     | `exports` 只列稳定子路径；`types` 条件放第一位；不使用 `"./*"` 通配。                     | 让消费者能按功能导入，也让包作者能承诺哪些路径是公共 API。                                                                                                                             |
| 保留模块边界 | 库包 `unbundle: true`；CLI 才 bundle。避免多入口 shared chunk 把无关代码带进加载图。      | bundle 模式可能把未使用子模块的顶层副作用并进入口 chunk；unbundle 保留模块边界，树摇验证也更直接。                                                                                     |
| 可丢弃初始化 | 顶层只做可证明无副作用的初始化；必要时用 `/*#__PURE__*/` 标注。                           | 否则 `sideEffects: false` 与实际行为不符，消费者 bundler 会被误导。                                                                                                                    |
| 禁止 TLA     | 库入口不使用 top-level await；需要异步初始化时暴露显式 `await setup()`。                  | `require(esm)` 遇到 TLA 会失败，Node 22 的 CJS 兜底路径被切断。                                                                                                                        |

### CI 证明链

- **publint + attw：** 验证 exports、types、ESM-only 解析在 Node16/ESM 场景下成立。attw 用 `esm-only` profile，避免为不支持的 node10/CJS 场景误报。
- **marker 测试：** 对每个公共入口写一个只导入单个符号的消费者文件，用 esbuild 打包，断言未使用模块里的唯一字符串没有出现。
- **体积预算：** size-limit 对“完整入口”和“单个符号”分别设预算；先测基线，再设阈值，回归超过 10% 失败。
- **消费者 fixture（P1）：** 用 Rollup/Vite 建一个最小消费者，导入单个符号，检查产物不含另一个符号的标记；esbuild 通过不代表所有 bundler 都通过。
- **打包后安装冒烟（P1）：** `pnpm pack` 出 tarball，在临时 fixture 里安装，分别用 ESM import 与 Node CJS `require()` 加载，跑一次真实调用。

```js
// scripts/check-treeshaking.mjs
import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

// 每个 case 只导入一个公共符号；forbidden 是未使用模块里的唯一字符串。
const cases = [
  {
    name: 'core: definePlugin only',
    code: `import { definePlugin } from '@shengan/easy-code-core'; console.log(definePlugin)`,
    forbidden: ['__EASY_CODE_LOGGER__'],
  },
  {
    name: 'core: defineConfig only',
    code: `import { defineConfig } from '@shengan/easy-code-core'; console.log(defineConfig)`,
    forbidden: ['__EASY_CODE_PLUGIN_REGISTRY__'],
  },
]

for (const item of cases) {
  const result = await build({
    stdin: { contents: item.code, resolveDir: root, loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    treeShaking: true,
    minify: false,
    logLevel: 'silent',
    alias: {
      '@shengan/easy-code-core': `${root}/packages/core/dist/index.js`,
    },
  })

  const output = result.outputFiles[0].text
  for (const marker of item.forbidden) {
    if (output.includes(marker)) {
      throw new Error(`${item.name}: unused module leaked into bundle (${marker})`)
    }
  }
  console.log(`ok ${item.name} (${output.length} bytes)`)
}
```

**不要过度承诺：** CLI 包不宣称支持 Tree Shaking；只有库包（core，以及未来的 kit）进入 marker 与体积预算。消费者文档里写清楚：需要支持 ESM 的 bundler，`sideEffects: false` 才会生效。

## 06 配置清单

下面是可直接落地的核心配置。版本号全部来自 2026-10 的 registry 核对；预算类数字是占位，需在第一次构建后按基线调整。

### pnpm-workspace.yaml

```yaml
packages:
  - packages/*
  - apps/*
  - examples/*

catalogMode: prefer

catalog:
  "@arethetypeswrong/core": 0.18.5
  "@biomejs/biome": 2.6.3
  "@changesets/changelog-github": 1.0.1
  "@changesets/cli": 3.0.3
  "@size-limit/preset-small-lib": 14.3.0
  "@types/node": 24.19.2
  "@vitest/coverage-v8": 5.0.5
  cac: 7.1.0
  esbuild: 0.28.2
  execa: 10.2.1
  picocolors: 1.1.1
  publint: 0.3.25
  size-limit: 14.3.0
  tsdown: 0.23.2
  turbo: 2.11.10
  typescript: 7.0.2
  unconfig: 7.5.0
  valibot: 1.5.0
  vite: 8.3.5
  vitest: 5.0.5

# pnpm 11+ 用 allowBuilds 取代 onlyBuiltDependencies
allowBuilds:
  esbuild: true

engineStrict: true

# 供应链：新版本至少沉淀 1 天再安装；strict 表示不满足时直接失败
minimumReleaseAge: 1440
minimumReleaseAgeStrict: true

# 阻止信任等级下降的包（必要时用 trustPolicyExclude 放行）
trustPolicy: no-downgrade

# 阻止通过 git/tarball 等怪异协议引入的间接依赖
blockExoticSubdeps: true

# 依赖的构建脚本必须显式放行
strictDepBuilds: true
```

> 首次安装可能被供应链延迟拦截：如果某个刚发布的版本不满足 1440 分钟，用 `minimumReleaseAgeExclude` 精确放行该版本并记录原因；不要为了省事把 `minimumReleaseAge` 设为 0。紧急安全更新也走同一个白名单流程，事后删除例外并记录到 `SECURITY.md`。

### package.json（根，关键脚本）

```json
{
  "name": "@shengan/easy-code-repo",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.15.0",
  "engines": {
    "node": "^22.23.4 || ^24.11.0 || ^26.0.0",
    "pnpm": ">=12.15.0"
  },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write .",
    "typecheck": "turbo run typecheck",
    "test": "vitest run --coverage",
    "test:types": "vitest --typecheck --passWithNoTests",
    "check": "pnpm lint && pnpm typecheck && pnpm build && pnpm test && pnpm test:types && pnpm check:treeshake && pnpm check:size && pnpm check:pack",
    "check:treeshake": "node scripts/check-treeshaking.mjs",
    "check:size": "size-limit",
    "check:pack": "pnpm -r --filter './packages/*' pack --dry-run",
    "changeset": "changeset",
    "release:version": "changeset version && pnpm install --lockfile-only",
    "release:publish": "changeset publish"
  },
  "devDependencies": {
    "@arethetypeswrong/core": "catalog:",
    "@biomejs/biome": "catalog:",
    "@changesets/changelog-github": "catalog:",
    "@changesets/cli": "catalog:",
    "@size-limit/preset-small-lib": "catalog:",
    "@types/node": "catalog:",
    "@vitest/coverage-v8": "catalog:",
    "esbuild": "catalog:",
    "execa": "catalog:",
    "publint": "catalog:",
    "size-limit": "catalog:",
    "tsdown": "catalog:",
    "turbo": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:",
    "vitest": "catalog:"
  }
}
```

### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "globalDependencies": ["pnpm-lock.yaml", "tsconfig.base.json", "biome.json"],
  "globalEnv": ["CI", "NODE_ENV"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", "tsdown.config.ts", "package.json", "tsconfig.json"],
      "outputs": ["dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "docs:build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

### .size-limit.json

```json
[
  {
    "name": "@shengan/easy-code-core (full)",
    "path": "packages/core/dist/index.js",
    "limit": "10 kB"
  },
  {
    "name": "@shengan/easy-code-core (definePlugin)",
    "path": "packages/core/dist/index.js",
    "import": "{ definePlugin }",
    "limit": "1 kB"
  }
]
```

### tsconfig.base.json

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "preserve",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "isolatedDeclarations": true,
    "erasableSyntaxOnly": true,
    "declaration": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": []
  }
}
```

core 的 tsconfig 继承 base 并保持 `types: []`；cli/kit 在各自 tsconfig 中显式加 `"types": ["node"]`。TS 7 不再依赖自动发现 `@types`，类型环境要写清楚。

### packages/core/tsdown.config.ts

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/plugin.ts'],
  format: ['esm'],
  platform: 'neutral',
  target: 'es2023',
  // platform: node 默认输出 .mjs；ESM-only 包希望用 .js
  fixedExtension: false,
  // 库包保留模块边界，避免多入口 shared chunk
  unbundle: true,
  // TS 7 下 tsc 生成器不可用；oxc 依赖 isolatedDeclarations
  dts: { generator: 'oxc' },
  clean: true,
  treeshake: true,
  sourcemap: true,
  publint: 'ci-only',
  attw: {
    enabled: 'ci-only',
    profile: 'esm-only',
    level: 'error',
  },
  // 手写 exports，避免构建改写 package.json
  exports: false,
})
```

### packages/cli/tsdown.config.ts

```ts
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  fixedExtension: false,
  // CLI 是应用，不是库；bundle 以减少文件数和冷启动
  unbundle: false,
  dts: false,
  clean: true,
  treeshake: true,
  sourcemap: true,
  publint: 'ci-only',
  // CLI 是 bin-only 包，没有 d.ts；attw 会报 "Package has no types"
  attw: false,
  exports: false,
})
```

> attw 只对库包开启：CLI 是 bin-only 包，没有 d.ts；实测 tsdown 的 attw 会直接报 `Package has no types`。CLI 保留 publint 校验 bin 与 files，库包（core，以及未来的 kit）才使用 `attw --profile esm-only`。

### packages/core/package.json

```json
{
  "name": "@shengan/easy-code-core",
  "version": "0.1.0",
  "description": "Platform-neutral core primitives and contracts for easy-code.",
  "keywords": ["easy-code", "developer-tools", "utilities"],
  "homepage": "https://github.com/ShenganLee/easy-code/tree/main/packages/core#readme",
  "bugs": { "url": "https://github.com/ShenganLee/easy-code/issues" },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ShenganLee/easy-code.git",
    "directory": "packages/core"
  },
  "license": "MIT",
  "author": "Shengan Lee",
  "type": "module",
  "sideEffects": false,
  "engines": { "node": "^22.23.4 || ^24.11.0 || ^26.0.0" },
  "files": ["dist", "README.md", "LICENSE"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./plugin": {
      "types": "./dist/plugin.d.ts",
      "import": "./dist/plugin.js",
      "default": "./dist/plugin.js"
    },
    "./package.json": "./package.json"
  },
  "types": "./dist/index.d.ts",
  "main": "./dist/index.js",
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "devDependencies": {
    "@arethetypeswrong/core": "catalog:",
    "publint": "catalog:",
    "tsdown": "catalog:",
    "typescript": "catalog:"
  }
}
```

### packages/cli/package.json（关键字段）

```json
{
  "name": "@shengan/easy-code-cli",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "engines": { "node": "^22.23.4 || ^24.11.0 || ^26.0.0" },
  "files": ["dist", "README.md", "LICENSE"],
  "bin": { "easy-code": "./dist/cli.js" },
  "publishConfig": { "access": "public" },
  "scripts": {
    "build": "tsdown",
    "dev": "tsdown --watch",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "dependencies": {
    "@shengan/easy-code-core": "workspace:^",
    "cac": "catalog:",
    "picocolors": "catalog:",
    "unconfig": "catalog:",
    "valibot": "catalog:"
  },
  "devDependencies": {
    "@arethetypeswrong/core": "catalog:",
    "@types/node": "catalog:",
    "publint": "catalog:",
    "tsdown": "catalog:",
    "typescript": "catalog:"
  }
}
```

### biome.json

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.3/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "includes": [
      "**",
      "!!**/dist",
      "!!**/coverage",
      "!!**/.turbo",
      "!!**/.astro",
      "!!**/*.astro",
      "!!**/*.mdx",
      "!!**/pnpm-lock.yaml",
      "!!**/.changeset",
      "!!**/CHANGELOG.md"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "assist": {
    "enabled": true,
    "actions": {
      "preset": "recommended",
      "source": { "organizeImports": "on" }
    }
  },
  "linter": {
    "enabled": true,
    "rules": { "preset": "recommended" },
    "domains": { "types": "recommended" }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "asNeeded",
      "trailingCommas": "all"
    }
  },
  "json": { "formatter": { "enabled": true } },
  "overrides": [
    {
      "includes": ["**/*.test.ts", "**/*.test-d.ts", "tests/**"],
      "linter": { "domains": { "test": "recommended" } }
    }
  ]
}
```

### vitest.config.ts

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'core',
          root: './packages/core',
          include: ['src/**/*.test.ts'],
          environment: 'node',
          typecheck: {
            enabled: true,
            include: ['src/**/*.test-d.ts'],
          },
        },
      },
      {
        test: {
          name: 'cli',
          root: './packages/cli',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'e2e',
          root: './',
          include: ['tests/e2e/**/*.test.ts'],
          environment: 'node',
          testTimeout: 30_000,
          pool: 'forks',
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // v0 gates coverage on the library package; the CLI is covered by e2e.
      include: ['packages/core/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.test-d.ts', '**/index.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
})
```

### .changeset/config.json

```json
{
  "$schema": "https://unpkg.com/@changesets/config@4.0.1/schema.json",
  "changelog": ["@changesets/changelog-github", { "repo": "ShenganLee/easy-code" }],
  "commit": false,
  "fixed": [["@shengan/easy-code-core", "@shengan/easy-code-cli"]],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "privatePackages": { "version": false, "tag": false },
  "format": false,
  "bumpVersionsWithWorkspaceProtocolOnly": true
}
```

### .github/workflows/ci.yml

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
  merge_group:
permissions: { contents: read }
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with: { fetch-depth: 0, persist-credentials: false }
      - uses: pnpm/setup@v3
        with: { runtime: node@24, cache: true, install: false }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec biome ci .
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm test
      - run: pnpm test:types
      - run: pnpm check:treeshake
      - run: pnpm check:size
      - run: pnpm check:pack
      - name: Changeset status
        if: github.event_name == 'pull_request' && !startsWith(github.head_ref, 'changeset-release/')
        run: pnpm exec changeset status --since=origin/main

  test:
    strategy:
      fail-fast: false
      matrix:
        node: ["22.23.4", "24", "26"]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: pnpm/setup@v3
        with: { runtime: "node@${{ matrix.node }}", cache: true, install: false }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test
```

### .github/workflows/version.yml

```yaml
name: Version

on:
  push:
    branches: [main]

permissions: {}

concurrency:
  group: version-${{ github.ref }}
  cancel-in-progress: false

jobs:
  version:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: pnpm/setup@v3
        with:
          runtime: node@24
          cache: false
          install: false
      - run: pnpm install --frozen-lockfile
      - id: select-mode
        uses: changesets/action/select-mode@v2
      - if: steps.select-mode.outputs.mode == 'version'
        uses: changesets/action/version@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: pnpm release:version
          pr-title: "chore: version packages"
          commit-message: "chore: version packages"
```

### .github/workflows/release.yml

```yaml
name: Release

on:
  push:
    tags:
      - "v*"
      - "*-v*"

permissions:
  contents: read

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-release
    permissions:
      contents: write
      id-token: write
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: pnpm/setup@v3
        with:
          runtime: node@24
          cache: false
          install: false
      - run: npm install -g npm@11.21.1
      - run: pnpm install --frozen-lockfile
      - name: Resolve release target
        id: target
        shell: bash
        run: |
          set -euo pipefail
          tag="${GITHUB_REF_NAME}"

          if [[ "$tag" =~ ^v(.+)$ ]]; then
            version="${BASH_REMATCH[1]}"
            targets="packages/core packages/cli"
            group="fixed"
          elif [[ "$tag" =~ ^(.+)-v(.+)$ ]]; then
            name="${BASH_REMATCH[1]}"
            version="${BASH_REMATCH[2]}"
            if [[ "$name" == "core" || "$name" == "cli" ]]; then
              echo "::error::core and cli are a fixed group; use a v<version> tag, or remove the fixed group first."
              exit 1
            fi
            targets="packages/${name}"
            group="${name}"
          else
            echo "::error::Unsupported tag format: ${tag}"
            exit 1
          fi

          echo "version=${version}" >> "$GITHUB_OUTPUT"
          echo "targets=${targets}" >> "$GITHUB_OUTPUT"
          echo "group=${group}" >> "$GITHUB_OUTPUT"
      - name: Verify tag matches target package versions
        shell: bash
        env:
          VERSION: ${{ steps.target.outputs.version }}
          TARGETS: ${{ steps.target.outputs.targets }}
        run: |
          set -euo pipefail
          for pkg in $TARGETS; do
            if [ ! -f "${pkg}/package.json" ]; then
              echo "::error::Missing package directory: ${pkg}"
              exit 1
            fi
            actual="$(node -p "require('./${pkg}/package.json').version")"
            if [ "$actual" != "$VERSION" ]; then
              echo "::error::${pkg} version ${actual} does not match tag ${GITHUB_REF_NAME}"
              exit 1
            fi
          done
      - run: pnpm build
      - run: pnpm test
      - run: pnpm check:treeshake
      - run: pnpm check:size
      - name: Publish unpublished versions
        shell: bash
        env:
          VERSION: ${{ steps.target.outputs.version }}
          TARGETS: ${{ steps.target.outputs.targets }}
        run: |
          set -euo pipefail
          dist_tag="latest"
          if [[ "$VERSION" == *-* ]]; then
            dist_tag="next"
          fi
          for pkg in $TARGETS; do
            name="$(node -p "require('./${pkg}/package.json').name")"
            if npm view "${name}@${VERSION}" version --registry=https://registry.npmjs.org/ >/dev/null 2>&1; then
              echo "skip ${name}@${VERSION}: already published"
              continue
            fi
            pnpm --filter "${name}" publish \
              --registry=https://registry.npmjs.org/ \
              --tag "${dist_tag}" \
              --access public \
              --no-git-checks \
              --provenance
          done
      - name: Create GitHub release
        env:
          GH_TOKEN: ${{ github.token }}
          VERSION: ${{ steps.target.outputs.version }}
        shell: bash
        run: |
          set -euo pipefail
          if gh release view "${GITHUB_REF_NAME}" >/dev/null 2>&1; then
            echo "GitHub release ${GITHUB_REF_NAME} already exists"
          else
            prerelease_flag=""
            if [[ "$VERSION" == *-* ]]; then
              prerelease_flag="--prerelease"
            fi
            gh release create "${GITHUB_REF_NAME}" \
              --verify-tag \
              --generate-notes \
              --title "${GITHUB_REF_NAME}" \
              ${prerelease_flag}
          fi
```

Tag mapping:

| Tag                 | Publishes                                      |
| ------------------- | ---------------------------------------------- |
| `v0.1.1`            | `packages/core` + `packages/cli` (fixed group) |
| `kit-v0.3.0`        | `packages/kit` only                            |
| `plugin-foo-v0.1.0` | `packages/plugin-foo` only                     |

See [docs/tag-conventions.md](docs/tag-conventions.md) for the full rules.

> 发布前必须人工完成：为每个包先手动发布一次 0.1.0，再在 npm 包设置里配置 trusted publisher（workflow 填 `release.yml`，environment 填 `npm-release`），并在 2 天内用一个**新版本**（例如 0.1.1）完成首次 OIDC 发布验证。新建 trusted publisher 默认只允许 stage publish，必须显式勾选 npm publish。仓库设置里打开 “Allow GitHub Actions to create and approve pull requests”；environment 的 deployment branches/tags 限制为 `main` 与 `v*`，required reviewer 等有第二个维护者再加。npm 包的 Publishing access 设为 “Require 2FA and disallow tokens”。

## 07 从 PR 到 npm

流程的目标是：功能 PR 只关心代码与 changeset，版本 PR 只关心版本与 changelog，tag 只关心“现在发布哪个版本”，发布作业只关心 OIDC 与 npm。四者权限分离，失败可重试。

```text
01 功能 PR        本地 pnpm check；CI verify；changeset status；可选 pkg.pr.new 预览
      ↓
02 合并 main      version.yml 的 select-mode：有 changeset 就创建/更新 Version PR
      ↓
03 Version PR     changeset version 更新版本、CHANGELOG、锁文件；CI 再跑一遍
      ↓
04 合并 Version PR  版本号与 changelog 落到 main；不再自动发布
      ↓
05 推送 tag      fixed 组：git tag -a v0.1.1；独立包：git tag -a plugin-foo-v0.1.0
      ↓
06 Tag Release    release.yml：解析 tag → 只校验/发布目标包；build；pnpm publish（OIDC）
      ↓
07 GitHub Release  gh release create <tag> --generate-notes
```

### 发布检查清单

- **命名与 scope：** npm org 已注册；`@shengan/easy-code-core`、`@shengan/easy-code-cli` 可写；`repository.url` 精确匹配 GitHub 仓库。README/文档只写 `npx @shengan/easy-code-cli`，全仓库不得出现 `npx easy-code`。
- **bin 冲突：** `easy-code-cli` 已声明 `easy-code` 与 `easycode`；本地安装通常按项目解析，全局安装可能互相覆盖。发布前决定用 `easy-code` 还是更独特的 `ec`/`ezc`。
- **首次发布：** 每个包手动 `pnpm publish --registry=https://registry.npmjs.org/ --access public --no-git-checks` 一次；随后配置 trusted publisher；2 天内用一个新版本完成 OIDC 首次发布。
- **tag 与版本：** fixed 组用 `v<version>`，独立包用 `<dir>-v<version>`；tag 必须等于目标包版本；fixed 组所有包版本一致；不移动或复用 tag，失败就发新 patch。完整约定见 `docs/tag-conventions.md`。
- **权限：** `version.yml` 只有 `contents: write` + `pull-requests: write`；`release.yml` 的 publish 作业才有 `id-token: write`；无 `NPM_TOKEN` / `NODE_AUTH_TOKEN`；npm 包 Publishing access 设为 “Require 2FA and disallow tokens”。
- **npm 版本：** publish 作业安装 `npm@11.21.1`；Node 24 runner；GitHub 托管 runner，不用 self-hosted。
- **workflow 文件名：** npm trusted publisher 里填 `release.yml`，大小写与路径完全一致；environment 填 `npm-release`；新建 trusted publisher 要显式允许 npm publish，不能停在 stage-only。
- **第三方 Action：** checkout/setup/changesets 等 Action 固定到 SHA 或至少固定 major；发布 job 不跑 PR 代码。
- **版本 PR：** CI 跳过 `changeset-release/*` 的 changeset status；版本 PR 仍然跑 build/test。
- **非发布改动：** docs/CI/tooling PR 用 `changeset --empty`，明确“无发布”。
- **回滚：** 坏版本用 `npm deprecate`；latest 指回旧版用 `npm dist-tag add`；不删除已发布版本；OIDC 不支持 unpublish。

## 08 落地路线

按“能发布”而不是“功能齐全”切阶段。每个阶段都有明确的退出条件，避免基础设施无限膨胀。

| 阶段    | 时间      | 交付                                                                                                                                                                                                                                                          | 退出条件                                                                   |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Phase 0 | 第 1 周   | 注册 npm org，确认 scope；core + cli 两个包；`.node-version`、根配置、CI、Changesets、OIDC；一个真实命令 + 一个真实库 API；P0 开源文件 + `RELEASING.md`；README 快速开始；发布 0.1.0                                                                          | 4 周内至少一条用户可用的 CLI 命令；完成一次完整 release，OIDC 首次发布成功 |
| Phase 1 | 第 2–4 周 | e2e 覆盖 CLI 主路径；public API 类型测试（`*.test-d.ts`）；树摇 marker + 体积预算 + `verify:pack` 安装冒烟；Starlight 文档站；CodeQL、dependency-review、Renovate、pkg.pr.new；dependency-cruiser/knip/sherif；第二个消费者出现则抽取 kit；macOS/Windows 冒烟 | 文档站上线；CI 跨平台冒烟稳定两周                                          |
| Phase 2 | 第 2–3 月 | 第二个工具落地后再设计插件协议与 plugin 包；API 冻结，准备 1.0；版本化文档；GOVERNANCE / ROADMAP / SUPPORT 按需补                                                                                                                                             | 有第二个工具或外部贡献者；否则保持小规模                                   |

### 验收标准

- 干净克隆下 `pnpm install && pnpm check` 在 Node 22.23.4 / 24 / 26 通过。
- `pnpm build` 只产出 ESM + d.ts；`publint` 与 `attw --profile esm-only` 无错误。
- marker 测试证明导入单个符号不会带入未使用模块；体积回归不超过预算 10%。
- `pnpm pack --dry-run` 的 tarball 只含 dist、README、LICENSE、package.json；tarball 里的 package.json 不含 `workspace:` / `catalog:`。
- `npx @shengan/easy-code-cli --version` 在干净目录成功；全仓库 `rg "npx easy-code"` 无结果。
- CLI 在 macOS / Linux / Windows 上 `--help` 与主命令退出码正确；未知命令退出码 2。
- `version.yml` 能从 changeset 创建 Version PR；合并后不自动发布。
- 推送 `v*` tag 只发布 core+cli；推送 `<dir>-v*` tag 只发布对应独立包；两者都校验版本、构建、用 OIDC 发布未发布版本，并创建 GitHub Release；OIDC 首次发布成功；`dist.attestations` 非空；重跑不重复发布。
- 没有 workflow 持有长期 npm token；SECURITY.md 指明私密漏洞报告渠道；npm Publishing access 为 disallow tokens。

## 09 风险与 kill criteria

这套方案的最大风险不是技术选型，而是维护成本超过产品价值。下面每条风险都绑定一个可观察的触发条件。

| 风险                    | 概率 / 影响 | 缓解                                                                                                               | 触发回退                                                                                               |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| npm scope 注册不到      | 中 / 高     | 已定 `@shengan/easy-code-*`；写代码前在 npm 登录态确认 `@shengan` org 可写，包名当前未被占用。                     | 若 org 实际不可用，立即回到用户确认改名，避免代码写完才发现。                                          |
| TypeScript 7 + dts beta | 中 / 中     | 避开 TS API 工具；`dts: { generator: 'oxc' }`；精确锁 7.0.2 与 tsdown 0.23.2。                                     | d.ts 被 oxc/rolldown-plugin-dts beta 阻塞超过 2 天，临时用 TS 6.0.3 生成声明，或整体回退 TS 6 兼容线。 |
| 版本组锁步              | 中 / 低     | core + cli fixed 组，减少兼容矩阵。                                                                                | core 的 patch 频繁强迫 cli 发版，或两包节奏明显分化，改 independent + peerDependencies。               |
| Node/Jest CJS 兼容      | 中 / 中     | 文档写清只支持 Node 22.23.4+；ESM-only + `default` 条件；禁止 TLA；提供 `npx @shengan/easy-code-cli` 的 ESM 用法。 | 同一 CJS/Jest 场景出现 3 个以上独立 issue，为对应包加 `require` 入口或 CJS 构建。                      |
| Biome 类型规则不足      | 高 / 低     | tsc 作为类型真相；Biome 只做快速 lint/format；不把 nursery 当门禁。                                                | 出现 Biome 漏掉且测试也漏掉的真实缺陷，评估 oxlint 类型感知模式。                                      |
| tsdown 0.x 行为变化     | 中 / 中     | 精确锁版本；升级前跑完整 `pnpm check`；publint/attw/树摇门禁。                                                     | 连续两个版本出现构建回归，评估 tsup 9 或 unbuild 3 作为临时替代。                                      |
| ESM-only 用户反弹       | 中 / 中     | Node 22.23.4+ 的 `require(esm)` 兜底；文档写清支持范围；CJS 需求按 issue 评估。                                    | 同一 CJS 场景出现 3 个以上独立 issue，为对应包加 `require` 入口，不做全量 dual。                       |
| pnpm 12 回归            | 低 / 中     | 锁 `packageManager`；CI 冻结锁文件；本地与 CI 同版本。                                                             | 安装或发布被阻塞，回退 pnpm 11.28.8；锁文件格式兼容，不阻塞发布。                                      |
| OIDC 发布失败           | 中 / 高     | 发布检查清单；首次人工发布；workflow 文件名与 environment 精确匹配；npm 11.21.1。                                  | 连续两次失败，临时用维护者本机 `npm publish` 发补丁，同时修 workflow；不引入长期 token。               |
| 单人维护倦怠            | 高 / 高     | v0 只做两个包；治理延后；发布自动化；每季度清理一次工具链。                                                        | 每月发布维护超过 30 分钟，或每周投入超过 8 小时，砍掉 docs/跨 OS/插件计划。                            |
| 树摇回归                | 中 / 中     | marker + 体积预算 + pack 冒烟；CI 阻塞合并。                                                                       | 连续两次回归，暂停新功能，先修包边界与副作用。                                                         |
| 供应链攻击              | 低 / 高     | `minimumReleaseAge`、`trustPolicy`、冻结锁文件、Renovate、CodeQL、dependency-review、OIDC provenance。             | 发现可疑版本，立即 pin 回旧版并审计 lockfile；必要时发布安全公告。                                     |

**Kill criteria：** 4 周内没有一条用户可用的 CLI 命令；6 个月没有外部用户；发布流程每月超过 30 分钟或超过 2 个手动步骤；Version PR 连续两次卡住超过 1 周；连续两次发布失败；树摇回归两次；一季度两次工具链升级各耗超过 1 天；两包被迫锁步发版；维护时间每周超过 8 小时。出现任意两条，就回到“一个 CLI + 一个 core（内部目录）”的最小形态，删掉所有不影响发布的基础设施。

## 参考

- [tsdown · How it works](https://tsdown.dev/guide/how-it-works)
- [pnpm · Catalogs](https://pnpm.io/catalogs)
- [pnpm · Supply chain security](https://pnpm.io/supply-chain-security)
- [Changesets v3](https://changesets.dev/blog/announcing-changesets-v3)
- [Changesets · Automating](https://changesets.dev/guide/automating)
- [npm · Trusted publishing](https://docs.npmjs.com/trusted-publishers)
- [npm · 2FA](https://docs.npmjs.com/about-two-factor-authentication)
- [pnpm/setup](https://github.com/pnpm/setup)
- [pkg.pr.new](https://github.com/stackblitz-labs/pkg.pr.new)
- [Biome](https://biomejs.dev/)
- [Turborepo](https://turborepo.com/)
- [Starlight](https://starlight.astro.build/)
- [Contributor Covenant 3.0](https://www.contributor-covenant.org/version/3/0/code_of_conduct/)
