/**
 * 从 7 个插件工程抽取 AI.md / d.ts / package.json 元数据，生成 MCP 内嵌数据
 *
 * 用法：node scripts/build-data.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'src', 'data', 'generated')

/**
 * 7 个插件的源工程信息
 * 排除 3 个永久冻结包：threejs-run / throttle-box / ljs-waterfall-flow
 */
const SOURCES = [
  {
    name: 'ljs-tools',
    repo: 'D:/99-ljs/LJSTools',
    pkgDir: 'ljs-tools',
    scenarios: [
      { label: '前端工具库', aliases: ['工具函数', 'utils', '工具集', '常用方法'] },
      { label: '日期格式化', aliases: ['date', '时间格式', '格式化日期'] },
      { label: '数字处理', aliases: ['num', '金额格式化', '千分位', '数字格式化', '分位符', '金额', '补零', '万亿单位', '保留小数'] },
      { label: '判空', aliases: ['fieldCheck', '空值判断', 'isEmpty'] },
      { label: '字典', aliases: ['dict', '数据字典', '下拉选项'] },
      { label: '树形数据', aliases: ['tree', '树结构', '菜单树', '递归'] },
      { label: '表单校验', aliases: ['form', '验证', 'rules'] },
      { label: '国密加密', aliases: ['SM2', 'SM3', 'SM4', 'sm-crypto', '国产加密', '密文'] },
      { label: '水印', aliases: ['watermark', '盲水印', '页面水印'] },
      { label: '数据脱敏', aliases: ['脱敏', 'mask', '手机号脱敏', '身份证脱敏'] },
      { label: 'WebSocket', aliases: ['websocket', 'ws', '长连接', '实时消息'] },
      { label: 'MQTT', aliases: ['mqtt', '物联网', 'iot', '消息订阅'] },
      { label: 'HTML 转 PDF', aliases: ['pdf', '导出pdf', 'htmlPdf'] },
      { label: 'ECharts 封装', aliases: ['echarts', '图表', 'chart'] },
      { label: 'Element Plus 组件', aliases: ['el', '组件', '业务组件'] },
    ],
  },
  {
    name: 'trends-table-vue3',
    repo: 'D:/10-other-npm/nv3-trends-table',
    pkgDir: 'trends-table-vue3',
    scenarios: [
      { label: '动态表格', aliases: ['动态列', '表格列配置', 'columns'] },
      { label: '表格锁定列', aliases: ['固定列', '锁左列', '锁右列', 'fixed'] },
      { label: '列宽计算', aliases: ['列宽', '自适应宽度', '宽度计算'] },
      { label: '二级表头', aliases: ['多级表头', '合并表头', '复杂表头'] },
      { label: '表头显隐', aliases: ['列显隐', '列显示隐藏', '列设置'] },
      { label: '表格导出 Excel', aliases: ['导出excel', 'export', 'xlsx', '表格下载'] },
      { label: 'Element Plus 表格增强', aliases: ['el-table', '表格二次封装'] },
    ],
  },
  {
    name: 'energy-flow-chart',
    repo: 'D:/10-other-npm/energy-flow-chart',
    pkgDir: 'energy-flow-chart',
    scenarios: [
      { label: '能源流向图', aliases: ['流向图', '能流图', 'sankey'] },
      { label: '树形数据可视化', aliases: ['树形图', '层级流向'] },
      { label: '能耗分析', aliases: ['能源管理', '能耗', '电力流向'] },
    ],
  },
  {
    name: 'ljs-s-timeline',
    repo: 'D:/10-other-npm/nv3-s-timeline',
    pkgDir: 'ljs-s-timeline',
    scenarios: [
      { label: '蛇形时间轴', aliases: ['S形时间轴', '蜿蜒时间轴', '时间线'] },
      { label: '发展历程', aliases: ['大事记', '里程碑', '历史沿革'] },
      { label: '流程节点展示', aliases: ['步骤条', '进度节点'] },
    ],
  },
  {
    name: 'ball-swiper',
    repo: 'D:/10-other-npm/nv3-ball-swiper',
    pkgDir: 'ball-swiper',
    scenarios: [
      { label: '球面轮播', aliases: ['3D轮播', '球形轮播', 'tag球'] },
      { label: '3D 标签云', aliases: ['3D标签', 'sphere', '球体'] },
      { label: '产品展示', aliases: ['商品球', '立体展示'] },
    ],
  },
  {
    name: 'big-select',
    repo: 'D:/10-other-npm/nv3-big-select',
    pkgDir: 'big-select',
    scenarios: [
      { label: '大数据量下拉', aliases: ['卡顿下拉', '万条数据', '选择器性能'] },
      { label: '下拉远程搜索', aliases: ['远程检索', 'filter-method', '搜索下拉'] },
      { label: 'Element Plus Select 优化', aliases: ['el-select', '下拉优化'] },
    ],
  },
  {
    name: 'moving-numbers-vue3',
    repo: 'D:/10-other-npm/nv3-dynamic-digital',
    pkgDir: 'moving-numbers-vue3',
    scenarios: [
      { label: '大屏数字滚动', aliases: ['数字跳动', 'count-up', '数字动画'] },
      { label: '数据看板', aliases: ['驾驶舱', '统计面板', '大屏'] },
      { label: '指标动态展示', aliases: ['金额跳动', '总量滚动'] },
    ],
  },
]

