import {
  CalendarOutlined,
  CloseOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  MailOutlined,
  MenuOutlined,
  PhoneOutlined,
  ProfileOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { getLocations } from "../../api/location";
import type { Location } from "../../types";

const VIDEO_TRANSITION_MS = 1000;

interface StoryBase {
  label: string;
  title: string;
  heading: [string, string];
  lead: string;
  poster: string;
  src: string;
  panel?: StoryPanel;
}

type StoryPanel =
  | {
      type: "project";
      eyebrow: string;
      title: string;
      description: string;
      chips: string[];
    }
  | {
      type: "profile";
      contacts: Array<{
        label: string;
        value: string;
        icon: ReactNode;
      }>;
      work: Array<{
        company: string;
        time: string;
        role: string;
        detail: string;
      }>;
    }
  | {
      type: "skills";
      items: string[];
    }
  | {
      type: "tech";
      sections: Array<{
        title: string;
        body?: string;
        items?: string[];
      }>;
    };

const cinematicStories: StoryBase[] = [
  {
    label: "Golden Hour",
    title: "金色时刻",
    heading: ["鸿翔の", "摄影之旅"],
    lead: "摄影是思维的具象化，眼睛是心灵的编译器。愿你身边皆美景，事事皆好运~",
    poster: "/landing-float-landscape-lake.png",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081127_0992a171-d3c6-4978-8213-0ec5df8b6d63.mp4",
  },
  {
    label: "Profile",
    title: "个人简介",
    heading: ["刘鸿翔", "前端 & 全栈"],
    lead: "熟悉前端工程化、业务系统交付和 AI 辅助开发，正在通过旅行摄影地图项目补齐接口、数据库、鉴权、对象存储与部署能力。",
    poster: "/landing-float-landscape-coast.png",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_092026_dd05b805-ea0f-40b2-8c52-332b88502592.mp4",
    panel: {
      type: "profile",
      contacts: [
        { label: "现居", value: "北京天通苑", icon: <EnvironmentOutlined /> },
        { label: "生日", value: "1996.02.22", icon: <CalendarOutlined /> },
        {
          label: "电话",
          value: "17778191619（同微信）",
          icon: <PhoneOutlined />,
        },
        { label: "邮箱", value: "17778191619@163.com", icon: <MailOutlined /> },
      ],
      work: [
        {
          company: "美团 · 闪购 · 运营终端（纬创外派）",
          time: "2025.03 ~ 2026.06",
          role: "前端开发工程师",
          detail: "负责 M 端需求、国补需求迭代，参与部分 AI 建设，全栈开发。",
        },
        {
          company: "知乎 · 安全与治理中心（中电外派）",
          time: "2023.07 ~ 2025.02",
          role: "前端开发工程师",
          detail:
            "主 owner 公司 B 端反作弊所有项目评审开发迭代，筋斗云插件开发升级，治理测需求支持。",
        },
        {
          company: "滴滴出行 · 顺风车部门（博彦外派）",
          time: "2021.08 ~ 2023.01",
          role: "Web 开发",
          detail: "负责顺风车业务页面、活动页和运营配置能力建设。",
        },
        {
          company: "量奇科技（北京）有限公司",
          time: "2018.03 ~ 2021.08",
          role: "前端开发组长",
          detail: "负责团队前端架构、项目交付、组件沉淀和质量把控。",
        },
      ],
    },
  },
  {
    label: "Tech Stack",
    title: "技术栈",
    heading: ["技术栈", "能力画像"],
    lead: "围绕 AI 工具链、前端工程化、业务组件、全栈基础和部署链路，形成可以支撑个人项目持续迭代的开发能力。",
    poster: "/landing-float-landscape-village.png",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081042_df7202bf-bd80-4b2b-bbc6-1f09ba2870e9.mp4",
    panel: {
      type: "skills",
      items: [
        "熟悉 Codex、Catpaw、Cursor，能把 AI 工具融入日常开发工作流。",
        "了解 RAG、Skill、Spec、Harness 等 AI 辅助开发概念及应用方式。",
        "了解 Java、PostgreSQL、SQL 查询，能配合 AI 完成部分全栈开发。",
        "了解 Docker、Nginx 配置，个人项目使用 Docker + 腾讯云 + COS 存储部署。",
        "精通 React、Hooks、Umi 系列与微前端。",
        "精通 ProComponents、Ant Design 4/5 生态组件及依赖业务编写。",
        "精通 pnpm + monorepo、业务抽离包、配置抽离等工程化实践。",
        "熟悉 Husky、Git 生命周期、提交前 lint、公共文件修改校验和部分 Node 命令。",
        "精通浏览器插件开发，并能与 Chrome 交互完成工具链闭环。",
      ],
    },
  },
  {
    label: "Delivery Loop",
    title: "交付闭环",
    heading: ["技术框架", "交付基座"],
    lead: "保留项目运行所依赖的核心技术框架，聚焦前端、后端、数据库、对象存储、鉴权和部署这些全栈交付基础。",
    poster: "/landing-archive.png",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_080959_4cac5234-3573-464e-a5b7-76b94b8a7d61.mp4",
    panel: {
      type: "tech",
      sections: [
        {
          title: "技术框架",
          body: "Ubuntu + Docker + Nginx + React 18 + TypeScript + Vite + Ant Design 5 + 高德地图 API + Spring Boot 3 + Java 17 + MyBatis-Plus + PostgreSQL/PostGIS + 腾讯云 COS + JWT + WebSocket + Codex",
        },
      ],
    },
  },
];

const overlayImage =
  "https://soft-zoom-63098134.figma.site/_assets/v11/0b4a435b2df2747593c43d7a1c9b4578f7d8d90c.png";

const navLinks = ["地图故事", "照片归档", "技术栈", "维护入口"];

const baseStats = [
  "React 18 + TypeScript",
  "Spring Boot API",
  "PostgreSQL / PostGIS",
  "腾讯云 COS",
];

const collectLandingStats = (locations: Location[]) => {
  const photoCount = locations.reduce(
    (total, location) =>
      total + (location.photoCount || location.photos?.length || 0),
    0,
  );

  return [
    `${locations.length || 0} 个旅行地点`,
    `${photoCount || 0} 张归档照片`,
    ...baseStats.slice(1),
  ];
};

const Home = () => {
  const navigate = useNavigate();
  const transitionTimerRef = useRef<number>();
  const [activeVideo, setActiveVideo] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState(baseStats);

  const isDeepWoods = activeVideo === 2;
  const activeStory = cinematicStories[activeVideo];

  const enterMap = useCallback(() => {
    navigate("/map");
  }, [navigate]);

  const enterLogin = useCallback(() => {
    navigate("/login");
  }, [navigate]);

  const handleVideoSwitch = (index: number) => {
    if (index === activeVideo || isTransitioning) return;

    window.clearTimeout(transitionTimerRef.current);
    setActiveVideo(index);
    setIsTransitioning(true);

    transitionTimerRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
    }, VIDEO_TRANSITION_MS);
  };

  useEffect(() => {
    let isMounted = true;

    getLocations()
      .then((locations) => {
        if (isMounted) setStats(collectLandingStats(locations));
      })
      .catch(() => {
        if (isMounted) setStats(baseStats);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("landing-menu-lock", isMobileMenuOpen);

    return () => {
      document.body.classList.remove("landing-menu-lock");
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    return () => window.clearTimeout(transitionTimerRef.current);
  }, []);

  return (
    <main
      className={`landing-page${isDeepWoods ? " landing-page--deep" : ""}`}
      aria-label="旅行摄影地图首页"
    >
      <section className="landing-cinema" id="top">
        <div className="landing-video-stack" aria-hidden="true">
          {cinematicStories.map((video, index) => (
            <video
              key={video.src}
              className={`landing-video${
                activeVideo === index ? " landing-video--active" : ""
              }`}
              src={video.src}
              poster={video.poster}
              autoPlay
              muted
              loop
              playsInline
              preload={index === 0 ? "auto" : "metadata"}
            />
          ))}
        </div>

        <img
          className="landing-train-overlay"
          src={overlayImage}
          alt=""
          aria-hidden="true"
        />
        <div className="landing-cinema__shade" aria-hidden="true" />

        <div className="landing-content">
          <header className="landing-nav" aria-label="首页导航">
            <a className="landing-logo" href="#top" aria-label="返回首页顶部">
              Travel Photo Map
            </a>

            <nav
              className="landing-nav__links liquid-glass"
              aria-label="桌面导航"
            >
              {navLinks.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={item === "维护入口" ? enterLogin : enterMap}
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                className="landing-nav__cta"
                onClick={enterMap}
              >
                打开地图
              </button>
            </nav>

            <button
              type="button"
              className={`landing-menu-button liquid-glass${
                isMobileMenuOpen ? " landing-menu-button--open" : ""
              }`}
              aria-label={isMobileMenuOpen ? "关闭菜单" : "打开菜单"}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((open) => !open)}
            >
              <MenuOutlined className="landing-menu-button__icon landing-menu-button__icon--menu" />
              <CloseOutlined className="landing-menu-button__icon landing-menu-button__icon--close" />
            </button>
          </header>

          <div
            className={`landing-mobile-menu${isMobileMenuOpen ? " landing-mobile-menu--open" : ""}`}
            aria-hidden={!isMobileMenuOpen}
          >
            <div className="landing-mobile-menu__backdrop" />
            <nav className="landing-mobile-menu__panel" aria-label="移动端导航">
              {navLinks.map((item, index) => (
                <button
                  key={item}
                  type="button"
                  style={
                    { "--delay": `${100 + index * 50}ms` } as CSSProperties
                  }
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    item === "维护入口" ? enterLogin() : enterMap();
                  }}
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                className="landing-mobile-menu__cta"
                style={{ "--delay": "300ms" } as CSSProperties}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  enterMap();
                }}
              >
                进入地图
              </button>
            </nav>
          </div>

          <div
            className={`landing-hero${activeStory.panel ? " landing-hero--with-panel" : ""}`}
          >
            <h1>
              {activeStory.heading[0]}
              <br />
              {activeStory.heading[1]}
            </h1>

            <p className="landing-hero__lead">{activeStory.lead}</p>

            {activeStory.panel && (
              <StoryPanelContent panel={activeStory.panel} />
            )}

            <div className="landing-access">
              <button type="button" onClick={enterMap}>
                <CompassOutlined />
                <span>进入地图</span>
              </button>
            </div>

            <div className="landing-video-switcher" aria-label="背景视频切换">
              {cinematicStories.map((video, index) => (
                <button
                  key={video.src}
                  type="button"
                  className={activeVideo === index ? "is-active" : ""}
                  disabled={isTransitioning && activeVideo !== index}
                  aria-pressed={activeVideo === index}
                  onClick={() => handleVideoSwitch(index)}
                >
                  <span>{video.label}</span>
                  <strong>{video.title}</strong>
                </button>
              ))}
            </div>
          </div>

          <footer className="landing-stats" aria-label="项目数据">
            {stats.map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </footer>
        </div>
      </section>
    </main>
  );
};

const StoryPanelContent = ({ panel }: { panel: StoryPanel }) => {
  if (panel.type === "profile") {
    return (
      <section
        className="landing-story-panel landing-story-panel--profile"
        aria-label="个人简介"
      >
        <div className="landing-story-panel__heading">
          <ProfileOutlined />
          <div>
            <span>Profile</span>
            <h2>刘鸿翔</h2>
          </div>
        </div>

        <div className="landing-profile-summary" aria-label="联系方式">
          {panel.contacts.map((contact) => (
            <div key={contact.label}>
              <span>{contact.icon}</span>
              <small>{contact.label}</small>
              <strong>{contact.value}</strong>
            </div>
          ))}
        </div>

        <div className="landing-work-summary" aria-label="工作经历">
          {panel.work.map((item) => (
            <article key={item.company}>
              <div>
                <h3>{item.company}</h3>
                <p>{item.detail}</p>
              </div>
              <span>
                {item.time} / {item.role}
              </span>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (panel.type === "skills") {
    return (
      <section
        className="landing-story-panel landing-story-panel--skills liquid-glass"
        aria-label="技术栈"
      >
        <div className="landing-story-panel__heading">
          <ToolOutlined />
          <div>
            <span>Tech Stack</span>
            <h2>技术栈</h2>
          </div>
        </div>

        <div className="landing-skill-list">
          {panel.items.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>
    );
  }

  if (panel.type === "tech") {
    return (
      <section
        className="landing-story-panel landing-story-panel--tech liquid-glass"
        aria-label="技术栈"
      >
        <div className="landing-story-panel__heading">
          <ToolOutlined />
          <div>
            <span>Tech Stack</span>
            <h2>技术架构与项目要点</h2>
          </div>
        </div>

        <div className="landing-tech-sections">
          {panel.sections.map((section) => (
            <section key={section.title}>
              <h3>{section.title}</h3>
              {section.body && <p>{section.body}</p>}
              {section.items && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="landing-story-panel landing-story-panel--project liquid-glass"
      aria-label="项目说明"
    >
      <div className="landing-story-panel__heading">
        <FieldTimeOutlined />
        <div>
          <span>{panel.eyebrow}</span>
          <h2>{panel.title}</h2>
        </div>
      </div>
      <p>{panel.description}</p>
      <div className="landing-story-chips" aria-label="项目关键词">
        {panel.chips.map((chip) => (
          <span key={chip}>{chip}</span>
        ))}
      </div>
    </section>
  );
};

export default Home;
