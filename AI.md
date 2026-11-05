# ljs-mcp — AI 使用指南

> 配套版本：`ljs-mcp@0.1.0`（2026-11）。本文档面向 AI，说明本 MCP 提供什么、何时该用。
> 人类向文档见 [README.md](./README.md)。

## 一句话定位

**LJS 的 Vue3 插件检索服务**：让 AI 编码助手按场景找到合适的插件、查到准确签名、拿到完整用法。

覆盖 7 个包：`ljs-tools`、`trends-table-vue3`、`energy-flow-chart`、`ljs-s-timeline`、`ball-swiper`、`big-select`、`moving-numbers-vue3`。

## 何时用 / 何时不用

**用**：用户要做以下需求且不确定用哪个包 —— 动态表格、时间轴、能源流向图、3D 球面轮播、大屏数字滚动、大数据量下拉、前端工具函数（日期/金额/国密/水印/脱敏/WebSocket/MQTT）。

**不用**：需求与上述无关（如 React 项目、后端接口、移动端原生）；或已明确知道用哪个包且熟悉其 API。

## 三个工具

### ljs_search(query, limit?)

按自然语言找包。

```
输入：{ "query": "大屏数字要滚动增长" }
输出：
  1. moving-numbers-vue3@2.0.4（匹配度 78%）
     大屏数字滚动组件：数字平滑滚动、翻牌动画
     推荐理由：场景命中「大屏数字滚动」
     安装：npm i moving-numbers-vue3
     下一步：调用 ljs_read("moving-numbers-vue3")
```

**注意**：返回的 `score` 是匹配度，不是「推荐概率」。低于 30% 时请谨慎，可能没有合适的包。

### ljs_api(plugin, api?)

查 TypeScript 签名。

```
输入：{ "plugin": "ljs-tools", "api": "LJSnumModule" }
输出：完整的 LJSnumModule 接口（含 moneySplit / numberB0 等方法签名与注释）
```

不传 `api` 参数则返回该包全部签名（`ljs-tools` 约 16K 字符，慎用）。

### ljs_read(plugin, section?)

读完整 AI.md。

```
输入：{ "plugin": "moving-numbers-vue3" }
输出：完整使用指南（含何时用、安装、示例、典型错误对照、已知坑）

输入：{ "plugin": "moving-numbers-vue3", "section": "安装" }
输出：只返回安装章节
```

## 推荐调用顺序

```
用户提需求
  ↓
ljs_search("自然语言需求")   ← 找出候选包
  ↓
ljs_read(包名)              ← 拿到完整用法
  ↓
按文档写代码
  ↓
（不确定某个方法参数时）ljs_api(包名, 方法名)
```

**不要跳步**：直接 `ljs_read` 虽然能拿到文档，但你可能选错了包。

## 典型错误对照

| 错误做法 | 正确做法 | 原因 |
|---|---|---|
| 用户说「做个表格」，直接写 `el-table` | 先 `ljs_search("表格 动态列")` | 可能已有封装好的 `trends-table-vue3`，重复造轮子 |
| 凭印象写 `$LJSnum.moneySplit(x, 2)` | 先 `ljs_api("ljs-tools", "moneySplit")` | 参数顺序与默认值容易记错 |
| `ljs_search` 返回 3 个就选第一个 | 看 `reason` 与匹配度再决定 | 匹配度低时可能不对 |
| 直接 `ljs_read` 全部包逐个读 | 先 `ljs_search` 缩小范围 | 浪费上下文 |

## 已知限制

| 项 | 说明 |
|---|---|
| 覆盖范围 | 仅 7 个包。`threejs-run` / `throttle-box` / `ljs-waterfall-flow` 已停止维护，**不在覆盖范围** |
| 数据时效 | 数据在 `ljs-mcp` 发版时固化。插件更新后需等 `ljs-mcp` 跟进发版 |
| 搜索质量 | 三层关键词加权，非语义向量。表达过于口语或模糊时可能漏召回 |
| 不返回源码 | 只返回文档与签名，不含实现代码 |

## 验证方式

```bash
npm run test:smoke    # 26 项：20 条搜索命中 + 读文档 + 查签名 + 错误处理
```