/** 读取文件，不存在返回空串 */
function readIfExists(p) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}

/**
 * 从 AI.md 抽取「何时用 / 何时不用」章节
 * 章节标题格式为 `## 何时用 / 何时不用`，到下一个 `## ` 结束
 */
function extractWhenSection(md) {
  const m = md.match(/##\s*何时用[\s\S]*?(?=\n##\s)/)
  const text = m ? m[0].trim() : ''
  const useMatch = text.match(/\*\*用\*\*[:：]\s*([^\n]*)/)
  const notMatch = text.match(/\*\*不用\*\*[:：]\s*([^\n]*)/)
  return {
    whenToUse: useMatch ? useMatch[1].trim() : '',
    whenNotToUse: notMatch ? notMatch[1].trim() : '',
  }
}

/**
 * 从 d.ts 抽取可读的 API 摘要（供 ljs_api 返回）
 *
 * 策略：
 * - 保留 export 的 interface / type / class 完整声明体（含成员方法）
 * - 保留 export 的函数与常量签名
 * - 保留成员上方的单行 JSDoc（去掉多余空行与装饰）
 * - 去掉纯空白与重复空行
 */
function extractApiSummary(dts) {
  if (!dts) return ''
  const lines = dts.split('\n')
  const out = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // JSDoc 块：单行保留，多行只保留内容行（去掉 /** 与 */）
    if (/^\s*\/\*\*/.test(line)) {
      const block = [line]
      let j = i
      while (j < lines.length && !/\*\/\s*$/.test(lines[j]) && j - i < 12) {
        j++
        if (lines[j] !== undefined) block.push(lines[j])
      }
      const content = block
        .map((l) => l.replace(/^\s*\/?\*+\/?/, '').replace(/\*\/\s*$/, '').trim())
        .filter((l) => l && !l.startsWith('@example') && !l.startsWith('@module'))
      if (content.length && content.length <= 4) {
        out.push('/** ' + content.join(' ') + ' */')
      }
      i = j
      continue
    }

    // export 声明起始：连同后续接口体一起收集
    if (/^export\s+(?:declare\s+)?(?:const|function|interface|type|class|default|abstract)/.test(line)) {
      out.push(line)
      // 接口/类型有花括号，跨行收集到收尾
      if (/[{]\s*$/.test(line) || (/{/.test(line) && !/}/.test(line))) {
        let depth = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length
        let k = i + 1
        while (k < lines.length && depth > 0) {
          const cur = lines[k]
          depth += (cur.match(/{/g) || []).length - (cur.match(/}/g) || []).length
          out.push(cur)
          k++
        }
        i = k - 1
      }
      continue
    }

    // 接口类成员签名（不在 export 块内的续行，已在上面接口体收集中处理）
  }

  // 压缩空行
  const text = out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return text.length > 24000 ? text.slice(0, 24000) + '\n/* ... 已截断，完整签名见 index.d.ts */' : text
}

function build() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const entries = []
  const docs = {}
  const apis = {}
  const warnings = []

  for (const src of SOURCES) {
    const pkgPath = path.join(src.repo, src.pkgDir, 'package.json')
    const aiPath = path.join(src.repo, src.pkgDir, 'AI.md')
    const dtsPath = path.join(src.repo, src.pkgDir, 'index.d.ts')

    const pkgRaw = readIfExists(pkgPath)
    if (!pkgRaw) {
      warnings.push(`缺少 package.json: ${pkgPath}`)
      continue
    }
    const pkg = JSON.parse(pkgRaw)

    const aiDoc = readIfExists(aiPath)
    if (!aiDoc) warnings.push(`缺少 AI.md: ${aiPath}`)

    const apiDoc = extractApiSummary(readIfExists(dtsPath))
    const { whenToUse, whenNotToUse } = extractWhenSection(aiDoc)

    // 校验包名与预期一致，防止目录结构变化导致静默错配
    if (pkg.name !== src.name) {
      warnings.push(`包名不符：期望 ${src.name}，实际 ${pkg.name}（${pkgPath}）`)
    }

    entries.push({
      name: pkg.name,
      version: pkg.version,
      description: pkg.description || '',
      scenarios: src.scenarios,
      keywords: pkg.keywords || [],
      whenToUse,
      whenNotToUse,
      install: `npm i ${pkg.name}`,
      deprecated: false,
    })

    docs[pkg.name] = aiDoc
    apis[pkg.name] = apiDoc
  }

  fs.writeFileSync(path.join(OUT_DIR, 'packages.json'), JSON.stringify(entries, null, 2), 'utf8')
  fs.writeFileSync(path.join(OUT_DIR, 'docs.json'), JSON.stringify(docs, null, 2), 'utf8')
  fs.writeFileSync(path.join(OUT_DIR, 'apis.json'), JSON.stringify(apis, null, 2), 'utf8')

  console.log(`✅ 生成 ${entries.length} 个插件的数据`)
  for (const e of entries) {
    const docLen = (docs[e.name] || '').length
    const apiLen = (apis[e.name] || '').length
    console.log(`   ${e.name}@${e.version}  AI.md ${docLen} 字符 / api ${apiLen} 字符 / 场景 ${e.scenarios.length} 个`)
  }

  if (warnings.length) {
    console.warn('\n⚠️ 警告：')
    for (const w of warnings) console.warn('   ' + w)
  }
}

build()
