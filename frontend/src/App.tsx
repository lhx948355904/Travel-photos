import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import Home from "./pages/Home"
import Landing from "./pages/Landing"

const ICP_BEIAN_URL = "https://beian.miit.gov.cn/"
const ICP_BEIAN_NUMBER = "\u6CAAICP\u59072026036429\u53F7"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/map" element={<Home />} />
        <Route path="/login" element={<Navigate to="/map" replace />} />
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
  )
}

export default App
