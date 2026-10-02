// @vitest-environment jsdom
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ArticleOutline from '.'
import BlogMarkdown from '../BlogMarkdown'

describe('ArticleOutline', () => {
  let container: HTMLDivElement
  let root: Root
  let resize: () => void
  let articleHeight = 3000
  const flush = async () => { await act(async () => { await new Promise(requestAnimationFrame) }) }

  beforeEach(async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    articleHeight = 3000
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resize = callback }
      observe() {} disconnect() {}
    })
    vi.stubGlobal('innerHeight', 630)
    vi.stubGlobal('scrollY', 0)
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(4000)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(500)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const y = this.tagName === 'H3' ? 1600 : 400
      return { top: y - window.scrollY, height: this.tagName === 'ARTICLE' ? articleHeight : 30 } as DOMRect
    })
    HTMLElement.prototype.scrollIntoView = vi.fn()
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.releasePointerCapture = vi.fn()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    const articleRef = createRef<HTMLElement>()
    await act(async () => root.render(<>
      <ArticleOutline articleRef={articleRef} content="article" />
      <article ref={articleRef}><BlogMarkdown content={'## 重复标题\n\n### 重复标题\n\n```md\n## 非标题\n```'} /></article>
    </>))
    await flush()
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('uses rendered heading anchors, including duplicate titles, and jumps to the selected heading', async () => {
    const links = container.querySelectorAll<HTMLAnchorElement>('nav a')
    expect(links).toHaveLength(2)
    expect(decodeURIComponent(links[1].hash)).toBe('#重复标题-1')
    await act(async () => links[1].click())
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
    expect(decodeURIComponent(window.location.hash)).toBe('#重复标题-1')
  })

  it('maps dragging to article scroll distance and clamps keyboard navigation to the end', async () => {
    const thumb = container.querySelector<HTMLElement>('[role="scrollbar"]')!
    // 600px viewport / 3000px article gives a 100px thumb on a 500px track.
    expect(thumb.style.height).toBe('100px')
    await act(async () => {
      thumb.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientY: 10, button: 0 }))
      thumb.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientY: 210 }))
    })
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 1570, behavior: 'instant' })
    await act(async () => thumb.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'End' })))
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 2770, behavior: 'instant' })
  })

  it('updates progress, current heading and thumb size after scrolling and content resizing', async () => {
    vi.stubGlobal('scrollY', 1800)
    window.dispatchEvent(new Event('scroll'))
    await flush()
    expect(container.querySelector('[aria-current="location"]')?.textContent).toBe('重复标题')
    expect(container.querySelector('[aria-current="location"]')?.getAttribute('href')).toContain('-1')
    expect(container.querySelector('[role="scrollbar"]')?.getAttribute('aria-valuenow')).toBe('60')
    articleHeight = 6000
    resize()
    await flush()
    expect(container.querySelector<HTMLElement>('[role="scrollbar"]')!.style.height).toBe('50px')
  })
})
