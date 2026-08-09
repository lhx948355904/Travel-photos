import { lazy, Suspense, type ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "./store/useAuthStore";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Map from "./pages/Map";
import Test from "./pages/Test";

const Universe = lazy(() => import("./pages/Universe"));
const BlogHome = lazy(() => import("./pages/Blog"));
const BlogDetail = lazy(() => import("./pages/Blog/Detail"));
const BlogEditor = lazy(() => import("./pages/Blog/Editor"));
const BlogManage = lazy(() => import("./pages/Blog/Manage"));

const ICP_BEIAN_URL = "https://beian.miit.gov.cn/";
const ICP_BEIAN_NUMBER = "沪ICP备2026036429号";

const BlogRoute = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<div className="route-loading">正在打开知识博客…</div>}>{children}</Suspense>
);

const RequireBlogAdmin = ({ children }: { children: ReactNode }) => {
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const redirect = `${window.location.pathname}${window.location.search}`;
  return isAdmin ? children : <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
};

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<Map />} />
        <Route path="/login" element={<Login />} />
        <Route path="/blog" element={<BlogRoute><BlogHome /></BlogRoute>} />
        <Route path="/blog/manage" element={<RequireBlogAdmin><BlogRoute><BlogManage /></BlogRoute></RequireBlogAdmin>} />
        <Route path="/blog/write" element={<RequireBlogAdmin><BlogRoute><BlogEditor /></BlogRoute></RequireBlogAdmin>} />
        <Route path="/blog/edit/:id" element={<RequireBlogAdmin><BlogRoute><BlogEditor /></BlogRoute></RequireBlogAdmin>} />
        <Route path="/blog/:slug" element={<BlogRoute><BlogDetail /></BlogRoute>} />
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
    </HelmetProvider>
  );
}

export default App;
