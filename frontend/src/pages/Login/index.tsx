import { useEffect, useState } from "react";
import { Button, Form, Input, message } from "antd";
import {
  ArrowLeftOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../api/auth";
import { useAuthStore } from "../../store/useAuthStore";

interface LoginFormValues {
  username: string;
  password: string;
}

const Login = () => {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const setToken = useAuthStore((state) => state.setToken);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      navigate("/map", { replace: true });
    }
  }, [isAdmin, navigate]);

  const handleSubmit = async (values: LoginFormValues) => {
    setSubmitting(true);
    try {
      const result = await login(values);
      setToken(result.token);
      message.success("登录成功");
      navigate("/map", { replace: true });
    } catch (err: any) {
      message.error(err.message || "登录失败，请检查账号和密码");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-shell" aria-label="管理员登录">
        <div className="login-brief">
          <Link className="login-back-link" to="/map">
            <ArrowLeftOutlined />
            返回地图
          </Link>
          <span className="login-kicker">Admin Workspace</span>
          <h1>管理旅行地图</h1>
          <p>
            登录后可以新增地点、上传照片、编辑描述，并维护这份空间相册的公开展示内容。
          </p>
          <div className="login-trust-list" aria-label="登录后的管理范围">
            <span>地点维护</span>
            <span>照片上传</span>
            <span>内容编辑</span>
          </div>
        </div>

        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card-heading">
            <span>Travel Photo Map</span>
            <h2 id="login-title">管理员登录</h2>
            <p>使用管理员账号进入地图维护模式。</p>
          </div>

          <Form<LoginFormValues>
            layout="vertical"
            requiredMark={false}
            onFinish={handleSubmit}
            className="login-form"
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: "请输入用户名" }]}
            >
              <Input
                prefix={<UserOutlined />}
                autoComplete="username"
                placeholder="请输入用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: "请输入密码" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                autoComplete="current-password"
                placeholder="请输入密码"
                size="large"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting}
              icon={<SafetyCertificateOutlined />}
            >
              登录
            </Button>
          </Form>
        </section>
      </section>
    </main>
  );
};

export default Login;
