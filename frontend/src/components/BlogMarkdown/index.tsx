import { CheckOutlined, CopyOutlined, LinkOutlined } from '@ant-design/icons'
import { Button, message } from 'antd'
import { Children, isValidElement, type ReactNode, useState } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'

interface BlogMarkdownProps {
  content: string
  className?: string
}

const safeUrlTransform = (url: string) => {
  const value = url.trim()
  if (/^(javascript|vbscript|data):/i.test(value)) return ''
  return defaultUrlTransform(value)
}

const nodeText = (node: ReactNode): string =>
  Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child)
      if (isValidElement<{ children?: ReactNode }>(child)) return nodeText(child.props.children)
      return ''
    })
    .join('')

const CodePre = ({ children }: { children?: ReactNode }) => {
  const [copied, setCopied] = useState(false)
  const code = nodeText(children).replace(/\n$/, '')
  const child = Children.toArray(children)[0]
  const className = isValidElement<{ className?: string }>(child) ? child.props.className : ''
  const language = className?.match(/language-([\w-]+)/)?.[1]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      message.error('复制失败，请手动选择代码')
    }
  }

  return (
    <div className="blog-code-block">
      <div className="blog-code-toolbar">
        <span>{language || 'text'}</span>
        <Button
          type="text"
          size="small"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={copy}
          aria-label="复制代码"
        >
          {copied ? '已复制' : '复制'}
        </Button>
      </div>
      <pre>{children}</pre>
    </div>
  )
}

const BlogMarkdown = ({ content, className = '' }: BlogMarkdownProps) => (
  <div className={`blog-markdown ${className}`.trim()}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug, rehypeHighlight]}
      urlTransform={safeUrlTransform}
      components={{
        pre: CodePre,
        a: ({ href = '', children, ...props }) => {
          const external = /^https?:\/\//i.test(href)
          return (
            <a
              {...props}
              href={href}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer nofollow' : undefined}
            >
              {children}
              {external && <LinkOutlined className="blog-external-link-icon" aria-hidden="true" />}
            </a>
          )
        },
        img: ({ src = '', alt = '' }) => (
          <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
)

export default BlogMarkdown
