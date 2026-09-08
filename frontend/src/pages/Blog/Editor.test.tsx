// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BlogEditorPage from './Editor'

vi.mock('../../api/blog', () => ({
  createBlogDraft: vi.fn(),
  getAdminBlogPost: vi.fn(),
  publishBlogPost: vi.fn(),
  saveBlogDraft: vi.fn(),
  uploadBlogAsset: vi.fn(),
}))

const setTextareaValue = (textarea: HTMLTextAreaElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(textarea, value)
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
}

const flushSelectionRestore = () => new Promise<void>((resolve) => {
  window.requestAnimationFrame(() => resolve())
})

describe('BlogEditorPage interactions', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    window.localStorage.clear()
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }))
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    await act(async () => {
      root.render(
        <HelmetProvider>
          <MemoryRouter
            initialEntries={['/blog/write']}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <BlogEditorPage />
          </MemoryRouter>
        </HelmetProvider>,
      )
    })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.restoreAllMocks()
  })

  it('toggles bold and supports undo/redo keyboard shortcuts', async () => {
    const textarea = container.querySelector<HTMLTextAreaElement>('.blog-markdown-input')!
    const boldButton = container.querySelector<HTMLButtonElement>('button[aria-label="加粗"]')!

    await act(async () => setTextareaValue(textarea, '协议： 是通过TCP '))
    await act(async () => {
      textarea.focus()
      textarea.setSelectionRange(4, 11)
    })

    await act(async () => {
      boldButton.click()
      await flushSelectionRestore()
    })
    expect(textarea.value).toBe('协议： **是通过TCP** ')
    expect(container.querySelector('.blog-preview-pane strong')?.textContent).toBe('是通过TCP')

    textarea.setSelectionRange(6, 12)
    await act(async () => {
      boldButton.click()
      await flushSelectionRestore()
    })
    expect(textarea.value).toBe('协议： 是通过TCP ')

    textarea.setSelectionRange(4, 10)
    await act(async () => {
      boldButton.click()
      await flushSelectionRestore()
    })
    await act(async () => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
      await flushSelectionRestore()
    })
    expect(textarea.value).toBe('协议： 是通过TCP ')

    await act(async () => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }))
      await flushSelectionRestore()
    })
    expect(textarea.value).toBe('协议： **是通过TCP** ')
  })

  it('resizes only the selected image, persists Markdown and supports undo and reset', async () => {
    const textarea = container.querySelector<HTMLTextAreaElement>('.blog-markdown-input')!
    const original = '![第一张](/same.png)\n\n![第二张](/same.png "说明")'
    await act(async () => setTextareaValue(textarea, original))
    await act(async () => container.querySelector<HTMLElement>('[aria-label="设置图片尺寸：第二张"]')!.click())
    const height = document.querySelector<HTMLInputElement>('[aria-label="图片高度"]')!
    expect(height).not.toBeNull()
    await act(async () => {
      height.value = '400'
      height.closest('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await flushSelectionRestore()
    })
    expect(textarea.value).toBe('![第一张](/same.png)\n\n![第二张](</same.png> "说明 {size=autox400}")')
    expect(container.querySelector<HTMLImageElement>('img[alt="第二张"]')!.style.height).toBe('400px')
    expect([...Array(window.localStorage.length)].some((_, i) => window.localStorage.getItem(window.localStorage.key(i)!)?.includes('{size=autox400}'))).toBe(true)
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="撤销"]')!.click()
      await flushSelectionRestore()
    })
    expect(textarea.value).toBe(original)
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="重做"]')!.click()
      await flushSelectionRestore()
    })
    await act(async () => container.querySelector<HTMLElement>('[aria-label="设置图片尺寸：第二张"]')!.click())
    await act(async () => {
      Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === '恢复自动')!.click()
      await flushSelectionRestore()
    })
    expect(textarea.value).not.toContain('{size=')
    expect(textarea.value).toContain('"说明"')
  })

  it('supports IDE-style indentation and continues Markdown lists on Enter', async () => {
    const textarea = container.querySelector<HTMLTextAreaElement>('.blog-markdown-input')!

    await act(async () => setTextareaValue(textarea, 'const value = true'))
    await act(async () => {
      textarea.focus()
      textarea.setSelectionRange(6, 6)
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    })
    expect(textarea.value).toBe('const     value = true')

    await act(async () => setTextareaValue(textarea, '1. first'))
    await act(async () => {
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(textarea.value).toBe('1. first\n2. ')

    await act(async () => setTextareaValue(textarea, '- '))
    await act(async () => {
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
      textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(textarea.value).toBe('')
  })

  it('keeps the editor viewport when inserting a code block from the toolbar', async () => {
    const textarea = container.querySelector<HTMLTextAreaElement>('.blog-markdown-input')!
    const codeBlockButton = container.querySelector<HTMLButtonElement>('button[aria-label="代码块"]')!
    const content = Array.from({ length: 80 }, (_, index) => `line ${index}`).join('\n')
    const cursor = content.indexOf('line 50')

    await act(async () => setTextareaValue(textarea, content))
    textarea.focus()
    textarea.setSelectionRange(cursor, cursor)
    textarea.scrollTop = 480
    textarea.scrollLeft = 24

    const setSelectionRange = textarea.setSelectionRange.bind(textarea)
    vi.spyOn(textarea, 'setSelectionRange').mockImplementation((start, end, direction) => {
      setSelectionRange(start, end, direction)
      // 模拟浏览器在受控 textarea 更新并恢复选区时重置内部滚动位置。
      textarea.scrollTop = 0
      textarea.scrollLeft = 0
    })

    await act(async () => {
      codeBlockButton.click()
      await flushSelectionRestore()
    })

    expect(textarea.value).toContain('```ts\nconst value = true\n```\nline 50')
    expect(textarea.scrollTop).toBe(480)
    expect(textarea.scrollLeft).toBe(24)
  })
})
