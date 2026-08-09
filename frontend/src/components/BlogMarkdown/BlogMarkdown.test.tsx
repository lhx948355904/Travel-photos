import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import BlogMarkdown from '.'

describe('BlogMarkdown', () => {
  it('renders GFM headings, tables, task lists and highlighted code safely', () => {
    const html = renderToStaticMarkup(
      <BlogMarkdown content={'## 安全标题\n\n- [x] 已验证\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```ts\nconst ok = true\n```'} />,
    )

    expect(html).toContain('id="安全标题"')
    expect(html).toContain('<table>')
    expect(html).toContain('type="checkbox"')
    expect(html).toContain('language-ts')
    expect(html).toContain('复制代码')
  })

  it('does not execute raw HTML or dangerous URL protocols', () => {
    const html = renderToStaticMarkup(
      <BlogMarkdown content={'<script>alert(1)</script>\n\n[危险链接](javascript:alert(1))'} />,
    )

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('href="javascript:')
  })

  it('adds safe attributes to external links', () => {
    const html = renderToStaticMarkup(<BlogMarkdown content="[OpenAI](https://openai.com)" />)
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer nofollow"')
  })
})
