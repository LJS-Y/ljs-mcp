/**
 * 场景匹配：三层加权打分
 */

import type { PluginEntry, SearchResult } from '../types.js'

/** 权重：场景标签 > keywords > 描述 */
const W_SCENARIO = 0.6
const W_KEYWORD = 0.3
const W_DESC = 0.1

/** 归一化：小写、去空白、常见分隔符转空格 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[，。、；：！？,.;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 把查询切成词元：英文按词，中文按 2 字滑窗 */
function tokenize(q: string): string[] {
  const text = normalize(q)
  const tokens = new Set<string>()

  // 英文 / 数字 / 连字符词
  for (const t of text.match(/[a-z0-9][a-z0-9-]*/g) || []) {
    tokens.add(t)
  }

  // 中文：2 字滑窗 + 整段
  const cjk = text.replace(/[a-z0-9\s-]/g, '')
  if (cjk.length >= 2) {
    for (let i = 0; i + 2 <= cjk.length; i++) {
      tokens.add(cjk.slice(i, i + 2))
    }
  }
  if (cjk.length >= 1) tokens.add(cjk)

  return [...tokens]
}

/** 某段文本命中多少查询词元，返回 0~1 */
function hitRatio(tokens: string[], text: string): number {
  if (!tokens.length) return 0
  const hay = normalize(text)
  let hit = 0
  for (const t of tokens) {
    if (hay.includes(t)) hit++
  }
  return hit / tokens.length
}

/**
 * 标签覆盖率：标签中有多大比例被查询覆盖
 *
 * 与 hitRatio 的区别：hitRatio 除以「查询词元数」（查询越长分越低），
 * 这里除以「标签自身长度」，衡量的是「这个标签有多贴合查询」。
 * 用于场景标签打分，避免长查询导致分数被稀释。
 */
function coverage(label: string, tokens: string[]): number {
  const text = normalize(label.replace(/\s/g, ''))
  if (!text) return 0

  // 以 2 字为单位切标签，看有多少落在查询里
  const units: string[] = []
  for (let i = 0; i + 2 <= text.length; i++) units.push(text.slice(i, i + 2))
  if (!units.length) units.push(text)

  const q = normalize(tokens.join(' '))
  let hit = 0
  for (const u of units) {
    if (q.includes(u)) hit++
  }
  return hit / units.length
}

/**
 * 计算单包得分，同时记录命中理由
 *
 * 设计要点：
 * - 场景标签按「标签被查询覆盖的比例」打分，但阈值提高到 0.6
 *   （过低会让「Element Plus 组件」这类泛标签匹配到任何含 el/select 的查询）
 * - 通用标签（如「Element Plus 组件」）额外降权——它们描述的是底座，不是产品定位
 * - 专精度加成：标签越具体（越长、别名越少），命中越可信
 */
function scorePlugin(
  plugin: PluginEntry,
  tokens: string[],
): { score: number; reasons: string[] } {
  const reasons: string[] = []

  // 第一层：场景标签
  let bestScenario = 0
  const matchedLabels: string[] = []
  for (const sc of plugin.scenarios) {
    const all = [sc.label, ...(sc.aliases ?? [])]
    const labelHit = Math.max(...all.map((t) => coverage(t, tokens)))
    if (labelHit >= 0.6) {
      matchedLabels.push(sc.label)
      // 专精度：标签越长越具体；别名太多说明是大类目，降权
      const lenFactor = Math.min(1, sc.label.length / 6)
      const aliasPenalty = 1 - Math.min(0.35, (sc.aliases?.length ?? 0) * 0.025)
      const strength = labelHit * (0.7 + 0.3 * lenFactor) * aliasPenalty
      if (strength > bestScenario) bestScenario = strength
    }
  }
  const scenarioScore = bestScenario
  if (matchedLabels.length) {
    reasons.push(`场景命中「${matchedLabels.slice(0, 3).join('、')}」`)
  }

  // 第二层：keywords
  const kwScore = hitRatio(tokens, plugin.keywords.join(' '))
  if (kwScore > 0.2) {
    const hitKw = plugin.keywords.filter(
      (k) => normalize(k).length > 0 && tokens.some((t) => normalize(k).includes(t)),
    )
    if (hitKw.length) reasons.push(`关键词命中「${hitKw.slice(0, 3).join('、')}」`)
  }

  // 第三层：描述 + 何时用
  const descText = [plugin.description, plugin.whenToUse].filter(Boolean).join(' ')
  const descScore = hitRatio(tokens, descText)
  if (descScore > 0.3) reasons.push('描述相关')

  const score = scenarioScore * W_SCENARIO + kwScore * W_KEYWORD + descScore * W_DESC

  return { score: Number(score.toFixed(3)), reasons }
}

/**
 * 搜索插件
 * @param plugins 全部插件
 * @param query 自然语言查询
 * @param limit 返回条数，默认 3
 */
export function searchPlugins(
  plugins: readonly PluginEntry[],
  query: string,
  limit = 3,
): SearchResult[] {
  const tokens = tokenize(query)
  if (!tokens.length) return []

  const scored = plugins
    .map((p) => {
      const { score, reasons } = scorePlugin(p, tokens)
      return { plugin: p, score, reasons }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored.map(({ plugin, score, reasons }) => ({
    plugin: plugin.name,
    version: plugin.version,
    score,
    description: plugin.description,
    reason: reasons.length ? reasons.join('；') : '部分关键词匹配',
    install: plugin.install,
    next: `调用 ljs_read("${plugin.name}") 获取完整用法，或 ljs_api("${plugin.name}") 查看 API 签名`,
  }))
}
