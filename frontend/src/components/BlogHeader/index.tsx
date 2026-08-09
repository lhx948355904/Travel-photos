import { ArrowLeftOutlined, EditOutlined, MenuOutlined, SettingOutlined } from '@ant-design/icons'
import { Button, Dropdown } from 'antd'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

interface BlogHeaderProps {
  tone?: 'dark' | 'light'
}

const BlogHeader = ({ tone = 'dark' }: BlogHeaderProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = useAuthStore((state) => state.isAdmin)
  const openWriter = () => {
    if (isAdmin) navigate('/blog/write')
    else navigate(`/login?redirect=${encodeURIComponent('/blog/write')}`)
  }

  return (
    <header className={`blog-header blog-header-${tone}`}>
      <Link className="blog-brand" to="/blog" aria-label="知识博客首页">
        <span className="blog-brand-mark">旅</span>
        <span>
          <strong>Knowledge Journal</strong>
          <small>旅途拾光 · 技术知识博客</small>
        </span>
      </Link>
      <nav className="blog-header-nav" aria-label="知识博客导航">
        <Link to="/" className="blog-header-link"><ArrowLeftOutlined /> 返回首页</Link>
        <Link to="/blog" className={location.pathname === '/blog' ? 'is-active' : ''}>文章</Link>
        {isAdmin && <Link to="/blog/manage">管理</Link>}
        <Button type="primary" icon={<EditOutlined />} onClick={openWriter}>写文章</Button>
      </nav>
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'home', label: <Link to="/">返回首页</Link>, icon: <ArrowLeftOutlined /> },
            { key: 'posts', label: <Link to="/blog">文章</Link> },
            ...(isAdmin ? [{ key: 'manage', label: <Link to="/blog/manage">管理文章</Link>, icon: <SettingOutlined /> }] : []),
            { key: 'write', label: '写文章', icon: <EditOutlined />, onClick: openWriter },
          ],
        }}
      >
        <Button className="blog-mobile-menu" type="text" icon={<MenuOutlined />} aria-label="打开博客菜单" />
      </Dropdown>
    </header>
  )
}

export default BlogHeader
