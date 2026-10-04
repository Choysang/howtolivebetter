/**
 * backend/pipeline/yaml.ts · 零依赖纯 TypeScript YAML 严格子集微解析器
 * 专门针对 router_config.yaml 结构定制：
 * 支持嵌套对象、列表 (-)、流式数组 [a, b]、基本标量、注释剔除。
 * 单函数 <= 60 行，零外部依赖，Node 24 原生运行。
 */

interface YamlLine {
  indent: number
  text: string
  lineNo: number
}

function parseScalar(raw: string): unknown {
  const s = raw.trim()
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === 'null' || s === '~') return null
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map((x) => parseScalar(x.trim()))
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1)
  }
  return s
}

function parseBlock(
  lines: readonly YamlLine[],
  startIdx: number,
  currentIndent: number
): { result: unknown; nextIdx: number } {
  let idx = startIdx
  if (idx >= lines.length || lines[idx].indent < currentIndent) {
    return { result: null, nextIdx: idx }
  }

  if (lines[idx].text.startsWith('- ')) {
    const list: unknown[] = []
    const listIndent = lines[idx].indent
    while (idx < lines.length && lines[idx].indent === listIndent && lines[idx].text.startsWith('- ')) {
      const itemText = lines[idx].text.slice(2).trim()
      const itemLine = lines[idx]
      idx++
      if (itemText.includes(': ')) {
        const colonIdx = itemText.indexOf(': ')
        const k = itemText.slice(0, colonIdx).trim()
        const v = parseScalar(itemText.slice(colonIdx + 2).trim())
        const obj: Record<string, unknown> = { [k]: v }
        const deeperIndent = itemLine.indent + 2
        while (idx < lines.length && lines[idx].indent >= deeperIndent && !lines[idx].text.startsWith('- ')) {
          const cIdx = lines[idx].text.indexOf(':')
          if (cIdx >= 0) {
            const propKey = lines[idx].text.slice(0, cIdx).trim()
            const propVal = lines[idx].text.slice(cIdx + 1).trim()
            const nextL = lines[idx]
            idx++
            if (propVal === '') {
              const deeper = parseBlock(lines, idx, nextL.indent + 1)
              obj[propKey] = deeper.result
              idx = deeper.nextIdx
            } else {
              obj[propKey] = parseScalar(propVal)
            }
          } else {
            idx++
          }
        }
        list.push(obj)
      } else {
        list.push(parseScalar(itemText))
      }
    }
    return { result: list, nextIdx: idx }
  }

  const obj: Record<string, unknown> = {}
  const objIndent = lines[idx].indent
  while (idx < lines.length && lines[idx].indent === objIndent && !lines[idx].text.startsWith('- ')) {
    const cIdx = lines[idx].text.indexOf(':')
    if (cIdx === -1) {
      idx++
      continue
    }
    const key = lines[idx].text.slice(0, cIdx).trim()
    const valStr = lines[idx].text.slice(cIdx + 1).trim()
    const curLine = lines[idx]
    idx++
    if (valStr === '') {
      const sub = parseBlock(lines, idx, curLine.indent + 1)
      obj[key] = sub.result
      idx = sub.nextIdx
    } else {
      obj[key] = parseScalar(valStr)
    }
  }
  return { result: obj, nextIdx: idx }
}

export function parseYamlSubset(yamlText: string): Record<string, unknown> {
  const rawLines = yamlText.split(/\r?\n/)
  const lines: YamlLine[] = []
  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i]
    let clean = raw
    const commentMatch = raw.match(/^(?:[^#"']|"[^"]*"|'[^']*')*?(#.*)$/)
    if (commentMatch && commentMatch[1]) {
      clean = raw.slice(0, raw.length - commentMatch[1].length)
    }
    if (!clean.trim()) continue
    const indent = clean.match(/^(\s*)/)![1].length
    lines.push({ indent, text: clean.trim(), lineNo: i + 1 })
  }

  const { result } = parseBlock(lines, 0, 0)
  return (result as Record<string, unknown>) || {}
}
