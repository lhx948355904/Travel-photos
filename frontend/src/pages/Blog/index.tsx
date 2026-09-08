import { EditOutlined, SearchOutlined, TagOutlined } from '@ant-design/icons'
import { Button, Empty, Input, Pagination, Skeleton } from 'antd'
import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useSearchParams } from 'react-router-dom'
import { getBlogCategories, getBlogPosts, getBlogTags } from '../../api/blog'
import BlogHeader from '../../components/BlogHeader'
import type { BlogPage, BlogPostSummary, BlogTaxonomy } from '../../types/blog'
import { formatBlogDate } from './utils'

const emptyPage: BlogPage<BlogPostSummary> = {
  items: [], page: 1, pageSize: 12, total: 0, totalPages: 0,
}

const BlogHome = () => {
  const [params, setParams] = useSearchParams()
  const [pageData, setPageData] = useState(emptyPage)
  const [categories, setCategories] = useState<BlogTaxonomy[]>([])
  const [tags, setTags] = useState<BlogTaxonomy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(params.get('q') || '')

  const page = Math.max(1, Number(params.get('page') || 1))
  const q = params.get('q') || ''
  const category = params.get('category') || ''
  const tag = params.get('tag') || ''

  useEffect(() => {
    Promise.all([getBlogCategories(), getBlogTags()])
      .then(([nextCategories, nextTags]) => {
        setCategories(nextCategories)
        setTags(nextTags)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getBlogPosts({ page, pageSize: 12, q, category, tag })
      .then((result) => active && setPageData(result))
      .catch((err: Error) => active && setError(err.message || '文章加载失败'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [page, q, category, tag])

  const updateFilter = (key: 'q' | 'category' | 'tag' | 'page', value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const featured = pageData.items[0]
  const rest = pageData.items.slice(1)

  return (
    <main className="blog-index-page">
      <Helmet>
        <title>知识博客 | 旅途拾光</title>
        <meta name="description" content="记录前端、Java、运维、数据库与 AI 的长期实践笔记。" />
        <link rel="canonical" href="https://lhxjourney.cn/blog" />
      </Helmet>
      <BlogHeader />

      <section className="blog-hero">
        <img src="/landing-archive.png" alt="" aria-hidden="true" />
        <div className="blog-hero-overlay" />
        <div className="blog-hero-copy">
          <span className="blog-eyebrow">PERSONAL KNOWLEDGE ARCHIVE · 2026</span>
          <h1><span>把技术长成一片</span><span>可返回的森林</span></h1>
          <p>记录那些值得被复用的判断、踩过的坑，以及从前端走向全栈的每一步。</p>
        </div>
        <div className="blog-hero-index" aria-hidden="true">VOL. 01</div>
      </section>

      <section className="blog-discovery" aria-label="搜索和筛选文章">
        <form
          className="blog-search"
          onSubmit={(event) => { event.preventDefault(); updateFilter('q', query.trim()) }}
        >
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
            prefix={<SearchOutlined />}
            placeholder="搜索标题、摘要或正文"
            allowClear
          />
          <Button htmlType="submit" type="primary">搜索</Button>
        </form>
        <div className="blog-category-strip">
          <button className={!category ? 'is-active' : ''} onClick={() => updateFilter('category', '')}>全部</button>
          {categories.map((item) => (
            <button key={item.id} className={category === item.slug ? 'is-active' : ''} onClick={() => updateFilter('category', item.slug)}>
              {item.name}<sup>{item.postCount}</sup>
            </button>
          ))}
        </div>
        {tags.length > 0 && (
          <div className="blog-tag-filter">
            <TagOutlined />
            {tags.slice(0, 12).map((item) => (
              <button key={item.id} className={tag === item.slug ? 'is-active' : ''} onClick={() => updateFilter('tag', tag === item.slug ? '' : item.slug)}>
                #{item.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="blog-archive" aria-live="polite">
        <div className="blog-section-heading">
          <div><span>LATEST NOTES</span><h2>最近写下</h2></div>
          <span>{pageData.total.toString().padStart(2, '0')} 篇公开文章</span>
        </div>

        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : error ? (
          <div className="blog-error-state"><p>{error}</p><Button onClick={() => updateFilter('page', String(page))}>重新加载</Button></div>
        ) : !featured ? (
          <Empty description="暂时没有匹配的文章" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <>
            <article className="blog-featured">
              <div className="blog-featured-media">
                {featured.coverUrl ? <img src={featured.coverUrl} alt="" /> : <div className="blog-cover-fallback"><EditOutlined /><span>FIELD NOTES</span></div>}
              </div>
              <div className="blog-featured-copy">
                <span className="blog-post-category">{featured.category?.name || '未分类'}</span>
                <h3><Link to={`/blog/${featured.slug}`}>{featured.title}</Link></h3>
                <p>{featured.excerpt}</p>
                <div className="blog-post-meta">
                  <time>{formatBlogDate(featured.publishedAt)}</time>
                  <span>{featured.readingTimeMinutes} 分钟阅读</span>
                </div>
                <Link className="blog-read-link" to={`/blog/${featured.slug}`}>阅读文章 <span>↗</span></Link>
              </div>
            </article>

            <div className="blog-timeline-list">
              {rest.map((post, index) => (
                <article key={post.id} className="blog-timeline-row">
                  <span className="blog-row-index">{String(index + 2).padStart(2, '0')}</span>
                  <div className="blog-row-main">
                    {post.coverUrl && (
                      <Link className="blog-row-cover" to={`/blog/${post.slug}`} aria-label={`阅读文章：${post.title}`}>
                        <img src={post.coverUrl} alt="" loading="lazy" decoding="async" />
                      </Link>
                    )}
                    <div className="blog-row-copy">
                      <span className="blog-post-category">{post.category?.name || '未分类'}</span>
                      <h3><Link to={`/blog/${post.slug}`}>{post.title}</Link></h3>
                      <p>{post.excerpt}</p>
                      <div className="blog-inline-tags">{post.tags.map((item) => <span key={item.id}>#{item.name}</span>)}</div>
                    </div>
                  </div>
                  <div className="blog-row-date">
                    <time>{formatBlogDate(post.publishedAt)}</time>
                    <span>{post.readingTimeMinutes} MIN</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {pageData.totalPages > 1 && (
          <Pagination current={pageData.page} pageSize={pageData.pageSize} total={pageData.total} showSizeChanger={false}
            onChange={(next) => updateFilter('page', String(next))} />
        )}
      </section>
    </main>
  )
}

export default BlogHome
