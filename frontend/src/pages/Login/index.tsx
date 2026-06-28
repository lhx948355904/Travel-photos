import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, message } from 'antd'
import { ArrowLeftOutlined, EnvironmentOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import { login } from '../../api/auth'
import { useAuthStore } from '../../store/useAuthStore'

const Login = () => {
  const navigate = useNavigate()
  const { setToken } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res = await login(values)
      setToken(res.token)
      message.success('登录成功')
      navigate('/')
    } catch (error: any) {
      message.error(error.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-backdrop" aria-hidden="true" />
      <section className="login-shell">
        <div className="login-visual">
          <button type="button" className="login-back" onClick={() => navigate('/')}>
            <ArrowLeftOutlined />
            返回地图
          </button>

          <div className="login-brand-lockup">
            <div className="brand-mark">
              <EnvironmentOutlined />
            </div>
            <div>
              <span>Travel Photo Map</span>
              <h1>旅行摄影地图</h1>
            </div>
          </div>

          <div className="login-route-card">
            <span>Admin Access</span>
            <strong>地点与照片管理</strong>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-panel-header">
            <span>管理员登录</span>
            <h2>进入管理台</h2>
          </div>

          <Form onFinish={handleSubmit} layout="vertical" requiredMark={false}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
                size="large"
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="login-submit"
              >
                登录
              </Button>
            </Form.Item>
          </Form>
        </div>
      </section>
    </main>
  )
}

export default Login
