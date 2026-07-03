import {
  ArrowRightOutlined,
  CalendarOutlined,
  CameraOutlined,
  CodeOutlined,
  ContactsOutlined,
  EnvironmentOutlined,
  FieldTimeOutlined,
  HomeOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import type { CSSProperties } from "react";
import type { ProfileContent } from "../../types/home";

interface ProfileCardProps {
  profile: ProfileContent;
  onEnterMap: () => void;
}

const projectHighlights = ["React 18", "高德地图", "PostGIS", "COS"];

const productFlows = [
  {
    title: "地图浏览",
    meta: ["游客视角", "公共访问"],
    detail: "搜索城市、景点或地址，点击照片 Marker，进入地点照片画廊。",
  },
  {
    title: "内容维护",
    meta: ["管理员登录后", "上传与编辑"],
    detail: "在地图上选点或选择 POI，上传照片，保存地点名称、坐标、旅行日期和描述。",
  },
  {
    title: "空间档案",
    meta: ["长期积累", "个人项目"],
    detail: "用地点和照片共同记录旅行轨迹，而不是只按文件夹或时间线查看相册。",
  },
];

const contactIcon: Record<string, JSX.Element> = {
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
  const featuredSkills = profile.skills.slice(0, 8);
  const visibleContacts = [
    { label: "姓名", value: profile.name },
    ...profile.contacts.filter((contact) => contact.label !== "邮箱"),
  ];
  const visibleWork = profile.work.slice(0, 3);

  return (
    <article className="profile-card" aria-label="Travel Photo Map 项目介绍">
      <section className="profile-card__header">
        <div className="profile-card__identity">
          <span className="profile-card__kicker">Travel Photo Map</span>
          <h1>旅行摄影地图</h1>
          <p>
            一个以地图为入口的个人旅行摄影相册，把地点、照片、时间和坐标组织成可以浏览和维护的空间档案。
          </p>

          <div className="profile-contact-strip" aria-label="项目标签">
            <span className="profile-contact-chip">
              <EnvironmentOutlined />
              <span>角色</span>
              <strong>游客浏览 / 管理员维护</strong>
            </span>
            <span className="profile-contact-chip">
              <CameraOutlined />
              <span>入口</span>
              <strong>地图、照片画廊、地点上传</strong>
            </span>
          </div>

          <div className="profile-actions" aria-label="主要操作">
            <button
              type="button"
              className="enter-map-button"
              onClick={onEnterMap}
            >
              <span>打开照片地图</span>
              <ArrowRightOutlined />
            </button>
          </div>
        </div>

        <aside className="profile-visual-panel" aria-label="地图相册预览">
          <img src="/landing-archive.png" alt="旅行照片地图工作台预览" />
          <div className="profile-visual-panel__caption">
            <span>Spatial Archive</span>
            <strong>用地点、照片和时间线整理真实旅行记忆。</strong>
          </div>
          <div className="profile-visual-panel__stack" aria-label="项目技术栈">
            {projectHighlights.map((item, index) => (
              <span key={item} style={{ "--i": index } as CSSProperties}>
                {item}
              </span>
            ))}
          </div>
        </aside>
      </section>

      <div className="profile-card__body">
        <section className="profile-timeline" aria-label="核心使用流程">
          <div className="section-heading">
            <FieldTimeOutlined />
            <div>
              <span>Route Flow</span>
              <h2>核心使用流程</h2>
            </div>
          </div>

          <div className="timeline-list">
            {productFlows.map((item, index) => (
              <article
                key={item.title}
                className="timeline-item"
                style={{ "--i": index } as CSSProperties}
              >
                <div className="timeline-item__head">
                  <h3>{item.title}</h3>
                  <div>
                    {item.meta.map((meta) => (
                      <span key={meta}>{meta}</span>
                    ))}
                  </div>
                </div>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="profile-skill-panel" aria-label="项目能力">
          <div className="section-heading">
            <CodeOutlined />
            <div>
              <span>Build Stack</span>
              <h2>项目能力</h2>
            </div>
          </div>

          <div className="skill-list">
            {projectHighlights.map((skill, index) => (
              <p key={skill} style={{ "--i": index } as CSSProperties}>
                {skill}
              </p>
            ))}
          </div>

          <div className="profile-mini-metrics" aria-label="产品重点">
            <span>
              <EnvironmentOutlined />
              地图优先
            </span>
            <span>
              <CameraOutlined />
              照片承载记忆
            </span>
          </div>
        </aside>
      </div>

      <section className="personal-profile" aria-label="个人信息">
        <div className="personal-profile__intro">
          <span>Profile</span>
          <h2>{profile.name}</h2>
          <p>{profile.headline}</p>
        </div>

        <div className="personal-contact-grid" aria-label="姓名住址联系方式">
          {visibleContacts.map((contact, index) => {
            const href = getContactHref(contact.label, contact.value);
            const content = (
              <>
                {contactIcon[contact.label] || <ContactsOutlined />}
                <span>{contact.label}</span>
                <strong>{contact.value}</strong>
              </>
            );

            return href ? (
              <a
                key={contact.label}
                className="personal-contact-card"
                href={href}
                style={{ "--i": index } as CSSProperties}
              >
                {content}
              </a>
            ) : (
              <div
                key={contact.label}
                className="personal-contact-card"
                style={{ "--i": index } as CSSProperties}
              >
                {content}
              </div>
            );
          })}
        </div>

        <div className="personal-profile__grid">
          <section className="personal-work" aria-label="工作经历">
            <div className="section-heading">
              <FieldTimeOutlined />
              <div>
                <span>Experience</span>
                <h2>工作经历</h2>
              </div>
            </div>

            <div className="personal-work-list">
              {visibleWork.map((item, index) => (
                <article
                  key={item.title}
                  className="personal-work-item"
                  style={{ "--i": index } as CSSProperties}
                >
                  <h3>{item.title}</h3>
                  <div>
                    {item.meta.map((meta) => (
                      <span key={meta}>{meta}</span>
                    ))}
                  </div>
                  {item.details.map((detail) => (
                    <p key={detail}>{detail}</p>
                  ))}
                </article>
              ))}
            </div>
          </section>

          <aside className="personal-skills" aria-label="技术栈">
            <div className="section-heading">
              <CodeOutlined />
              <div>
                <span>Stack</span>
                <h2>技术栈</h2>
              </div>
            </div>

            <div className="personal-skill-list">
              {featuredSkills.map((skill, index) => (
                <p key={skill} style={{ "--i": index } as CSSProperties}>
                  {skill}
                </p>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </article>
  );
};

export default ProfileCard;
