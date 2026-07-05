import {
  ArrowRightOutlined,
  CloseOutlined,
  CompassOutlined,
  LoginOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { getLocations } from "../../api/location";
import type { Location } from "../../types";

const VIDEO_TRANSITION_MS = 1000;

const cinematicVideos = [
  {
    label: "Golden Hour",
    title: "金色时刻",
    poster: "/landing-float-landscape-lake.png",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081127_0992a171-d3c6-4978-8213-0ec5df8b6d63.mp4",
  },
  {
    label: "Still Water",
    title: "静水倒影",
    poster: "/landing-float-landscape-coast.png",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_092026_dd05b805-ea0f-40b2-8c52-332b88502592.mp4",
  },
  {
    label: "Deep Woods",
    title: "深林路径",
    poster: "/landing-float-landscape-village.png",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081042_df7202bf-bd80-4b2b-bbc6-1f09ba2870e9.mp4",
  },
  {
    label: "Quiet Dawn",
    title: "安静黎明",
    poster: "/landing-archive.png",
    src: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_080959_4cac5234-3573-464e-a5b7-76b94b8a7d61.mp4",
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
    (total, location) => total + (location.photoCount || location.photos?.length || 0),
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    enterMap();
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
          {cinematicVideos.map((video, index) => (
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

            <nav className="landing-nav__links liquid-glass" aria-label="桌面导航">
              {navLinks.map((item) => (
                <button key={item} type="button" onClick={item === "维护入口" ? enterLogin : enterMap}>
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
                  style={{ "--delay": `${100 + index * 50}ms` } as CSSProperties}
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

          <div className="landing-hero">
            <div className="landing-hero__badge liquid-glass">
              已连接真实接口，正在把旅行照片沉淀成空间档案
            </div>

            <h1>
              把旅途放回
              <br />
              它发生的地方
            </h1>

            <p className="landing-hero__lead">
              用地图组织照片、地点、日期和记忆。游客先看见旅行足迹，管理员再用登录、上传、对象存储和数据库把每一次出发长期保存下来。
            </p>

            <form className="landing-access liquid-glass" onSubmit={handleSubmit}>
              <label className="landing-access__field">
                <span>想先看哪里？</span>
                <input type="text" placeholder="输入城市或地点" />
              </label>
              <button type="submit">
                <CompassOutlined />
                <span>进入地图</span>
              </button>
            </form>

            <div className="landing-actions" aria-label="首页操作">
              <button type="button" onClick={enterMap}>
                <span>浏览旅行地图</span>
                <ArrowRightOutlined />
              </button>
              <button type="button" onClick={enterLogin}>
                <LoginOutlined />
                <span>管理员维护</span>
              </button>
            </div>

            <div className="landing-video-switcher" aria-label="背景视频切换">
              {cinematicVideos.map((video, index) => (
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

export default Home;
