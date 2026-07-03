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
          colorPrimary: "#9fe870",
          colorPrimaryHover: "#cdffad",
          colorPrimaryActive: "#c5edab",
          colorSuccess: "#1ea64a",
          colorError: "#c92a2a",
          colorText: "#0e0f0c",
          colorTextSecondary: "#454745",
          colorBgLayout: "#e8ebe6",
          colorBorder: "rgba(14, 15, 12, 0.14)",
          colorTextLightSolid: "#0e0f0c",
          borderRadius: 12,
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif",
        },
        components: {
          Button: {
            borderRadius: 24,
            controlHeight: 44,
            fontWeight: 700,
          },
          Input: {
            borderRadius: 12,
            controlHeight: 44,
          },
          DatePicker: {
            borderRadius: 12,
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
