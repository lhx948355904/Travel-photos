import {
  ArrowRightOutlined,
  CalendarOutlined,
  CameraOutlined,
  CloudUploadOutlined,
  CodeOutlined,
  ContactsOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  HomeOutlined,
  MailOutlined,
  PhoneOutlined,
  PictureOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ProfileContent } from "../../types/home";

interface ProfileCardProps {
  profile: ProfileContent;
  onEnterMap: () => void;
}

interface FeatureItem {
  title: string;
  detail: string;
  icon: ReactNode;
  tone: "light" | "green" | "dark" | "white";
}

const fallbackImage = "/landing-archive.png";
const floatLandscapeImages = [
  "/landing-float-landscape-lake.png",
  "/landing-float-landscape-coast.png",
  "/landing-float-landscape-village.png",
];

const productStack = ["React 18", "高德地图", "PostgreSQL", "腾讯云 COS"];

interface TitleSprout {
  tone: "bloom" | "grass" | "leaf";
  style: CSSProperties;
}

const titleSprouts: TitleSprout[] = [
  {
    tone: "grass",
    style: {
      "--x": "15%",
      "--y": "78%",
      "--r": "-20deg",
      "--s": "1",
      "--delay": "0ms",
      "--dx": "-2px",
      "--dy": "-4px",
      "--sway": "4deg",
    } as CSSProperties,
  },
  {
    tone: "bloom",
    style: {
      "--x": "10%",
      "--y": "18%",
      "--r": "-18deg",
      "--s": "0.9",
      "--delay": "70ms",
      "--dx": "2px",
      "--dy": "-5px",
      "--sway": "5deg",
    } as CSSProperties,
  },
  {
    tone: "leaf",
    style: {
      "--x": "30%",
      "--y": "2%",
      "--r": "-4deg",
      "--s": "0.74",
      "--delay": "140ms",
      "--dx": "1px",
      "--dy": "-3px",
      "--sway": "4deg",
    } as CSSProperties,
  },
  {
    tone: "bloom",
    style: {
      "--x": "64%",
      "--y": "0%",
      "--r": "14deg",
      "--s": "0.84",
      "--delay": "190ms",
      "--dx": "-2px",
      "--dy": "-4px",
      "--sway": "-5deg",
    } as CSSProperties,
  },
  {
    tone: "leaf",
    style: {
      "--x": "83%",
      "--y": "22%",
      "--r": "18deg",
      "--s": "0.98",
      "--delay": "250ms",
      "--dx": "-3px",
      "--dy": "-3px",
      "--sway": "-6deg",
    } as CSSProperties,
  },
  {
    tone: "grass",
    style: {
      "--x": "81%",
      "--y": "86%",
      "--r": "14deg",
      "--s": "1.08",
      "--delay": "310ms",
      "--dx": "2px",
      "--dy": "-4px",
      "--sway": "-5deg",
    } as CSSProperties,
  },
  {
    tone: "bloom",
    style: {
      "--x": "56%",
      "--y": "97%",
      "--r": "7deg",
      "--s": "0.78",
      "--delay": "380ms",
      "--dx": "-1px",
      "--dy": "-3px",
      "--sway": "4deg",
    } as CSSProperties,
  },
];

const productFlows = [
  {
    title: "浏览",
    detail: "游客先从地图看到照片所在的位置关系，再进入地点画廊。",
    icon: <SearchOutlined />,
  },
  {
    title: "上传",
    detail: "管理员登录后选择坐标、填写地点信息，并把照片归档到云端。",
    icon: <CloudUploadOutlined />,
  },
  {
    title: "沉淀",
    detail: "旅行照片不再只按文件夹存放，而是形成可持续维护的空间档案。",
    icon: <PictureOutlined />,
  },
];

