/**
 * 插件元数据类型
 */

/** 场景标签：用于 ljs_search 的第一层匹配 */
export interface ScenarioTag {
  /** 标签文本，如「大屏数字」 */
  readonly label: string
  /** 同义词，扩大匹配面 */
  readonly aliases?: readonly string[]
}

/** 单个插件条目 */
export interface PluginEntry {
  /** npm 包名 */
  readonly name: string
  /** 版本 */
  readonly version: string
  /** 一句话定位（来自 package.json description） */
  readonly description: string
  /** 场景标签（手工维护，匹配权重最高） */
  readonly scenarios: readonly ScenarioTag[]
  /** npm keywords */
  readonly keywords: readonly string[]
  /** 何时用（来自 AI.md） */
  readonly whenToUse: string
  /** 何时不用（来自 AI.md） */
  readonly whenNotToUse: string
  /** 安装命令 */
  readonly install: string
  /** 完整 AI.md 内容（ljs_read 返回） */
  readonly aiDoc: string
  /** d.ts 摘要（ljs_api 返回） */
  readonly apiDoc: string
  /** 是否有已停止维护标记 */
  readonly deprecated?: boolean
}

/** ljs_search 的单条结果 */
export interface SearchResult {
  readonly plugin: string
  readonly version: string
  readonly score: number
  readonly description: string
  readonly reason: string
  readonly install: string
  readonly next: string
}
