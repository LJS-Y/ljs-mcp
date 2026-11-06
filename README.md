# ljs-mcp

把 LJS 的 7 个 Vue3 插件的用法与签名，做成 AI 编码助手可查询的 MCP 服务。一条命令接进 Cursor / Claude Code / CodeBuddy / VSCode Copilot。

> 解决的问题：AI 不知道你写了什么插件、参数怎么传、该用哪个。
> 接上这个 MCP，问一句就能拿到精确答案 —— 不用翻 README，也不用让 AI 猜。

**关于「AI 会不会主动调用」**：实测结果表明，AI 只在「觉得自己可能写不好」时才会查工具；
日常需求（如「扁平数组转树」）它会直接手写，不查 MCP。要让 AI 稳定使用，需要在项目
`AGENTS.md` 里加一条强制引导（见下文「让 AI 稳定调用」）。

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

## 让 AI 稳定调用（实测有效）

**实测发现**：AI 只在「觉得自己可能写不好」时才查工具。像「扁平数组转树」这类它自认为会写的需求，
会直接手写，完全不看 MCP —— 换 `claude-opus-4-7` 也是如此。

**唯一稳定有效的办法**：在项目 `AGENTS.md`（或 `CLAUDE.md`）里写硬性要求。
`AGENTS.md` 是项目级强制注入，AI 必须读；MCP 只是可选工具，AI 可以不理。

把下面这段加进项目 `AGENTS.md`：

```markdown
## 写页面前必须先查 MCP

本项目使用 ljs-tools 插件生态（含表格、树形数据、时间轴、大屏数字、国密、
水印、脱敏等能力）。涉及以下需求时，必须先调用 ljs_search（MCP 已配置）
确认有无现成实现，禁止直接手写：

- 表格：动态列配置、导出 Excel、锁定列、多级表头
- 树形数据：扁平数组转树、层级展示、菜单树
- 大屏数字滚动、数据看板指标跳动
- 时间轴、发展历程、蛇形时间线
- 3D 球面轮播、立体标签云
- 大数据量下拉、远程搜索下拉
- 工具函数：日期/金额格式化、判空、字典、国密 SM2-SM4、水印、脱敏、WebSocket、MQTT

理由：这些能力 ljs-tools 已封装，手写会重复实现且参数易错。
```

**验证方法**：写进 `AGENTS.md` 后，用同一句自然语言提问，看对话里 MCP 调用次数是否从 0 变成 >0。

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
