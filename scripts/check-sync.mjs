/**
 * 同步检查：对比插件源工程 AI.md / d.ts 与已生成数据
 *
 * 用途：插件改了文档但忘了重建 ljs-mcp 时，把差异揪出来。
 *
 * 用法：
 *   node scripts/check-sync.mjs        # 只检查，有差异则退出码 1
 *   node scripts/check-sync.mjs --fix  # 检查并自动重建
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const GENERATED = path.join(ROOT, 'src', 'data', 'generated')

// 与 build-data.mjs 保持一致的源清单（只取路径，不重复维护标签）
const SOURCES = [
  { name: 'ljs-tools', repo: 'D:/99-ljs/LJSTools', pkgDir: 'ljs-tools' },
  { name: 'trends-table-vue3', repo: 'D:/10-other-npm/nv3-trends-table', pkgDir: 'trends-table-vue3' },
  { name: 'energy-flow-chart', repo: 'D:/10-other-npm/energy-flow-chart', pkgDir: 'energy-flow-chart' },
  { name: 'ljs-s-timeline', repo: 'D:/10-other-npm/nv3-s-timeline', pkgDir: 'ljs-s-timeline' },
  { name: 'ball-swiper', repo: 'D:/10-other-npm/nv3-ball-swiper', pkgDir: 'ball-swiper' },
  { name: 'big-select', repo: 'D:/10-other-npm/nv3-big-select', pkgDir: 'big-select' },
  { name: 'moving-numbers-vue3', repo: 'D:/10-other-npm/nv3-dynamic-digital', pkgDir: 'moving-numbers-vue3' },
]

const FIX = process.argv.includes('--fix')

function readIfExists(p) {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return ''
  }
}

/** 文件内容指纹：长度 + 简单哈希，够判断是否变更 */
function fingerprint(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return `${s.length}:${h}`
}

function main() {
  const docsPath = path.join(GENERATED, 'docs.json')
  const apisPath = path.join(GENERATED, 'apis.json')

  if (!fs.existsSync(docsPath)) {
    console.error('❌ 尚未生成数据，请先运行 npm run build:data')
    process.exit(1)
  }

  const docs = JSON.parse(fs.readFileSync(docsPath, 'utf8'))
  const apis = JSON.parse(fs.readFileSync(apisPath, 'utf8'))
  const pkgJson = JSON.parse(fs.readFileSync(path.join(GENERATED, 'packages.json'), 'utf8'))

  const drift = []

  for (const src of SOURCES) {
    const aiPath = path.join(src.repo, src.pkgDir, 'AI.md')
    const dtsPath = path.join(src.repo, src.pkgDir, 'index.d.ts')
    const pjPath = path.join(src.repo, src.pkgDir, 'package.json')

    const aiNow = readIfExists(aiPath)
    const dtsNow = readIfExists(dtsPath)
    const pjNow = readIfExists(pjPath)

    if (!aiNow) {
      drift.push({ name: src.name, issue: `AI.md 不存在：${aiPath}` })
      continue
    }

    // AI.md 变更
    const aiStored = docs[src.name] || ''
    if (fingerprint(aiNow) !== fingerprint(aiStored)) {
      drift.push({
        name: src.name,
        issue: `AI.md 已变更（源 ${aiNow.length} 字符 / 已存 ${aiStored.length} 字符）`,
      })
    }

    // d.ts 变更（只比较存在性 + 长度，避免大文件哈希开销）
    const dtsStored = apis[src.name] || ''
    if (dtsNow && !dtsStored) {
      drift.push({ name: src.name, issue: 'd.ts 新增，已存数据中没有 API 签名' })
    } else if (!dtsNow && dtsStored) {
      drift.push({ name: src.name, issue: 'd.ts 已删除，但已存数据中仍有 API 签名' })
    }

    // 版本变更
    if (pjNow) {
      const pj = JSON.parse(pjNow)
      const entry = pkgJson.find((e) => e.name === src.name)
      if (entry && entry.version !== pj.version) {
        drift.push({
          name: src.name,
          issue: `版本已变：源 ${pj.version} / 已存 ${entry.version}`,
        })
      }
    }
  }

  if (!drift.length) {
    console.log('✅ 数据与插件源工程一致，无需重建')
    return
  }

  console.log(`⚠️ 发现 ${drift.length} 处不同步：\n`)
  for (const d of drift) {
    console.log(`   ${d.name}`)
    console.log(`     → ${d.issue}`)
  }

  if (FIX) {
    console.log('\n开始重建数据…\n')
    try {
      execFileSync(process.execPath, [path.join(__dirname, 'build-data.mjs')], {
        stdio: 'inherit',
        cwd: ROOT,
      })
      console.log('\n✅ 已重建。注意：还需 npm run build 并重新发布 npm 版本，用户才能拿到新数据。')
    } catch (e) {
      console.error('重建失败：', e.message)
      process.exit(1)
    }
  } else {
    console.log('\n修复方式：npm run sync:data')
    console.log('或：node scripts/check-sync.mjs --fix')
    process.exit(1)
  }
}

main()
