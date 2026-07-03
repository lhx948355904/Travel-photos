import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import App from "./App";
import "./styles/global.css";
import "./styles/landing.css";
import "./styles/map.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#000000",
          colorSuccess: "#1ea64a",
          colorError: "#c92a2a",
          colorText: "#000000",
          colorTextSecondary: "#1f1f1f",
          borderRadius: 8,
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif",
        },
        components: {
          Button: {
            borderRadius: 50,
            controlHeight: 40,
            fontWeight: 480,
          },
          Input: {
            borderRadius: 8,
            controlHeight: 44,
          },
          DatePicker: {
            borderRadius: 8,
            controlHeight: 44,
          },
          Modal: {
            borderRadiusLG: 24,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
