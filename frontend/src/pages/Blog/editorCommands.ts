export interface EditorSelection {
  start: number
  end: number
}

export interface EditorChange extends EditorSelection {
  value: string
}

const INDENT = '    '

const selectedText = (value: string, selection: EditorSelection) =>
  value.slice(selection.start, selection.end)

export const wrapSelection = (
  value: string,
  selection: EditorSelection,
  before: string,
  after = '',
  placeholder = '文本',
): EditorChange => {
  const selected = selectedText(value, selection) || placeholder
  return {
    value: `${value.slice(0, selection.start)}${before}${selected}${after}${value.slice(selection.end)}`,
    start: selection.start + before.length,
    end: selection.start + before.length + selected.length,
  }
}

/**
 * 切换 Markdown 行内标记。
 *
 * 选区两端的空白不会被包进标记，避免生成 `**文字 **` 这类无法渲染的 Markdown。
 * 同时兼容选中标记内部文字、选中完整标记两种常见的取消格式方式。
 */
export const toggleInline = (
  value: string,
  selection: EditorSelection,
  marker: string,
  placeholder = '文本',
): EditorChange => {
  const selected = selectedText(value, selection)

  if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length > marker.length * 2) {
    const inner = selected.slice(marker.length, -marker.length)
    return {
      value: `${value.slice(0, selection.start)}${inner}${value.slice(selection.end)}`,
      start: selection.start,
      end: selection.start + inner.length,
    }
  }

  const wrappedOutside =
    value.slice(Math.max(0, selection.start - marker.length), selection.start) === marker &&
    value.slice(selection.end, selection.end + marker.length) === marker

  if (wrappedOutside) {
    return {
      value: `${value.slice(0, selection.start - marker.length)}${selected}${value.slice(selection.end + marker.length)}`,
      start: selection.start - marker.length,
      end: selection.end - marker.length,
    }
  }

  if (!selected) return wrapSelection(value, selection, marker, marker, placeholder)

  const leading = selected.match(/^\s*/)?.[0] || ''
  const trailing = selected.match(/\s*$/)?.[0] || ''
  const content = selected.slice(leading.length, selected.length - trailing.length)
  if (!content) return wrapSelection(value, selection, marker, marker, placeholder)

  const replacement = `${leading}${marker}${content}${marker}${trailing}`
  const contentStart = selection.start + leading.length + marker.length
  return {
    value: `${value.slice(0, selection.start)}${replacement}${value.slice(selection.end)}`,
    start: contentStart,
    end: contentStart + content.length,
  }
}

export const prefixSelectedLines = (
  value: string,
  selection: EditorSelection,
  prefix: string | ((index: number) => string),
): EditorChange => {
  const lineStart = value.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1
  const nextBreak = value.indexOf('\n', selection.end)
  const lineEnd = nextBreak === -1 ? value.length : nextBreak
  const lines = value.slice(lineStart, lineEnd).split('\n')
  const replacement = lines.map((line, index) => `${typeof prefix === 'function' ? prefix(index) : prefix}${line}`).join('\n')

  return {
    value: `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`,
    start: lineStart,
    end: lineStart + replacement.length,
  }
}

export const insertBlock = (
  value: string,
  selection: EditorSelection,
  content: string,
  selectFrom: number,
  selectLength: number,
): EditorChange => {
  const needsLeadingBreak = selection.start > 0 && value[selection.start - 1] !== '\n'
  const before = needsLeadingBreak ? '\n' : ''
  const replacement = `${before}${content}`
  const start = selection.start + before.length + selectFrom
  return {
    value: `${value.slice(0, selection.start)}${replacement}${value.slice(selection.end)}`,
    start,
    end: start + selectLength,
  }
}

/** 像代码编辑器一样对光标或多行选区进行四空格缩进。 */
export const indentSelection = (
  value: string,
  selection: EditorSelection,
  outdent = false,
): EditorChange => {
  const lineStart = value.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1

  if (selection.start === selection.end) {
    if (!outdent) {
      return {
        value: `${value.slice(0, selection.start)}${INDENT}${value.slice(selection.end)}`,
        start: selection.start + INDENT.length,
        end: selection.start + INDENT.length,
      }
    }

    const removable = value.slice(lineStart).match(/^(?: {1,4}|\t)/)?.[0] || ''
    if (!removable) return { value, ...selection }
    const nextCursor = Math.max(lineStart, selection.start - removable.length)
    return {
      value: `${value.slice(0, lineStart)}${value.slice(lineStart + removable.length)}`,
      start: nextCursor,
      end: nextCursor,
    }
  }

  const effectiveEnd = selection.end > selection.start && value[selection.end - 1] === '\n'
    ? selection.end - 1
    : selection.end
  const nextBreak = value.indexOf('\n', effectiveEnd)
  const lineEnd = nextBreak === -1 ? value.length : nextBreak
  const lines = value.slice(lineStart, lineEnd).split('\n')
  const replacement = lines
    .map((line) => outdent ? line.replace(/^(?: {1,4}|\t)/, '') : `${INDENT}${line}`)
    .join('\n')

  return {
    value: `${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`,
    start: lineStart,
    end: lineStart + replacement.length,
  }
}

/**
 * 在 Markdown 列表项中回车时延续项目符号，并为有序列表递增序号。
 * 空列表项再次回车会退出列表，行为与主流 Markdown 编辑器一致。
 */
export const continueList = (
  value: string,
  selection: EditorSelection,
): EditorChange | null => {
  if (selection.start !== selection.end) return null

  const lineStart = value.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1
  const nextBreak = value.indexOf('\n', selection.start)
  const lineEnd = nextBreak === -1 ? value.length : nextBreak
  const line = value.slice(lineStart, lineEnd)
  const match = line.match(/^(\s*)(?:(\d+)([.)])|([-+*]))\s+(\[(?: |x|X)\]\s+)?(.*)$/)
  if (!match) return null

  const [matched, indent, orderedNumber, orderedDelimiter, bullet, task = '', content] = match
  const prefixLength = matched.length - content.length
  if (selection.start < lineStart + prefixLength) return null

  if (!content.trim()) {
    return {
      value: `${value.slice(0, lineStart)}${content}${value.slice(lineEnd)}`,
      start: lineStart,
      end: lineStart,
    }
  }

  const marker = orderedNumber
    ? `${Number(orderedNumber) + 1}${orderedDelimiter}`
    : bullet
  const nextPrefix = `${indent}${marker} ${task ? '[ ] ' : ''}`
  const insertion = `\n${nextPrefix}`
  const cursor = selection.start + insertion.length
  return {
    value: `${value.slice(0, selection.start)}${insertion}${value.slice(selection.end)}`,
    start: cursor,
    end: cursor,
  }
}
