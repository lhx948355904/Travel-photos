import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Form, Input, Tabs, message } from 'antd'
import { ArrowLeftOutlined, EnvironmentOutlined, LockOutlined, UserOutlined } from '@ant-design/icons'
import { login, register } from '../../api/auth'
import { useAuthStore } from '../../store/useAuthStore'

interface AuthFormValues {
  username: string
  password: string
}

const Login = () => {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)

  const loginAndEnter = async (values: AuthFormValues, successText: string) => {
    const res = await login(values)
    setAuth(res.token, res.user)
    message.success(successText)
    navigate('/')
  }

  const handleSubmit = async (values: AuthFormValues) => {
    setLoading(true)
    try {
      if (mode === 'register') {
        await register(values)
        await loginAndEnter(values, '注册成功，已进入你的旅行地图')
      } else {
        await loginAndEnter(values, '登录成功')
      }
    } catch (error: any) {
      message.error(error.message || (mode === 'register' ? '注册失败' : '登录失败'))
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
            <span>Private Map</span>
            <strong>注册后管理自己的地点与照片</strong>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-panel-header">
            <span>{mode === 'register' ? '创建账号' : '欢迎回来'}</span>
            <h2>{mode === 'register' ? '注册你的旅行相册' : '登录你的旅行地图'}</h2>
          </div>

          <Tabs
            activeKey={mode}
            onChange={(key) => setMode(key as 'login' | 'register')}
            items={[
              { key: 'login', label: '登录' },
              { key: 'register', label: '注册' },
            ]}
          />

          <Form onFinish={handleSubmit} layout="vertical" requiredMark={false}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少 3 个字符' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少 6 位' },
              ]}
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
                {mode === 'register' ? '注册并登录' : '登录'}
              </Button>
            </Form.Item>
          </Form>
        </div>
      </section>
    </main>
  )
}

export default Login
