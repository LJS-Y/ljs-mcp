# ljs-mcp

让 AI 编码助手**认出并使用** LJS 的 Vue3 插件。一条命令接进 Cursor / Claude Code / CodeBuddy / VSCode Copilot。

> 解决的问题：AI 不知道你写了什么插件、参数怎么传、该用哪个。这个 MCP 让它自己查。

---

## 覆盖的 7 个插件

| 插件 | 能力 |
|---|---|
| `ljs-tools` | 前端工具库与常用组件全家桶：日期 / 数字 / 判空 / 字典 / 树 / 表单校验 / **国密 SM2-SM4** / 水印 / 脱敏 / WebSocket / MQTT / HTML 转 PDF |
| `trends-table-vue3` | 动态表格：动态列 / 锁定列 / 列宽计算 / 二级表头 / 表头显隐 / 导出 Excel |
| `energy-flow-chart` | 能源流向图（树形数据可视化） |
| `ljs-s-timeline` | 蛇形（S 形）时间轴 |
| `ball-swiper` | 球面 3D 轮播 |
| `big-select` | 大数据量下拉优化 |
| `moving-numbers-vue3` | 大屏数字滚动 |

---

## 三个工具

| 工具 | 用途 | 典型触发 |
|---|---|---|
| `ljs_search` | 按场景找插件，返回匹配度和**推荐理由** | 「大屏数字要滚动」「表格列要能配」 |
| `ljs_api` | 查 TypeScript 签名 | 「`moneySplit` 参数是什么」 |
| `ljs_read` | 读完整使用指南（何时用 / 安装 / 示例 / 常见坑） | 「这个包怎么用」 |

**推荐调用顺序**：`ljs_search` → `ljs_read` → 写代码。不确定某个方法时再 `ljs_api`。

---

## 接入方式

### Claude Code

```bash
claude mcp add ljs -- npx -y ljs-mcp
```

或手动编辑 `~/.claude.json`：

```json
{
  "mcpServers": {
    "ljs": {
      "command": "npx",
      "args": ["-y", "ljs-mcp"]
    }
  }
}
```

### Cursor

编辑 `~/.cursor/mcp.json`（全局）或项目内 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "ljs": {
      "command": "npx",
      "args": ["-y", "ljs-mcp"]
    }
  }
}
```

### CodeBuddy / VSCode Copilot

凡是支持 MCP 的客户端，配置都是同一段：

```json
{
  "mcpServers": {
    "ljs": {
      "command": "npx",
      "args": ["-y", "ljs-mcp"]
    }
  }
}
```

### Codex CLI

编辑 `~/.codex/config.toml`：

```toml
[mcp_servers.ljs]
command = "npx"
args = ["-y", "ljs-mcp"]
```

---

## 本地调试

```bash
git clone https://github.com/LJS-Y/ljs-mcp.git
cd ljs-mcp
npm install

# 从插件工程重新抽取数据（需要本地存在 7 个插件仓库）
npm run build:data

npm run build
npm run test:smoke    # 26 项冒烟测试
```

`npm run build:data` 依赖本地路径（见 `scripts/build-data.mjs` 的 `SOURCES`）。
如果你只是使用者，不需要这一步 —— npm 包里已带好数据。

## 维护者：改了插件文档后

数据是构建时固化的。插件的 `AI.md` / `index.d.ts` / 版本号变了，必须重建并重发 npm：

```bash
npm run check:sync      # ① 检查是否不同步（有差异退出码 1）
npm run sync:data       # ② 自动重建数据
npm run release:check   # ③ 发布前全流程：同步检查 + 构建 + 26 项测试
npm version patch       # ④ 升版本
npm publish             # ⑤ 发布
```

**不做这一步的后果**：AI 读到的是过期文档，静默失效、不报错。

---

## 设计说明

**为什么数据是内嵌的？**
构建时把 7 个包的 `AI.md` / `index.d.ts` 抽出来打进包里。这样 `npx ljs-mcp` 无需联网、无需先装那些插件，离线可用。

**为什么搜索不用向量库？**
三层加权打分（场景标签 0.6 / keywords 0.3 / 描述 0.1）已经够用，且零依赖、启动快、结果可解释。向量库会带来模型下载和首屏延迟。

**为什么每次返回「推荐理由」？**
AI 需要知道为什么推荐，才会信任并使用。没有理由的结果，AI 容易忽略。

---

## 相关仓库

| 仓库 | 说明 |
|---|---|
| [ljs-tools](https://github.com/LJS-Y/LJSTools) | 工具库与组件 |
| [ljs-vue3](https://github.com/LJS-Y/ljs-vue3) | Web 中后台框架 |
| [ljs-mini-program](https://github.com/LJS-Y/ljs-mini-program) | 小程序框架 |
| [create-ljs](https://github.com/LJS-Y/create-ljs) | 脚手架 |
| 10 个独立 npm 插件 | [npm @9mountain](https://www.npmjs.com/~9mountain) |

---

## License

MIT
