# 结果明细（2026-10-29）

环境：DeepSeek Harness `0.2.1-rc.3`，模型 `deepseek-flash`。
样本：8 个任务；实际跑真实 agent 的 6 个任务 × 2 条件 = 12 次有效运行。

## 通过率与成本

| 条件 | 通过 | 通过率 | 中位耗时（仅串行样本） | 平均 token |
|---|---|---|---|---|
| `plain` | 5/6 | **83%** | 46.7s | **391.9K** |
| `with-md` | 6/6 | **100%** | 42.3s | **451.3K** |

## 逐条

| 任务 | plain | with-md |
|---|---|---|
| `fix-discount` | ✅ 46.7s | ✅ 30.9s |
| `add-reverse-flag` | ✅ 28.6s | ✅ 42.3s |
| `add-upper-flag` | ❌ 68.0s | ✅ 48.1s |
| `implicit-dependency` | ✅ | ✅ |
| `refactor-dedupe` | ✅ | ✅ |
| `cross-file-cli` | ✅ | ✅ |

> 后三个任务是 6 个 agent 并发跑的，耗时记为「不计时」——那 100 多秒大半是排队等模型。
> `multi-file-config`、`async-ordering` 只做了任务自检，没有跑真实 agent：不为凑数而跑。

## 唯一的失败

`plain` 条件下 agent 的行为其实猜对了：未知标志 → stderr + **exit 2**、stdout 为空。
唯一不一致的是**措辞**：

```
约定（只写在 AGENTS.md 里）：unknown flag: --bogus
实际（agent 按通用惯例）：    error: unknown option '--bogus'
```

检查器逐字节判，所以失败。这不是"检查器苛刻"——**规则文件承载的不是常识，是"这个项目的具体约定"**。

## token 明细

| 运行 | 调用 | 输入 | 输出 | 缓存读 | 合计 |
|---|---|---|---|---|---|
| fix-discount / plain | 5 | 27.2K | 726 | 262.8K | 290.7K |
| fix-discount / with-md | 7 | 6.1K | 1.2K | 409.9K | 417.1K |
| add-reverse-flag / plain | 5 | 4.1K | 1.1K | 284.3K | 289.4K |
| add-reverse-flag / with-md | 10 | 8.1K | 2.3K | 596.2K | 606.7K |
| add-upper-flag / plain | 8 | 6.9K | 5.6K | 489.6K | 502.1K |
| add-upper-flag / with-md | 9 | 5.7K | 2.3K | 522.0K | 530.0K |
| implicit-dependency / plain | 9 | 4.4K | 1.9K | 513.5K | 519.9K |
| implicit-dependency / with-md | 6 | 3.8K | 1.0K | 339.5K | 344.3K |
| refactor-dedupe / plain | 6 | 3.6K | 1.4K | 339.6K | 344.5K |
| refactor-dedupe / with-md | 7 | 4.4K | 1.3K | 398.7K | 404.4K |
| cross-file-cli / plain | 7 | 4.0K | 1.8K | 398.8K | 404.6K |
| cross-file-cli / with-md | 7 | 4.4K | 1.6K | 399.5K | 405.5K |

**成本的大头是缓存读，不是输出**：输出普遍只有 1–5K，缓存读 260–650K。token 几乎全花在"每轮重读上下文"上。

未归因：`workflow` 派生的两个子会话 id 没有逐一记录，标"未采集"，不猜不摊派。

## 污染审计

6 次并发回测：**1 次检出污染**。

```
implicit-dependency / plain → package.json
```

原因：agent 发现目录里没有 `package.json`、`npm run check` 跑不起来，就自己补了一个（宿主验证门的要求，与任务无关）。其余 5 次改动全部落在 `src/` 内。

## 复算

```bash
node harness.mjs selftest
node harness.mjs list
node harness.mjs prepare <taskId> plain|with-md
# 在该目录里跑 agent 完成 prompt.md
node harness.mjs check <taskId> <运行目录>
node report.mjs
```

## 局限

- n 小（12 次），只能看方向；
- 短任务，不覆盖长任务与多文件大规模改造；
- 环境为目录级隔离 + 事后审计，**不是进程/容器级隔离**（见 README 附录的失败记录）；
- 第三方复算需要在干净机器上按上面的命令重跑。
