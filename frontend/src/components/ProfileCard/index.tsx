import {
  ArrowRightOutlined,
  CodeOutlined,
  ContactsOutlined,
  FieldTimeOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons"
import type { ProfileContent } from "../../types/home"

interface ProfileCardProps {
  profile: ProfileContent
  onEnterMap: () => void
}

const contactIcon: Record<string, JSX.Element> = {
  电话: <PhoneOutlined />,
  邮箱: <MailOutlined />,
}

const projectHighlights = ["React 18", "Spring Boot", "PostGIS", "COS"]

const getContactHref = (label: string, value: string) => {
  if (label === "电话") return `tel:${value.replace(/\D/g, "")}`
  if (label === "邮箱") return `mailto:${value}`
  return undefined
}

const ProfileCard = ({ profile, onEnterMap }: ProfileCardProps) => {
  const featuredSkills = profile.skills.slice(0, 5)
  const visibleContacts = profile.contacts.filter(
    (contact) => !["现居", "生日"].includes(contact.label),
  )
  const visibleWork = profile.work.slice(0, 3).map((item) => ({
    ...item,
    details: item.details.slice(0, 1),
  }))

  return (
    <article className="profile-card" aria-label="个人介绍">
      <section className="profile-card__header">
        <div className="profile-card__identity">
          <span className="profile-card__kicker">Travel Photo Map</span>
          <h1>{profile.name}</h1>
          <p>{profile.headline}</p>

          <div className="profile-contact-strip" aria-label="联系方式">
            {visibleContacts.map((contact) => {
              const href = getContactHref(contact.label, contact.value)

              return (
                <a
                  key={contact.label}
                  className="profile-contact-chip"
                  href={href}
                  aria-label={`${contact.label}：${contact.value}`}
                >
                  {contactIcon[contact.label] || <ContactsOutlined />}
                  <span>{contact.label}</span>
                  <strong>{contact.value}</strong>
                </a>
              )
            })}
          </div>

          <div className="profile-actions" aria-label="主要操作">
            <button type="button" className="enter-map-button" onClick={onEnterMap}>
              <span>打开照片地图</span>
              <ArrowRightOutlined />
            </button>
          </div>
        </div>

        <aside className="profile-visual-panel" aria-label="项目预览">
          <img
            src="/landing-archive.png"
            alt="旅行照片地图工作台预览"
          />
          <div className="profile-visual-panel__caption">
            <span>Spatial Archive</span>
            <strong>用地图、照片和时间线整理真实旅行记忆。</strong>
          </div>
          <div className="profile-visual-panel__stack" aria-label="项目技术栈">
            {projectHighlights.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </aside>
      </section>

      <div className="profile-card__body">
        <section className="profile-timeline" aria-label="工作及职责">
          <div className="section-heading">
            <FieldTimeOutlined />
            <div>
              <span>Work Log</span>
              <h2>工作及职责</h2>
            </div>
          </div>

          <div className="timeline-list">
            {visibleWork.map((item) => (
              <article key={item.title} className="timeline-item">
                <div className="timeline-item__head">
                  <h3>{item.title}</h3>
                  <div>
                    {item.meta.map((meta) => (
                      <span key={meta}>{meta}</span>
                    ))}
                  </div>
                </div>
                {item.details.map((detail) => (
                  <p key={detail}>{detail}</p>
                ))}
              </article>
            ))}
          </div>
        </section>

        <aside className="profile-skill-panel" aria-label="技术栈">
          <div className="section-heading">
            <CodeOutlined />
            <div>
              <span>Build Stack</span>
              <h2>技术栈</h2>
            </div>
          </div>

          <div className="skill-list">
            {featuredSkills.map((skill) => (
              <p key={skill}>{skill}</p>
            ))}
          </div>
        </aside>
      </div>
    </article>
  )
}

export default ProfileCard
