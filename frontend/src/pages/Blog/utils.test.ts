import { describe, expect, it } from 'vitest'
import { blogDraftKey, safeInternalRedirect } from './utils'

describe('blog editor utilities', () => {
  it('only accepts same-site redirects', () => {
    expect(safeInternalRedirect('/blog/write')).toBe('/blog/write')
    expect(safeInternalRedirect('//evil.example')).toBe('/map')
    expect(safeInternalRedirect('https://evil.example')).toBe('/map')
  })

  it('keeps local recovery drafts isolated by post', () => {
    expect(blogDraftKey('new')).not.toBe(blogDraftKey(12))
  })
})
