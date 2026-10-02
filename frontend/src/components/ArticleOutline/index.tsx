import { useEffect, useRef, useState, type RefObject } from 'react'

interface Heading { id: string; text: string; level: number; element: HTMLElement }
const clamp = (value: number) => Math.max(0, Math.min(1, value))

export default function ArticleOutline({ articleRef, content }: { articleRef: RefObject<HTMLElement>; content: string }) {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState('')
  const [view, setView] = useState({ progress: 0, height: 40, top: 0 })
  const trackRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const geometry = useRef({ start: 0, range: 0, travel: 0 })
  const drag = useRef<{ y: number; progress: number } | null>(null)

  useEffect(() => {
    const article = articleRef.current
    if (!article) return
    const items = Array.from(article.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6'))
      .map((element) => ({ id: element.id, text: element.textContent || '未命名标题', level: Number(element.tagName[1]), element }))
    setHeadings(items)
    let frame = 0
    const measure = () => {
      const rect = article.getBoundingClientRect()
      const viewport = Math.max(1, window.innerHeight - 30)
      const start = Math.max(0, rect.top + window.scrollY - 30)
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      const range = Math.max(0, Math.min(start + rect.height - viewport, maxScroll) - start)
      const trackHeight = trackRef.current?.clientHeight || 0
      const height = Math.min(trackHeight, Math.max(36, trackHeight * Math.min(1, viewport / Math.max(1, rect.height))))
      const travel = Math.max(0, trackHeight - height)
      const progress = range > 0 ? clamp((window.scrollY - start) / range) : 0
      geometry.current = { start, range, travel }
      setView({ progress, height, top: progress * travel })
      let current = items[0]?.id || ''
      for (const item of items) {
        if (item.element.getBoundingClientRect().top > 36) break
        current = item.id
      }
      if (range > 0 && progress >= 1) current = items[items.length - 1]?.id || current
      setActive(current)
    }
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(article)
    if (trackRef.current) observer.observe(trackRef.current)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    schedule()
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [articleRef, content])

  useEffect(() => {
    const list = listRef.current
    const link = list?.querySelector<HTMLElement>('[aria-current="location"]')
    if (!list || !link) return
    const offset = link.getBoundingClientRect().top - list.getBoundingClientRect().top
    if (offset < 0 || offset + link.offsetHeight > list.clientHeight) {
      list.scrollTop += offset - list.clientHeight / 2 + link.offsetHeight / 2
    }
  }, [active])

  const scrollTo = (progress: number) => {
    const { start, range } = geometry.current
    window.scrollTo({ top: start + clamp(progress) * range, behavior: 'instant' })
  }
  const minLevel = Math.min(...headings.map((heading) => heading.level), 6)

  return (
    <aside className="blog-outline" aria-label="文章大纲">
      <div className="blog-outline-label"><strong>文章大纲</strong><span>{Math.round(view.progress * 100)}%</span></div>
      <div className="blog-outline-body">
        <nav aria-label="章节导航">
          <ol ref={listRef}>
            {headings.map((heading) => <li key={heading.id}>
              <a href={`#${encodeURIComponent(heading.id)}`} style={{ paddingLeft: 12 + (heading.level - minLevel) * 12 }}
                aria-current={active === heading.id ? 'location' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  window.history.replaceState(null, '', `#${encodeURIComponent(heading.id)}`)
                  heading.element.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
                }}>{heading.text}</a>
            </li>)}
          </ol>
          {!headings.length && <p className="blog-outline-empty">本文暂无章节标题</p>}
        </nav>
        <div className="blog-outline-track" ref={trackRef}>
          <div className="blog-outline-thumb" role="scrollbar" tabIndex={0} aria-label="拖动以滚动正文"
            aria-controls="blog-article-body" aria-orientation="vertical" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={Math.round(view.progress * 100)} title="拖动以快速浏览正文"
            style={{ height: view.height, transform: `translateY(${view.top}px)` }}
            onPointerDown={(event) => {
              if (event.button !== 0) return
              event.preventDefault()
              event.currentTarget.focus()
              event.currentTarget.setPointerCapture(event.pointerId)
              drag.current = { y: event.clientY, progress: view.progress }
            }}
            onPointerMove={(event) => {
              if (!drag.current || !geometry.current.travel) return
              scrollTo(drag.current.progress + (event.clientY - drag.current.y) / geometry.current.travel)
            }}
            onPointerUp={(event) => { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId) }}
            onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
            onKeyDown={(event) => {
              const next = { ArrowDown: view.progress + .02, ArrowUp: view.progress - .02, PageDown: view.progress + .1, PageUp: view.progress - .1, Home: 0, End: 1 }[event.key]
              if (next !== undefined) { event.preventDefault(); scrollTo(next) }
            }} />
        </div>
      </div>
      <small className="blog-outline-hint">点击标题跳转 · 拖动灰块快速浏览</small>
    </aside>
  )
}
