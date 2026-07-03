import { Button, Form, Input, message } from "antd";
import { LockOutlined, UserOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../api/auth";
import { useAuthStore } from "../../store/useAuthStore";

interface LoginFormValues {
  username: string;
  password: string;
}

const Login = () => {
  const navigate = useNavigate();
  const setToken = useAuthStore((state) => state.setToken);

  const handleSubmit = async (values: LoginFormValues) => {
    try {
      const result = await login(values);
      setToken(result.token);
      message.success("登录成功");
      navigate("/map", { replace: true });
    } catch (err: any) {
      message.error(err.message || "登录失败，请检查账号和密码");
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-label="管理员登录">
        <div className="login-card-heading">
          <span>Travel Photo Map</span>
          <h1>管理员登录</h1>
          <p>登录后可以新增地点、上传照片、编辑描述，并维护地图中的旅行记忆。</p>
        </div>

        <Form<LoginFormValues>
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmit}
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

          <Button type="primary" htmlType="submit" size="large" block>
            登录
          </Button>
        </Form>

        <Link className="login-back-link" to="/map">
          返回地图
        </Link>
      </section>
    </main>
  );
};

export default Login;
