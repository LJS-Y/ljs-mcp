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

/** 计算单包得分，同时记录命中理由 */
function scorePlugin(
  plugin: PluginEntry,
  tokens: string[],
): { score: number; reasons: string[] } {
  const reasons: string[] = []

  // 第一层：场景标签（label 与 aliases 都参与）
  // 用「最高命中强度」而非「命中标签数/总标签数」——后者会让标签少的包占便宜
  let bestScenario = 0
  const matchedLabels: string[] = []
  for (const sc of plugin.scenarios) {
    const all = [sc.label, ...(sc.aliases ?? [])]
    // 标签自身被查询完整覆盖的比例，以及标签在查询中出现的长度占比
    const labelHit = Math.max(...all.map((t) => hitRatio(tokens, t)))
    if (labelHit > 0) {
      matchedLabels.push(sc.label)
      // 长标签命中比短标签更有说服力
      const specificity = Math.min(1, sc.label.length / 6)
      const strength = labelHit * (0.6 + 0.4 * specificity)
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
