import { DeleteOutlined, EditOutlined, EyeInvisibleOutlined, PlusOutlined, SearchOutlined, SendOutlined } from '@ant-design/icons'
import { Button, Input, message, Modal, Pagination, Segmented, Skeleton } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { deleteBlogPost, getAdminBlogPosts, getAdminBlogPost, publishBlogPost, unpublishBlogPost } from '../../api/blog'
import BlogHeader from '../../components/BlogHeader'
import type { BlogPage, BlogPostInput, BlogPostSummary, BlogStatus } from '../../types/blog'
import { formatBlogDate } from './utils'

const emptyPage: BlogPage<BlogPostSummary> = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 }

const BlogManagePage = () => {
  const [data, setData] = useState(emptyPage)
  const [status, setStatus] = useState<BlogStatus | ''>('')
  const [query, setQuery] = useState('')
  const [committedQuery, setCommittedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    getAdminBlogPosts({ page, pageSize: 20, q: committedQuery, status })
      .then(setData)
      .catch((err: Error) => message.error(err.message || '文章列表加载失败'))
      .finally(() => setLoading(false))
  }, [committedQuery, page, status])

  useEffect(load, [load])

  const buildInput = async (id: number): Promise<BlogPostInput> => {
    const detail = await getAdminBlogPost(id)
    return {
      title: detail.post.title,
      slug: detail.post.slug.startsWith('draft-') ? '' : detail.post.slug,
      excerpt: detail.post.excerpt,
      contentMarkdown: detail.contentMarkdown,
      categoryName: detail.post.category?.name || '',
      tagNames: detail.post.tags.map((tag) => tag.name),
      coverAssetId: detail.post.coverAssetId,
    }
  }

  const publish = async (post: BlogPostSummary) => {
    try {
      await publishBlogPost(post.id, await buildInput(post.id))
      message.success('文章已发布')
      load()
    } catch (err) { message.error((err as Error).message || '发布失败') }
  }

  const unpublish = async (post: BlogPostSummary) => {
    Modal.confirm({
      title: '撤回这篇文章？', content: '公开链接将立即无法访问，内容会保留为草稿。', okText: '确认撤回', cancelText: '取消',
      onOk: async () => {
        try { await unpublishBlogPost(post.id); message.success('文章已撤回为草稿'); load() }
        catch (err) { message.error((err as Error).message || '撤回失败') }
      },
    })
  }

  const remove = (post: BlogPostSummary) => {
    Modal.confirm({
      title: '删除这篇文章？', content: '文章会被逻辑删除，不再出现在管理列表和公开页面。', okText: '删除', okButtonProps: { danger: true }, cancelText: '取消',
      onOk: async () => {
        try { await deleteBlogPost(post.id); message.success('文章已删除'); load() }
        catch (err) { message.error((err as Error).message || '删除失败') }
      },
    })
  }

  return (
    <main className="blog-manage-page">
      <Helmet><title>文章管理 | 知识博客</title></Helmet>
      <BlogHeader tone="light" />
      <section className="blog-manage-shell">
        <header className="blog-manage-heading">
          <div><span>EDITORIAL DESK</span><h1>文章管理</h1><p>集中处理草稿、发布状态与日常维护。</p></div>
          <Button type="primary" icon={<PlusOutlined />} aria-label="新建文章"><Link to="/blog/write">新建文章</Link></Button>
        </header>

        <div className="blog-manage-filters">
          <Segmented value={status || 'ALL'} options={[{ label: '全部', value: 'ALL' }, { label: '草稿', value: 'DRAFT' }, { label: '已发布', value: 'PUBLISHED' }]}
            onChange={(value) => { setStatus(value === 'ALL' ? '' : value as BlogStatus); setPage(1) }} />
          <form onSubmit={(event) => { event.preventDefault(); setCommittedQuery(query.trim()); setPage(1) }}>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} prefix={<SearchOutlined />} placeholder="搜索文章" allowClear />
          </form>
        </div>

        <div className="blog-manage-list" aria-live="polite">
          <div className="blog-manage-list-head"><span>文章</span><span>状态</span><span>更新时间</span><span>操作</span></div>
          {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : data.items.length === 0 ? (
            <div className="blog-manage-empty"><FileBlankIcon /><h2>这里还没有文章</h2><p>从一个草稿开始，第一篇文章不必完美。</p></div>
          ) : data.items.map((post) => (
            <article key={post.id} className="blog-manage-row">
              <div className="blog-manage-title"><small>{post.category?.name || '未分类'}</small><strong>{post.title || '无标题草稿'}</strong><span>{post.excerpt || '暂时没有摘要'}</span></div>
              <div><span className={`blog-status-chip is-${post.status.toLowerCase()}`}>{post.status === 'PUBLISHED' ? '已发布' : '草稿'}</span></div>
              <time>{formatBlogDate(post.updatedAt)}</time>
              <div className="blog-manage-actions">
                <Button type="text" icon={<EditOutlined />}><Link to={`/blog/edit/${post.id}`}>编辑</Link></Button>
                {post.status === 'DRAFT' ? <Button type="text" icon={<SendOutlined />} onClick={() => void publish(post)}>发布</Button>
                  : <Button type="text" icon={<EyeInvisibleOutlined />} onClick={() => void unpublish(post)}>撤回</Button>}
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(post)}>删除</Button>
              </div>
            </article>
          ))}
        </div>
        {data.totalPages > 1 && <Pagination current={page} pageSize={20} total={data.total} showSizeChanger={false} onChange={setPage} />}
      </section>
    </main>
  )
}

const FileBlankIcon = () => <span className="blog-empty-glyph" aria-hidden="true">¶</span>

export default BlogManagePage