const featureItems: FeatureItem[] = [
  {
    title: "地图先行",
    detail: "首页直接指向地图浏览，让照片和地点关系成为第一入口。",
    icon: <EnvironmentOutlined />,
    tone: "green",
  },
  {
    title: "照片归档",
    detail: "每个地点可以承载封面、照片集、旅行日期和描述。",
    icon: <CameraOutlined />,
    tone: "white",
  },
  {
    title: "后台维护",
    detail: "管理员可以上传、编辑和持续补充旅行内容。",
    icon: <CloudUploadOutlined />,
    tone: "light",
  },
  {
    title: "全栈练习场",
    detail: "把前端交互、接口、数据库、对象存储和部署串成一个真实项目。",
    icon: <CodeOutlined />,
    tone: "dark",
  },
];

const contactIcon: Record<string, ReactNode> = {
  姓名: <ContactsOutlined />,
  现居: <HomeOutlined />,
  生日: <CalendarOutlined />,
  电话: <PhoneOutlined />,
  邮箱: <MailOutlined />,
};

const getContactHref = (label: string, value: string) => {
  if (label === "电话") return `tel:${value.replace(/\D/g, "")}`;
  if (label === "邮箱") return `mailto:${value}`;
  return undefined;
};

const ProfileCard = ({ profile, onEnterMap }: ProfileCardProps) => {
  const [titleMotionState, setTitleMotionState] = useState<
    "idle" | "grow" | "retreat"
  >("idle");
  const featuredSkills = profile.skills.slice(0, 9);
  const visibleContacts = [
    { label: "姓名", value: profile.name },
    ...profile.contacts,
  ];
  const visibleWork = profile.work.slice(0, 4);

  return (
    <article className="landing-shell" aria-label="旅行摄影地图首页">
      <header className="landing-nav" aria-label="首页导航">
        <a className="landing-brand" href="#top" aria-label="回到首页顶部">
          <span className="landing-brand__mark">TP</span>
          <span>Travel Photo Map</span>
        </a>

        <nav className="landing-nav__links" aria-label="页面分区">
          <a href="#archive">项目</a>
          <a href="#flow">流程</a>
          <a href="#profile">履历</a>
        </nav>

        <button
          type="button"
          className="landing-nav__action"
          onClick={onEnterMap}
        >
          打开地图
        </button>
      </header>

      <section className="landing-hero" id="top">
        <div className="landing-hero__copy">
          <p className="landing-kicker">Travel Photo Map</p>
          <div
            className={`landing-title-stage landing-title-stage--${titleMotionState}`}
            onPointerEnter={() => setTitleMotionState("grow")}
            onPointerLeave={() => setTitleMotionState("retreat")}
          >
            <div className="landing-title-botanical" aria-hidden="true">
              {titleSprouts.map((sprout, index) => (
                <span
                  key={`${sprout.tone}-${index}`}
                  className={`landing-title-sprout landing-title-sprout--${sprout.tone}`}
                  style={sprout.style}
                >
                  <span className="landing-title-sprout__body">
                    <span className="landing-title-sprout__stem" />
                    <span className="landing-title-sprout__leaf landing-title-sprout__leaf--a" />
                    <span className="landing-title-sprout__leaf landing-title-sprout__leaf--b" />
                    <span className="landing-title-sprout__flower" />
                  </span>
                </span>
              ))}
            </div>
            <h1>
              鸿翔の
              <br />
              摄影云盘
            </h1>
          </div>
          <p>
            摄影是思维的具象化，愿你四处皆美景，事事都如意~ <br />
            欢迎来到我的思维空间
          </p>

          <div className="landing-hero__actions" aria-label="主要操作">
            <button
              type="button"
              className="landing-primary"
              onClick={onEnterMap}
            >
              <span>打开地图</span>
              <ArrowRightOutlined />
            </button>
            <a className="landing-secondary" href="#profile">
              查看履历
            </a>
          </div>
        </div>

        <aside
          className="landing-hero__visual profile-visual-panel"
          aria-label="地图相册预览"
        >
          <img
            className="landing-hero__image"
            src={fallbackImage}
            alt="旅行照片地图工作台预览"
          />

          <div className="profile-visual-panel__photos" aria-hidden="true">
            {floatLandscapeImages.map((image) => (
              <div key={image} className="profile-visual-panel__float-photo">
                <img src={image} alt="" />
              </div>
            ))}
          </div>

          <div className="profile-visual-panel__particles" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="profile-visual-panel__particle"
                style={{
                  animationDuration: `var(--pdur, ${7 + index}s)`,
                  animationDelay: `var(--pdel, ${2 + index * 0.5}s)`,
                  width: `var(--psize, ${2 + (index % 3) * 0.5}px)`,
                  height: `var(--psize, ${2 + (index % 3) * 0.5}px)`,
                }}
              />
            ))}
          </div>

          <div
            className="profile-visual-panel__lens-flare"
            aria-hidden="true"
          />
          <div className="profile-visual-panel__edge-glow" aria-hidden="true" />

          <div className="landing-archive-card profile-visual-panel__caption">
            <span>当前项目</span>
            <strong>地图相册工作台</strong>
            <p>围绕地点组织照片、日期和描述，适合个人旅行记录长期沉淀。</p>
          </div>

          <div className="profile-visual-panel__stack" aria-label="项目技术栈">
            {productStack.map((item, index) => (
              <span key={item} style={{ "--i": index } as CSSProperties}>
                {item}
              </span>
            ))}
          </div>
        </aside>
      </section>

      <section
        className="landing-section landing-section--archive"
        id="archive"
      >
        <div className="landing-section__intro">
          <h2>春风若有怜花意，可否许我再少年？</h2>
          <p>保存我所见所闻，所思所想</p>
        </div>

        <div className="landing-feature-grid">
          {featureItems.map((item, index) => (
            <section
              key={item.title}
              className={`landing-feature landing-feature--${item.tone}`}
              style={{ "--i": index } as CSSProperties}
            >
              <div className="landing-feature__icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </section>
          ))}
        </div>
      </section>

      <section className="landing-section landing-flow" id="flow">
        <div className="landing-section__intro">
          <h2>浏览、上传、沉淀成闭环</h2>
          <p>
            对用户来说是浏览、上传和沉淀；对开发者来说是路由、接口、数据库和部署的完整练习。
          </p>
        </div>

        <div className="landing-flow__grid">
          {productFlows.map((item, index) => (
            <article
              key={item.title}
              className="landing-flow-card"
              style={{ "--i": index } as CSSProperties}
            >
              <div className="landing-flow-card__icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-profile" id="profile" aria-label="个人信息">
        <div className="landing-profile__intro">
          <p className="landing-kicker">Profile</p>
          <h2>{profile.name}</h2>
          <p>{profile.headline}</p>
        </div>

        <div className="landing-contact-grid" aria-label="联系方式">
          {visibleContacts.map((contact, index) => {
            const href = getContactHref(contact.label, contact.value);
            const content = (
              <>
                <span className="landing-contact-card__icon">
                  {contactIcon[contact.label] || <ContactsOutlined />}
                </span>
                <span>{contact.label}</span>
                <strong>{contact.value}</strong>
              </>
            );

            return href ? (
              <a
                key={contact.label}
                className="landing-contact-card"
                href={href}
                style={{ "--i": index } as CSSProperties}
              >
                {content}
              </a>
            ) : (
              <div
                key={contact.label}
                className="landing-contact-card"
                style={{ "--i": index } as CSSProperties}
              >
                {content}
              </div>
            );
          })}
        </div>

        <div className="landing-profile__content">
          <section className="landing-work" aria-label="工作经历">
            <div className="landing-panel-heading">
              <FieldTimeOutlined />
              <h3>工作经历</h3>
            </div>

            <div className="landing-work-list">
              {visibleWork.map((item, index) => (
                <article
                  key={item.title}
                  className="landing-work-item"
                  style={{ "--i": index } as CSSProperties}
                >
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.details[0]}</p>
                  </div>
                  <span>{item.meta.join(" / ")}</span>
                </article>
              ))}
            </div>
          </section>

          <aside className="landing-skills" aria-label="技术栈">
            <div className="landing-panel-heading">
              <CodeOutlined />
              <h3>技术栈</h3>
            </div>

            <div className="landing-skill-cloud">
              {featuredSkills.map((skill, index) => (
                <span key={skill} style={{ "--i": index } as CSSProperties}>
                  {skill}
                </span>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </article>
  );
};

export default ProfileCard;
