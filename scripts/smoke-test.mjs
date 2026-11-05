/**
 * 冒烟测试：直接用 MCP 协议向 stdio 服务发请求
 *
 * 用 20 个真实场景问题验证 ljs_search 的命中率，以及 ljs_api / ljs_read 的返回。
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SERVER = path.join(ROOT, 'dist', 'index.js')

/** 20 个测试用例：查询 → 期望命中的包（可为多个候选） */
const CASES = [
  { q: '大屏数字要滚动增长', expect: ['moving-numbers-vue3'] },
  { q: '数据看板的金额跳动效果', expect: ['moving-numbers-vue3'] },
  { q: '表格的列要能动态配置', expect: ['trends-table-vue3'] },
  { q: 'el-table 要多级表头', expect: ['trends-table-vue3'] },
  { q: '表格导出 excel', expect: ['trends-table-vue3'] },
  { q: '能源流向图', expect: ['energy-flow-chart'] },
  { q: '公司发展历程的时间轴', expect: ['ljs-s-timeline'] },
  { q: '蛇形时间轴展示大事记', expect: ['ljs-s-timeline'] },
  { q: '3D 球面轮播', expect: ['ball-swiper'] },
  { q: '产品立体展示，标签球', expect: ['ball-swiper'] },
  { q: '下拉框数据太多卡顿', expect: ['big-select'] },
  { q: 'select 需要远程搜索', expect: ['big-select'] },
  { q: '日期格式化工具', expect: ['ljs-tools'] },
  { q: '金额千分位格式化', expect: ['ljs-tools'] },
  { q: '国密 SM2 加密', expect: ['ljs-tools'] },
  { q: '手机号脱敏', expect: ['ljs-tools'] },
  { q: '页面加水印', expect: ['ljs-tools'] },
  { q: 'websocket 长连接', expect: ['ljs-tools'] },
  { q: 'mqtt 消息订阅', expect: ['ljs-tools'] },
  { q: '判空工具 fieldCheck', expect: ['ljs-tools'] },
]

let idCounter = 0
const pending = new Map()

/** 启动服务并建立 JSON-RPC 通道 */
function startServer() {
  const child = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'pipe'] })

  let buf = ''
  child.stdout.on('data', (chunk) => {
    buf += chunk.toString()
    let idx
    while ((idx = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, idx).trim()
      buf = buf.slice(idx + 1)
      if (!line) continue
      try {
        const msg = JSON.parse(line)
        const resolve = pending.get(msg.id)
        if (resolve) {
          pending.delete(msg.id)
          resolve(msg)
        }
      } catch {
        // 非 JSON 行忽略
      }
    }
  })

  child.stderr.on('data', () => {
    // 服务端日志，测试时静默
  })

  return child
}

function request(child, method, params) {
  const id = ++idCounter
  const payload = { jsonrpc: '2.0', id, method, params }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`超时：${method}`))
    }, 10000)
    pending.set(id, (msg) => {
      clearTimeout(timer)
      resolve(msg)
    })
    child.stdin.write(JSON.stringify(payload) + '\n')
  })
}

async function callTool(child, name, args) {
  const res = await request(child, 'tools/call', { name, arguments: args })
  if (res.error) throw new Error(JSON.stringify(res.error))
  const content = res.result?.content ?? []
  return content.map((c) => c.text || '').join('\n')
}

async function main() {
  const child = startServer()
  let passed = 0
  const failures = []

  // 初始化握手
  await request(child, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'smoke-test', version: '1.0.0' },
  })
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')

  // 工具列表
  const list = await request(child, 'tools/list', {})
  const toolNames = (list.result?.tools ?? []).map((t) => t.name)
  console.log(`\n工具清单：${toolNames.join(', ')}`)
  if (toolNames.length !== 3) {
    failures.push(`工具数量应为 3，实际 ${toolNames.length}`)
  }

  // 搜索命中率
  console.log('\n--- ljs_search 命中测试 ---')
  for (const c of CASES) {
    const text = await callTool(child, 'ljs_search', { query: c.q })
    const hit = c.expect.some((e) => text.includes(e))
    if (hit) {
      passed++
      const first = text.split('\n')[0] || ''
      console.log(`  ✅ ${c.q}  →  ${first.replace(/^\d+\.\s*/, '').slice(0, 50)}`)
    } else {
      failures.push(`未命中：${c.q}（期望 ${c.expect.join('/')}）`)
      console.log(`  ❌ ${c.q}  →  ${(text.split('\n')[0] || '').slice(0, 60)}`)
    }
  }

  // ljs_read
  console.log('\n--- ljs_read 测试 ---')
  const doc = await callTool(child, 'ljs_read', { plugin: 'moving-numbers-vue3' })
  if (doc.includes('moving-numbers-vue3') && doc.length > 500) {
    console.log(`  ✅ 全文读取（${doc.length} 字符）`)
    passed++
  } else {
    failures.push('ljs_read 全文读取失败')
    console.log('  ❌ 全文读取失败')
  }

  const section = await callTool(child, 'ljs_read', {
    plugin: 'moving-numbers-vue3',
    section: '安装',
  })
  if (section.includes('安装') && section.length < doc.length) {
    console.log(`  ✅ 章节读取（${section.length} 字符）`)
    passed++
  } else {
    failures.push('ljs_read 章节读取失败')
    console.log('  ❌ 章节读取失败')
  }

  // ljs_api
  console.log('\n--- ljs_api 测试 ---')
  const apiAll = await callTool(child, 'ljs_api', { plugin: 'ljs-tools' })
  if (apiAll.includes('LJSnumModule')) {
    console.log(`  ✅ 全量签名（${apiAll.length} 字符）`)
    passed++
  } else {
    failures.push('ljs_api 全量签名失败')
    console.log('  ❌ 全量签名失败')
  }

  const apiOne = await callTool(child, 'ljs_api', { plugin: 'ljs-tools', api: 'LJSnumModule' })
  if (apiOne.includes('moneySplit')) {
    console.log(`  ✅ 指定接口（含 moneySplit）`)
    passed++
  } else {
    failures.push('ljs_api 指定接口失败')
    console.log('  ❌ 指定接口失败')
  }

  const apiMethod = await callTool(child, 'ljs_api', { plugin: 'ljs-tools', api: 'moneySplit' })
  if (apiMethod.includes('moneySplit')) {
    console.log(`  ✅ 精确方法查询`)
    passed++
  } else {
    failures.push('ljs_api 方法查询失败')
    console.log('  ❌ 方法查询失败')
  }

  // 错误处理
  console.log('\n--- 错误处理测试 ---')
  const bad = await callTool(child, 'ljs_read', { plugin: 'not-exist' })
  if (bad.includes('未找到')) {
    console.log('  ✅ 未知插件友好提示')
    passed++
  } else {
    failures.push('未知插件未给出友好提示')
    console.log('  ❌ 未知插件提示异常')
  }

  // 汇总
  const total = CASES.length + 6
  console.log(`\n${'='.repeat(50)}`)
  console.log(`通过 ${passed}/${total}`)
  if (failures.length) {
    console.log('\n失败项：')
    failures.forEach((f) => console.log(`  - ${f}`))
  } else {
    console.log('✅ 全部通过')
  }

  child.kill()
  process.exit(failures.length ? 1 : 0)
}

main().catch((err) => {
  console.error('测试异常：', err)
  process.exit(1)
})
