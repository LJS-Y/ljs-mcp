/**
 * 构建后把生成的 JSON 数据复制到 dist 目录
 * （tsc 不处理 .json，需单独拷贝）
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src', 'data', 'generated')
const DEST = path.join(ROOT, 'dist', 'data', 'generated')

if (!fs.existsSync(SRC)) {
  console.error('❌ 未找到生成的数据，请先运行 npm run build:data')
  process.exit(1)
}

fs.mkdirSync(DEST, { recursive: true })

for (const f of fs.readdirSync(SRC)) {
  fs.copyFileSync(path.join(SRC, f), path.join(DEST, f))
  console.log(`   复制 ${f}`)
}

console.log('✅ 数据复制完成')
