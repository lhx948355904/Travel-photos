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

    await act(async () => boldButton.click())
    expect(textarea.value).toBe('协议： **是通过TCP** ')
    expect(container.querySelector('.blog-preview-pane strong')?.textContent).toBe('是通过TCP')

    await act(async () => boldButton.click())
    expect(textarea.value).toBe('协议： 是通过TCP ')

    await act(async () => boldButton.click())
    await act(async () => textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })))
    expect(textarea.value).toBe('协议： 是通过TCP ')

    await act(async () => textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true })))
    expect(textarea.value).toBe('协议： **是通过TCP** ')
  })
})
