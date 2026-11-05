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
        '按业务场景搜索 LJS 的 Vue3 插件（动态表格、蛇形时间轴、大屏数字滚动、能源流向图、球面轮播、大数据量下拉、前端工具库等）。当用户提到这些需求但不确定用哪个包时，先调用本工具。',
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
        '查询某个 LJS 插件的 TypeScript API 签名。已知包名、需要确认某个方法/组件的参数类型时使用。不传 api 参数则返回该包全部签名。',
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
        '读取某个 LJS 插件的完整 AI 使用指南（何时用、安装、示例、常见错误、已知坑）。确定要用某个包后调用本工具，可一次性拿到全部用法。',
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
