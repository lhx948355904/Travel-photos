import { CheckOutlined, CopyOutlined, LinkOutlined } from '@ant-design/icons'
import { Button, message } from 'antd'
import { Children, isValidElement, type ReactNode, useState } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import ImageSizeEditor from './ImageSizeEditor'
import { imageMarkdown, parseImageTitle } from './imageSize'

interface BlogMarkdownProps {
  content: string
  className?: string
  onImageResize?: (start: number, end: number, markdown: string) => void
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

const BlogMarkdown = ({ content, className = '', onImageResize }: BlogMarkdownProps) => (
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
        img: ({ src = '', alt = '', title = '', node }) => {
          const size = parseImageTitle(title)
          const picture = <img src={src} alt={alt} title={size.title || undefined}
            width={size.width} height={size.height}
            style={{ width: size.width ? `${size.width}px` : 'auto', height: size.height ? `${size.height}px` : 'auto', objectFit: 'contain' }}
            loading="lazy" decoding="async" referrerPolicy="no-referrer" />
          const start = node?.position?.start.offset
          const end = node?.position?.end.offset
          if (!onImageResize || start === undefined || end === undefined) return picture
          return <ImageSizeEditor alt={alt} width={size.width} height={size.height}
            onApply={(width, height) => onImageResize(start, end, imageMarkdown(src, alt, size.title, width, height))}>
            {picture}
          </ImageSizeEditor>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
)

export default BlogMarkdown
