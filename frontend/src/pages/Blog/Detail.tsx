import { ArrowLeftOutlined, ClockCircleOutlined, HomeOutlined } from '@ant-design/icons'
import { Button, Result, Skeleton } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useParams } from 'react-router-dom'
import { getBlogPost } from '../../api/blog'
import BlogHeader from '../../components/BlogHeader'
import BlogMarkdown from '../../components/BlogMarkdown'
import type { BlogPostDetail } from '../../types/blog'
import { formatBlogDate } from './utils'

const BlogDetailPage = () => {
  const { slug = '' } = useParams()
  const [detail, setDetail] = useState<BlogPostDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getBlogPost(slug)
      .then((result) => active && setDetail(result))
      .catch((err: Error & { status?: number }) => active && setError(err.status === 404 ? '文章不存在或尚未发布' : err.message))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [slug])

  const jsonLd = useMemo(() => {
    if (!detail) return ''
    const post = detail.post
    return JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      mainEntityOfPage: `https://lhxjourney.cn/blog/${post.slug}`,
      image: post.coverUrl ? `https://lhxjourney.cn${post.coverUrl}` : undefined,
      author: { '@type': 'Person', name: '旅途拾光' },
    }).replace(/</g, '\\u003c')
  }, [detail])

  if (loading) {
    return <main className="blog-article-page"><BlogHeader tone="light" /><div className="blog-article-loading"><Skeleton active paragraph={{ rows: 14 }} /></div></main>
  }

  if (!detail || error) {
    return (
      <main className="blog-article-page">
        <BlogHeader tone="light" />
        <Result status="404" title="找不到这篇文章" subTitle={error || '文章可能已撤回或链接有误'}
          extra={<Button type="primary"><Link to="/blog">返回知识博客</Link></Button>} />
      </main>
    )
  }

  const { post, relatedPosts } = detail

  return (
    <main className="blog-article-page">
      <Helmet>
        <title>{post.title} | 知识博客</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={`https://lhxjourney.cn/blog/${post.slug}`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:url" content={`https://lhxjourney.cn/blog/${post.slug}`} />
        {post.coverUrl && <meta property="og:image" content={`https://lhxjourney.cn${post.coverUrl}`} />}
        <script type="application/ld+json">{jsonLd}</script>
      </Helmet>
      <BlogHeader tone="light" />

      <header className="blog-article-hero">
        <div className="blog-article-breadcrumb">
          <Link to="/"><HomeOutlined /> 首页</Link><span>/</span><Link to="/blog">知识博客</Link><span>/</span><span>{post.category?.name}</span>
        </div>
        <div className="blog-article-heading">
          <h1>{post.title}</h1>
          <div className="blog-article-meta">
            <time>{formatBlogDate(post.publishedAt)}</time>
            <span><ClockCircleOutlined /> {post.readingTimeMinutes} 分钟阅读</span>
            <span>更新于 {formatBlogDate(post.updatedAt)}</span>
          </div>
          <div className="blog-inline-tags">{post.tags.map((tag) => <span key={tag.id}>#{tag.name}</span>)}</div>
        </div>
      </header>

      <div className="blog-article-layout">
        <article className="blog-article-content"><BlogMarkdown content={detail.contentMarkdown} /></article>
      </div>

      <footer className="blog-article-footer">
        <div className="blog-article-end">
          <div>
            <span>阅读完毕</span>
            <strong>继续探索更多技术文章</strong>
          </div>
          <Link className="blog-back-link" to="/blog"><ArrowLeftOutlined /> 返回文章列表</Link>
        </div>
        {relatedPosts.length > 0 && (
          <section className="blog-related">
            <span>KEEP READING</span><h2>继续阅读</h2>
            <div>
              {relatedPosts.map((item) => (
                <Link to={`/blog/${item.slug}`} key={item.id}>
                  <small>{item.category?.name}</small><strong>{item.title}</strong><span>{item.readingTimeMinutes} 分钟 ↗</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </footer>
    </main>
  )
}

export default BlogDetailPage
