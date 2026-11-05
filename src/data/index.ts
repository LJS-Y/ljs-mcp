/**
 * 内嵌数据加载
 *
 * 数据由 scripts/build-data.mjs 在构建时生成到 generated/ 目录，
 * 随 npm 包一起发布，运行时不依赖网络与 node_modules。
 */

import { createRequire } from 'node:module'
import type { PluginEntry } from '../types.js'

const require = createRequire(import.meta.url)

/** 读取插件条目 */
export function loadPlugins(): PluginEntry[] {
  const raw = require('./generated/packages.json') as Array<Omit<PluginEntry, 'aiDoc' | 'apiDoc'>>
  return raw as unknown as PluginEntry[]
}

/** 读取 AI.md 全文表：包名 → markdown */
export function loadDocs(): Record<string, string> {
  return require('./generated/docs.json') as Record<string, string>
}

/** 读取 API 签名表：包名 → d.ts 摘要 */
export function loadApis(): Record<string, string> {
  return require('./generated/apis.json') as Record<string, string>
}
