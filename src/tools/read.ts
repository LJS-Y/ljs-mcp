/**
 * ljs_read：读取完整 AI.md 或指定章节
 */

/** 把 AI.md 按 `## ` 切成章节 */
function splitSections(md: string): Array<{ title: string; body: string }> {
  const sections: Array<{ title: string; body: string }> = []
  const parts = md.split(/^##\s+/m)

  // parts[0] 是首个 ## 之前的内容（标题与引言）
  if (parts[0]?.trim()) {
    sections.push({ title: '概述', body: parts[0].trim() })
  }

  for (let i = 1; i < parts.length; i++) {
    const p = parts[i]
    const nl = p.indexOf('\n')
    const title = nl === -1 ? p.trim() : p.slice(0, nl).trim()
    const body = nl === -1 ? '' : p.slice(nl + 1).trim()
    sections.push({ title, body })
  }

  return sections
}

export function readTool(
  docs: Record<string, string>,
  plugin: string,
  section?: string,
) {
  const md = docs[plugin]

  if (!md) {
    const available = Object.keys(docs).join('、')
    return {
      content: [
        {
          type: 'text' as const,
          text: `未找到插件「${plugin}」的文档。\n\n可用插件：${available}\n\n提示：可先用 ljs_search 按场景查找。`,
        },
      ],
      isError: true,
    }
  }

  // 未指定章节：返回全文
  if (!section) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `# ${plugin} 完整使用指南\n\n${md}`,
        },
      ],
    }
  }

  // 指定章节：模糊匹配标题
  const sections = splitSections(md)
  const key = section.trim()
  const matched = sections.filter((s) => s.title.includes(key) || key.includes(s.title))

  if (!matched.length) {
    return {
      content: [
        {
          type: 'text' as const,
          text:
            `未找到章节「${section}」。\n\n` +
            `${plugin} 可用章节：\n${sections.map((s) => `- ${s.title}`).join('\n')}`,
        },
      ],
    }
  }

  const text = matched.map((s) => `## ${s.title}\n\n${s.body}`).join('\n\n---\n\n')
  return {
    content: [{ type: 'text' as const, text: `# ${plugin} — ${section}\n\n${text}` }],
  }
}
