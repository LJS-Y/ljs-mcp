/**
 * ljs_api：查询 API 签名
 */

/**
 * 从 d.ts 摘要中切出某个接口 / 类型的完整声明块
 * 通过花括号配对定位结束位置
 */
function extractBlock(text: string, name: string): string | null {
  const re = new RegExp(`(?:export\\s+)?(?:declare\\s+)?(?:interface|type|class|const|function)\\s+${name}\\b`)
  const m = text.match(re)
  if (!m || m.index === undefined) return null

  const start = m.index
  const openIdx = text.indexOf('{', start)
  const lineEnd = text.indexOf('\n', start)

  // 无花括号（type 别名 / 函数声明）：取到该语句结束
  if (openIdx === -1 || (lineEnd !== -1 && openIdx > lineEnd)) {
    const semi = text.indexOf('\n', start)
    return text.slice(start, semi === -1 ? undefined : semi).trim()
  }

  // 花括号配对
  let depth = 0
  let i = openIdx
  while (i < text.length) {
    const ch = text[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) break
    }
    i++
  }
  return text.slice(start, i + 1).trim()
}

export function apiTool(
  apis: Record<string, string>,
  plugin: string,
  api?: string,
) {
  const dts = apis[plugin]

  if (!dts) {
    const available = Object.keys(apis).join('、')
    return {
      content: [
        {
          type: 'text' as const,
          text: `未找到插件「${plugin}」的 API 声明。\n\n可用插件：${available}`,
        },
      ],
      isError: true,
    }
  }

  // 未指定 api：返回全部签名
  if (!api) {
    return {
      content: [
        {
          type: 'text' as const,
          text:
            `# ${plugin} API 签名\n\n` +
            `如需完整用法与示例，调用 ljs_read("${plugin}")。\n\n` +
            '```typescript\n' +
            dts +
            '\n```',
        },
      ],
    }
  }

  // 指定 api：优先精确块，其次做包含匹配
  const block = extractBlock(dts, api)
  if (block) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `# ${plugin} — ${api}\n\n\`\`\`typescript\n${block}\n\`\`\``,
        },
      ],
    }
  }

  // 包含匹配：可能是方法名，列出所在行
  const lines = dts
    .split('\n')
    .filter((l) => l.toLowerCase().includes(api.toLowerCase()))

  if (lines.length) {
    return {
      content: [
        {
          type: 'text' as const,
          text:
            `# ${plugin} — 含「${api}」的声明\n\n` +
            '```typescript\n' +
            lines.join('\n') +
            '\n```\n\n' +
            `如需完整接口，调用 ljs_api("${plugin}") 查看全部。`,
        },
      ],
    }
  }

  // 都没找到：列出可用名称
  const names = [...dts.matchAll(/(?:interface|type|class|const|function)\s+([A-Za-z_$][\w$]*)/g)]
    .map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 40)

  return {
    content: [
      {
        type: 'text' as const,
        text:
          `未在 ${plugin} 中找到「${api}」。\n\n` +
          `可用名称（部分）：\n${names.map((n) => `- ${n}`).join('\n')}`,
      },
    ],
    isError: true,
  }
}
