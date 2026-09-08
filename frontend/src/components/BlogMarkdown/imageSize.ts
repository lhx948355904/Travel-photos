export const MAX_IMAGE_DIMENSION = 10000

export const parseImageTitle = (title = '') => {
  const match = title.match(/(?:^| )\{size=(auto|[1-9]\d{0,4})x(auto|[1-9]\d{0,4})\}$/)
  if (!match) return { title, width: undefined, height: undefined }
  const dimension = (value: string) => value === 'auto' ? undefined : Number(value)
  const width = dimension(match[1])
  const height = dimension(match[2])
  if ((width || 0) > MAX_IMAGE_DIMENSION || (height || 0) > MAX_IMAGE_DIMENSION) {
    return { title, width: undefined, height: undefined }
  }
  return { title: title.slice(0, match.index), width, height }
}

/** Keep dimensions in the Markdown title so existing draft/publish APIs preserve them. */
export const imageMarkdown = (src: string, alt: string, title: string, width?: number, height?: number) => {
  const size = width || height ? `{size=${width || 'auto'}x${height || 'auto'}}` : ''
  const nextTitle = [title, size].filter(Boolean).join(' ')
  const escape = (value: string) => value.replace(/[\\[\]"<>]/g, '\\$&').replace(/\r?\n/g, ' ')
  return `![${escape(alt)}](<${escape(src)}> ${nextTitle ? `"${escape(nextTitle)}"` : ''})`
}
