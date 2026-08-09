import {
  BoldOutlined,
  CodeOutlined,
  EyeOutlined,
  FileTextOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  SaveOutlined,
  SendOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { Button, Input, message, Modal, Progress, Select, Space, Tabs, Tooltip } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createBlogDraft,
  getAdminBlogPost,
  publishBlogPost,
  saveBlogDraft,
  uploadBlogAsset,
} from '../../api/blog'
import BlogHeader from '../../components/BlogHeader'
import BlogMarkdown from '../../components/BlogMarkdown'
import type { BlogPostInput, BlogStatus } from '../../types/blog'
import { blogDraftKey } from './utils'

const categorySuggestions = ['Java', '前端', '运维', '数据库', 'AI 与工具']
const emptyInput: BlogPostInput = {
  title: '', excerpt: '', contentMarkdown: '', categoryName: '', tagNames: [], coverAssetId: null,
}
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const BlogEditorPage = () => {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const numericId = routeId ? Number(routeId) : null
  const [postId, setPostId] = useState<number | null>(numericId)
  const [status, setStatus] = useState<BlogStatus>('DRAFT')
  const [input, setInput] = useState<BlogPostInput>(emptyInput)
  const [loading, setLoading] = useState(Boolean(numericId))
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [mobileMode, setMobileMode] = useState<'edit' | 'preview'>('edit')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const storageKey = blogDraftKey(postId || 'new')
  const setField = <K extends keyof BlogPostInput>(key: K, value: BlogPostInput[K]) => {
    setInput((previous) => ({ ...previous, [key]: value }))
    setDirty(true)
    setSaveState('idle')
  }

  useEffect(() => {
    if (!numericId) {
      const local = window.localStorage.getItem(blogDraftKey('new'))
      if (local) {
        try { setInput(JSON.parse(local) as BlogPostInput) } catch { window.localStorage.removeItem(blogDraftKey('new')) }
      }
      return
    }

    let active = true
    getAdminBlogPost(numericId)
      .then((detail) => {
        if (!active) return
        const serverInput: BlogPostInput = {
          title: detail.post.title || '', slug: detail.post.slug?.startsWith('draft-') ? '' : detail.post.slug,
          excerpt: detail.post.excerpt || '', contentMarkdown: detail.contentMarkdown || '',
          categoryName: detail.post.category?.name || '', tagNames: detail.post.tags.map((tag) => tag.name),
          coverAssetId: detail.post.coverAssetId,
        }
        setStatus(detail.post.status)
        const local = window.localStorage.getItem(blogDraftKey(numericId))
        if (local) {
          Modal.confirm({
            title: '发现本地恢复稿',
            content: '上次离开编辑器时有未提交内容，是否恢复？',
            okText: '恢复本地稿', cancelText: '使用服务器版本',
            onOk: () => { setInput(JSON.parse(local) as BlogPostInput); setDirty(true) },
            onCancel: () => { setInput(serverInput); window.localStorage.removeItem(blogDraftKey(numericId)) },
          })
        } else setInput(serverInput)
      })
      .catch((err: Error) => message.error(err.message || '加载文章失败'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [numericId])

  useEffect(() => {
    if (!dirty) return
    window.localStorage.setItem(storageKey, JSON.stringify(input))
  }, [dirty, input, storageKey])

  const saveDraft = useCallback(async (silent = false) => {
    if (status === 'PUBLISHED') {
      if (!silent) message.info('已发布文章的修改已保存在本地，点击“更新发布”才会上线')
      return postId
    }
    setSaveState('saving')
    try {
      if (!postId) {
        const detail = await createBlogDraft(input)
        setPostId(detail.post.id)
        setStatus(detail.post.status)
        window.localStorage.removeItem(blogDraftKey('new'))
        window.localStorage.setItem(blogDraftKey(detail.post.id), JSON.stringify(input))
        navigate(`/blog/edit/${detail.post.id}`, { replace: true })
        setDirty(false)
        setSaveState('saved')
        if (!silent) message.success('服务器草稿已创建，后续将自动保存')
        return detail.post.id
      }
      await saveBlogDraft(postId, input)
      setDirty(false)
      setSaveState('saved')
      window.localStorage.removeItem(blogDraftKey(postId))
      if (!silent) message.success('草稿已保存')
      return postId
    } catch (err) {
      setSaveState('error')
      if (!silent) message.error((err as Error).message || '保存失败')
      return null
    }
  }, [input, navigate, postId, status])

  useEffect(() => {
    if (!postId || status !== 'DRAFT' || !dirty) return
    const timer = window.setTimeout(() => void saveDraft(true), 2000)
    return () => window.clearTimeout(timer)
  }, [dirty, input, postId, saveDraft, status])

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveDraft(false)
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('keydown', shortcut)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      window.removeEventListener('keydown', shortcut)
    }
  }, [dirty, saveDraft])

  const publish = async () => {
    if (!input.title.trim() || !input.contentMarkdown.trim() || !input.categoryName.trim()) {
      message.warning('发布前请填写标题、正文和分类')
      return
    }
    setSaveState('saving')
    try {
      let currentId = postId
      if (!currentId) {
        const created = await createBlogDraft(input)
        currentId = created.post.id
        setPostId(currentId)
      }
      const detail = await publishBlogPost(currentId, input)
      setStatus('PUBLISHED')
      setDirty(false)
      setSaveState('saved')
      window.localStorage.removeItem(blogDraftKey(currentId))
      window.localStorage.removeItem(blogDraftKey('new'))
      message.success(status === 'PUBLISHED' ? '线上文章已更新' : '文章已发布')
      navigate(`/blog/edit/${detail.post.id}`, { replace: true })
    } catch (err) {
      setSaveState('error')
      message.error((err as Error).message || '发布失败，线上内容未改变')
    }
  }

  const insertMarkdown = (before: string, after = '', placeholder = '文本') => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = input.contentMarkdown.slice(start, end) || placeholder
    const next = `${input.contentMarkdown.slice(0, start)}${before}${selected}${after}${input.contentMarkdown.slice(end)}`
    setField('contentMarkdown', next)
    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  const uploadImage = async (file: File, asCover = false) => {
    setUploadProgress(0)
    try {
      const asset = await uploadBlogAsset(file, setUploadProgress)
      if (asCover) setField('coverAssetId', asset.id)
      else {
        const alt = file.name.replace(/\.[^.]+$/, '')
        insertMarkdown(`![${alt}](`, ')', asset.url)
      }
      message.success(asCover ? '封面已上传' : '图片已插入正文')
    } catch (err) {
      message.error((err as Error).message || '图片上传失败')
    } finally {
      setUploadProgress(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const toolbar = useMemo(() => [
    { label: '二级标题', icon: <FileTextOutlined />, action: () => insertMarkdown('\n## ', '', '标题') },
    { label: '粗体', icon: <BoldOutlined />, action: () => insertMarkdown('**', '**') },
    { label: '链接', icon: <LinkOutlined />, action: () => insertMarkdown('[', '](https://)', '链接文字') },
    { label: '引用', icon: <span>❝</span>, action: () => insertMarkdown('\n> ', '', '引用内容') },
    { label: '无序列表', icon: <UnorderedListOutlined />, action: () => insertMarkdown('\n- ', '', '列表项') },
    { label: '有序列表', icon: <OrderedListOutlined />, action: () => insertMarkdown('\n1. ', '', '列表项') },
    { label: '行内代码', icon: <CodeOutlined />, action: () => insertMarkdown('`', '`', 'code') },
    { label: '代码块', icon: <span>{'{ }'}</span>, action: () => insertMarkdown('\n```ts\n', '\n```\n', 'const value = true') },
    { label: '图片', icon: <PictureOutlined />, action: () => fileInputRef.current?.click() },
  ], [input.contentMarkdown])

  if (loading) return <main className="blog-editor-page"><BlogHeader tone="light" /><div className="blog-editor-loading">正在打开编辑器…</div></main>

  return (
    <main className="blog-editor-page">
      <Helmet><title>{postId ? '编辑文章' : '新建文章'} | 知识博客</title></Helmet>
      <BlogHeader tone="light" />
      <div className="blog-editor-commandbar">
        <div>
          <span className={`blog-status-dot is-${status.toLowerCase()}`} />
          <strong>{status === 'PUBLISHED' ? '已发布' : '草稿'}</strong>
          <small>{saveState === 'saving' ? '保存中…' : saveState === 'saved' ? '已保存' : saveState === 'error' ? '保存失败，本地稿仍在' : dirty ? '有未保存修改' : '内容已同步'}</small>
        </div>
        <div>
          <Button aria-label={postId ? '保存草稿' : '创建草稿'} icon={<SaveOutlined />} onClick={() => void saveDraft(false)}>{postId ? '保存草稿' : '创建草稿'}</Button>
          <Button aria-label={status === 'PUBLISHED' ? '更新发布' : '发布文章'} type="primary" icon={<SendOutlined />} loading={saveState === 'saving'} onClick={() => void publish()}>
            {status === 'PUBLISHED' ? '更新发布' : '发布文章'}
          </Button>
        </div>
      </div>

      <div className="blog-editor-titlebar">
        <Input.TextArea
          value={input.title}
          onChange={(event) => setField('title', event.target.value)}
          maxLength={160}
          autoSize={{ minRows: 1, maxRows: 3 }}
          placeholder="一篇值得被再次找到的文章"
          aria-label="文章标题"
        />
      </div>

      <Tabs className="blog-editor-mobile-tabs" activeKey={mobileMode} onChange={(key) => setMobileMode(key as 'edit' | 'preview')}
        items={[{ key: 'edit', label: <span><FileTextOutlined /> 编辑</span> }, { key: 'preview', label: <span><EyeOutlined /> 预览</span> }]} />

      <div className={`blog-editor-workspace show-${mobileMode}`}>
        <section className="blog-editor-pane" aria-label="Markdown 编辑区">
          <div className="blog-editor-toolbar">
            {toolbar.map((item) => <Tooltip title={item.label} key={item.label}><Button type="text" icon={item.icon} onClick={item.action} aria-label={item.label} /></Tooltip>)}
          </div>
          <Input.TextArea
            ref={(node) => { textareaRef.current = node?.resizableTextArea?.textArea || null }}
            value={input.contentMarkdown}
            onChange={(event) => setField('contentMarkdown', event.target.value)}
            placeholder={'从一个清晰的问题开始。\n\n## 它是什么\n\n写下你的理解、代码和验证过程。'}
            className="blog-markdown-input"
            spellCheck={false}
          />
          <input ref={fileInputRef} type="file" hidden accept="image/jpeg,image/png,image/webp"
            onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file) }} />
          {uploadProgress !== null && <div className="blog-upload-progress"><span>正在上传图片</span><Progress percent={uploadProgress} size="small" /></div>}
        </section>

        <section className="blog-preview-pane" aria-label="实时预览">
          <div className="blog-preview-label"><EyeOutlined /> 实时预览</div>
          {input.contentMarkdown ? <BlogMarkdown content={input.contentMarkdown} /> : <div className="blog-preview-empty">正文预览会显示在这里</div>}
        </section>

        <aside className="blog-editor-meta" aria-label="文章设置">
          <span className="blog-meta-kicker">PUBLISHING</span><h2>文章设置</h2>
          <label>主分类</label>
          <Select mode="tags" maxCount={1} value={input.categoryName ? [input.categoryName] : []}
            onChange={(value) => setField('categoryName', value[0] || '')}
            options={categorySuggestions.map((value) => ({ value, label: value }))} placeholder="选择或输入分类" />
          <label>标签 <small>{input.tagNames.length}/8</small></label>
          <Select mode="tags" value={input.tagNames} maxCount={8} tokenSeparators={[',', '，']}
            onChange={(value) => setField('tagNames', value)} placeholder="输入后回车创建标签" />
          <label>摘要 <small>{input.excerpt.length}/320</small></label>
          <Input.TextArea value={input.excerpt} maxLength={320} rows={5} onChange={(event) => setField('excerpt', event.target.value)} placeholder="为空时将从正文自动生成" />
          <label>固定链接</label>
          <Space.Compact block>
            <Input value="/blog/" disabled aria-label="固定链接前缀" style={{ width: 76 }} />
            <Input value={input.slug || ''} disabled={status === 'PUBLISHED'} onChange={(event) => setField('slug', event.target.value)} placeholder="首次发布时自动生成" />
          </Space.Compact>
          <label>封面</label>
          <label className="blog-cover-uploader">
            <PictureOutlined /><span>{input.coverAssetId ? '更换封面' : '上传可选封面'}</span><small>JPG / PNG / WebP，最大 10MB</small>
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, true) }} />
          </label>
          {status === 'PUBLISHED' && <p className="blog-published-notice">当前修改只保存在浏览器恢复稿中，不会自动覆盖线上文章。</p>}
        </aside>
      </div>
    </main>
  )
}

export default BlogEditorPage
