# 任务：配置加载器（多文件）

`src/config.mjs` 的 `loadConfig` 是桩。它需要把 `data/default.json` 的默认值和进程环境变量合并。

规格以 `test/config.test.mjs` 为准：环境变量 `APP_PORT` → `port`（数字）、`APP_HOST` → `host`、`APP_DEBUG` → `debug`（布尔，`'true'`/`'1'` 为真）。

要求：

1. 让 `node --test` 全部通过。
2. 不要改测试文件，也不要改 `data/default.json`。
3. 读默认文件请用相对模块自身的路径（`import.meta.url`），不要写死绝对路径。
4. 做完自己跑一遍测试，把真实输出贴进回答。

回答保持简短。
