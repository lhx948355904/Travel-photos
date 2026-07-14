import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Map from "./pages/Map";
import Test from "./pages/Test";
import { ModalContainer } from "./pages/Test/Modal";

const Universe = lazy(() => import("./pages/Universe"));

const ICP_BEIAN_URL = "https://beian.miit.gov.cn/";
const ICP_BEIAN_NUMBER = "沪ICP备2026036429号";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<Map />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/universe"
          element={
            <Suspense
              fallback={<div className="route-loading">正在进入照片宇宙…</div>}
            >
              <Universe />
            </Suspense>
          }
        />
        <Route path="/test" element={<Test />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ModalContainer />
      <a
        className="icp-footer-link"
        href={ICP_BEIAN_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`打开工信部备案管理系统：${ICP_BEIAN_NUMBER}`}
      >
        {ICP_BEIAN_NUMBER}
      </a>
    </BrowserRouter>
  );
}

export default App;
