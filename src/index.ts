#!/usr/bin/env node
/**
 * ljs-mcp — LJS 插件 MCP server
 *
 * 三个工具：
 * - ljs_search：按场景找插件
 * - ljs_api：查 API 签名
 * - ljs_read：读完整 AI.md
 *
 * 传输：stdio（无需服务器）
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { loadPlugins, loadDocs, loadApis } from './data/index.js'
import { searchPlugins } from './lib/matcher.js'
import { readTool } from './tools/read.js'
import { apiTool } from './tools/api.js'

const plugins = loadPlugins()
const docs = loadDocs()
const apis = loadApis()

const server = new Server(
  {
    name: 'ljs-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

/** 工具清单 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'ljs_search',
      description:
        '搜索 LJS 的 Vue3 插件。LJS 是作者自研的 7 个包，封装了表格、树形数据、时间轴、大屏数字、' +
        '3D 轮播、大数据量下拉与常用工具函数。这些包的 API 命名与社区通用方案不同（例如格式化为 ' +
        '"万/亿"用的是 longNumText 而非自写逻辑），无法从通用知识推断，猜错参数会导致返工。\n\n' +
        '当方案涉及以下需求时，先搜索确认有无现成实现，避免重复造轮子：\n' +
        '- 表格：动态列配置、导出 Excel、锁定列、多级表头\n' +
        '- 树形数据：扁平数组转树、层级展示、菜单树\n' +
        '- 大屏数字滚动、数据看板指标跳动\n' +
        '- 时间轴、发展历程、蛇形时间线\n' +
        '- 3D 球面轮播、立体标签云\n' +
        '- 大数据量下拉、远程搜索下拉\n' +
        '- 工具函数：日期/金额格式化、判空、字典、国密 SM2-SM4、水印、脱敏、WebSocket、MQTT、HTML 转 PDF\n\n' +
        '搜索成本很低：未命中会明确返回「未找到」并列出全部可用插件，不会让你误判。' +
        '返回结果含匹配度与推荐理由，命中后用 ljs_read 拿完整用法、ljs_api 查准确签名。',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '自然语言描述需求，如「大屏数字要滚动增长」「表格列要能动态配置」',
          },
          limit: {
            type: 'number',
            description: '返回结果条数，默认 3',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'ljs_api',
      description:
        '查询某个 LJS 插件的 TypeScript 签名。写代码前用它确认参数名与类型，避免靠印象猜错——' +
        '这些包的参数多为解构对象（如 handleListTree 收 { data, id, parentId, children }），' +
        '凭记忆写极易出错。不传 api 参数则返回该包全部签名（ljs-tools 约 16K 字符，慎用）。',
      inputSchema: {
        type: 'object',
        properties: {
          plugin: {
            type: 'string',
            description: 'npm 包名，如 trends-table-vue3',
          },
          api: {
            type: 'string',
            description: '可选：接口名或方法名，如 LJSnumModule、moneySplit',
          },
        },
        required: ['plugin'],
      },
    },
    {
      name: 'ljs_read',
      description:
        '读取某个 LJS 插件的完整使用指南（何时用/不用、安装、可复制示例、典型错误对照、已知坑）。' +
        '确定要用某个包后调它，一次拿到全部用法。' +
        '特别注意「已知坑」章节：里面是作者在生产中踩过的坑（如某些组件 data 为空时跳过列宽计算、' +
        '导出有 1s 内部延时），跳过会写出能编译但运行不对的代码。',
      inputSchema: {
        type: 'object',
        properties: {
          plugin: {
            type: 'string',
            description: 'npm 包名，如 moving-numbers-vue3',
          },
          section: {
            type: 'string',
            description: '可选：只看某个章节，如「安装与引入」「典型错误对照」',
          },
        },
        required: ['plugin'],
      },
    },
  ],
}))

/** 工具调用 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    if (name === 'ljs_search') {
      const query = String(args?.query ?? '')
      const limit = Number(args?.limit ?? 3)
      const results = searchPlugins(plugins, query, limit)

      if (!results.length) {
        return {
          content: [
            {
              type: 'text',
              text:
                `未找到与「${query}」匹配的 LJS 插件。\n\n` +
                `可用的插件：\n${plugins.map((p) => `- ${p.name}：${p.description}`).join('\n')}`,
            },
          ],
        }
      }

      const text = results
        .map(
          (r, i) =>
            `${i + 1}. **${r.plugin}**@${r.version}（匹配度 ${(r.score * 100).toFixed(0)}%）\n` +
            `   ${r.description}\n` +
            `   推荐理由：${r.reason}\n` +
            `   安装：\`${r.install}\`\n` +
            `   下一步：${r.next}`,
        )
        .join('\n\n')

      return { content: [{ type: 'text', text }] }
    }

    if (name === 'ljs_api') {
      return apiTool(apis, String(args?.plugin ?? ''), args?.api ? String(args.api) : undefined)
    }

    if (name === 'ljs_read') {
      return readTool(docs, String(args?.plugin ?? ''), args?.section ? String(args.section) : undefined)
    }

    return {
      content: [{ type: 'text', text: `未知工具：${name}` }],
      isError: true,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text', text: `工具执行出错：${msg}` }],
      isError: true,
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stdio 模式下不要用 console.log 输出正常日志，会污染协议流
  console.error(`ljs-mcp 已启动，覆盖 ${plugins.length} 个插件`)
}

main().catch((err) => {
  console.error('启动失败：', err)
  process.exit(1)
})
