export const formatBlogDate = (value: string | null, includeYear = true) => {
  if (!value) return '尚未发布'
  return new Intl.DateTimeFormat('zh-CN', {
    year: includeYear ? 'numeric' : undefined,
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export const safeInternalRedirect = (value: string | null, fallback = '/map') => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

export const blogDraftKey = (id: number | 'new') => `knowledge-blog-recovery-${id}`
