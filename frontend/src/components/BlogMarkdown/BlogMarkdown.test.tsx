import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import BlogMarkdown from '.'
import { imageMarkdown } from './imageSize'

describe('BlogMarkdown', () => {
  it('preserves dimensions and the original title when rendering saved Markdown', () => {
    const markdown = imageMarkdown('/images/a(b).png', '图 [一]', '原始 "说明"', 320, 400)
    const html = renderToStaticMarkup(<BlogMarkdown content={markdown} />)
    expect(html).toContain('width="320"')
    expect(html).toContain('height="400"')
    expect(html).toContain('title="原始 &quot;说明&quot;"')
    expect(html).toContain('alt="图 [一]"')
    expect(html).toContain('src="/images/a(b).png"')
    expect(html).not.toContain('设置图片尺寸')
  })

  it('supports height-only sizing and rejects invalid dimensions', () => {
    const html = renderToStaticMarkup(<BlogMarkdown content={'![长图](/long.png "{size=autox400}")'} />)
    expect(html).toContain('width:auto;height:400px')
    expect(html).not.toContain('width="')
    for (const size of ['0x400', '-1x400', '99999x400', '100xInfinity']) {
      const invalid = renderToStaticMarkup(<BlogMarkdown content={`![图片](/a.png "{size=${size}}")`} />)
      expect(invalid).not.toContain('width="')
      expect(invalid).not.toContain('height="')
    }
  })

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
