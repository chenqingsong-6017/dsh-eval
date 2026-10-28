# dsh-eval

[![task-selftest](https://github.com/chenqingsong-6017/dsh-eval/actions/workflows/selftest.yml/badge.svg)](https://github.com/chenqingsong-6017/dsh-eval/actions/workflows/selftest.yml)

> 一个**能自证、能查污染**的本地编码 agent 评测套件。
> 给那些在公开榜上查不到成绩、又不想只靠"模型说它通过了"的 harness 用。

公开榜（Next.js Agent Evals、Terminal-Bench 4.0 等）由对方跑他们自己的 harness 与任务集，想拿到自己的数字得等对方支持。而自评几乎不可信：模型的"测试通过"不是测试通过。

这个套件把评测里真正难的三个环节做成了可复算的代码：

| 环节 | 做法 |
|---|---|
| **判定** | 只看 `check.mjs` 的退出码、stdout/stderr 逐字节、结构约束——不读模型自述 |
| **任务本身对不对** | `selftest`：每个任务必须「只有 seed 时 FAIL、seed + 参考解时 PASS」，8/8 才算任务可用 |
| **环境干不干净** | `audit`：跑完逐文件对比 seed，**凡超出 `src/` 的改动一律记为污染** |

第四条是成本：`tokens.mjs` 从 harness 的跨会话用量台账按 session 归属，不做摊派。

---

## 已测结果（2026-10-29）

环境：DeepSeek Harness `0.2.1-rc.3`，模型 `deepseek-flash`，8 个任务、12 次有效运行。

| 条件 | 通过 | 通过率 | 平均 token |
|---|---|---|---|
| `plain`（仓库里没有规则文件） | 5/6 | **83%** | **391.9K** |
| `with-md`（仓库根有 `AGENTS.md`） | 6/6 | **100%** | **451.3K** |

三条结论：

1. **规则文件换通过率，也换 token**：+20pt 通过率，代价 +15% token（缓存读占成本大头，规则文件进缓存后每轮只按缓存读计）。
2. **加难度没把通过率打下来**：跨文件、隐式依赖、重构三个"更硬"的任务两条件全过。真正的区分度来自「**不可从代码推断的约定**」，不是任务难度本身。
3. **唯一的失败是措辞**：`plain` 下 agent 的行为猜对了（未知标志 → stderr + exit 2），只错在 `error: unknown option '--bogus'` vs 约定的 `unknown flag: --bogus`。

细节与逐条数据见 [RESULTS.md](RESULTS.md)；单 agent / Agent Teams / workflow 三路耗时对照见 [COMPARE.md](COMPARE.md)。

---

## 快速开始

```bash
node harness.mjs selftest                 # 先验任务：8/8 必须过，否则别信任何数字
node harness.mjs list                     # 列出任务
node harness.mjs prepare fix-discount plain
#   ↑ 打印一个运行目录：已复制 seed、注入最小 package.json、建好 git 基线
# 在该目录里跑你要评测的 agent，让它完成 prompt.md
node harness.mjs check fix-discount <运行目录>   # 判分 + 污染审计 + 落 results.jsonl
node harness.mjs audit fix-discount <运行目录>   # 只看污染
node report.mjs                           # 出成绩单（同任务同条件只取最新一次）
```

token 记账（可选，需要 `dsh-usage` 插件生成的台账）：

```bash
DSH_USAGE_STORE=/path/to/usage.json node tokens.mjs --map token-map.json
```

`token-map.json` 把 session 前缀映射到运行标签，缺省则只列 session：

```json
{ "1b3b9b00": "fix-discount / plain", "2c9d3a73": "fix-discount / with-md" }
```

---

## 任务格式

```
tasks/<task-id>/
├── prompt.md      # 给 agent 的题面（评测时原样喂进去）
├── seed/          # 初始仓库（复制进运行目录）
├── check.mjs      # 自动检查器，参数是运行目录，退出码即判定
├── solution/      # 参考解，selftest 用它验证「检查器能判对」
└── AGENTS.md      # 可选的规则文件（with-md 条件才会注入）
```

`check.mjs` 可以只跑 `node --test`，也可以加结构断言——比如 `implicit-dependency` 会检查是否 `import` 了现成 helper、`refactor-dedupe` 会检查 `toFixed(2)` 是否真的消失。

两种条件：

- `plain`：不给规则文件，作为对照；
- `with-md`：把 `AGENTS.md` 放到仓库根，测「规则文件到底改变了什么」。

---

## 三个设计决策（为什么不是又一个 benchmark）

**1. 任务自检优先于跑模型。**
任务写错会让结论完全反向。`selftest` 用「桩必须 FAIL、参考解必须 PASS」卡住这件事——没有这道自检，后面所有数字都不值得看。

**2. 污染可查 > 假装隔离。**
真实事故：某个 agent 发现目录里没有 `package.json`、`npm run check` 跑不起来，于是**自己补了一个**——那是宿主验证门的要求，跟任务无关。
所以 `prepare` 会预置最小 `package.json` 并在 `meta.json` 里记下"这是注入的"，`audit` 再把超出 `src/` 的改动全部标出来。**测得出来的污染，好过假设它不存在。**

**3. token 用台账，不摊派。**
从 harness 的跨会话用量台账按 session 归属；归不到的（例如 workflow 派生的子会话）就标"未采集"，不猜、不按人数均摊。

---

## 它不测什么

- 不测模型强弱（两条件同一模型）；
- 不测长任务（30 分钟以上）、跨仓库改造；
- 不测代码品味、可维护性、架构；
- 不是排行榜：8 个任务、12 次运行，**只能看方向**。

## 附：进程级隔离的失败记录

想跑真正的进程级隔离（`dsh --profile headless "<任务>"`），两次都失败，记录在此以免重复踩：

1. headless 模板走 API key 认证：`MISSING_CREDENTIAL: no API key for provider route "deepseek-official"`；
2. 用 `--from-default-profile headless` 派生评测 profile，打开 `credentials`/`authorization`/`deepseek-account`/`llm-deepseek-account`/`typert*` 网关行、关掉 api-key 行后，仍然 `NO_ADAPTER: no adapter registered for provider "deepseek-official"`。

结论：要做进程级隔离，要么给评测机配 `DEEPSEEK_API_KEY`，要么上游给 headless 形态补账号 adapter。在那之前，评测只能跑在 in-process subagent 上，靠 `audit` 兜底。

## License

MIT
