import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useEffect, useRef, useState } from 'react'

const posters = [
  {
    name: ['Ronnie', 'O’Sullivan'], chinese: '罗尼·奥沙利文',
    event: '2026 German Masters', image: '/scores/ronnie.jpg', position: '52% 49%',
    source: "https://commons.wikimedia.org/wiki/File:Ronnie_O%27Sullivan_2026_(3).jpg",
    author: 'Andrej146', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    achievement: '七届世锦赛冠军，41 座排名赛冠军。',
    achievementSource: 'https://www.wst.tv/snookerforbeginners/whoarethebestplayers/',
  },
  {
    name: ['Judd', 'Trump'], chinese: '贾德·特鲁姆普',
    event: '2025 German Masters', image: '/scores/judd.jpg', position: '37% 50%',
    source: 'https://commons.wikimedia.org/wiki/File:Judd_Trump_2025_(2).jpg',
    author: 'Andrej146', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    achievement: '2019 年世锦赛冠军，单赛季六夺排名赛冠军。',
    achievementSource: 'https://www.wst.tv/snookerforbeginners/whoarethebestplayers/',
  },
  {
    name: ['Mark', 'Selby'], chinese: '马克·塞尔比',
    event: '2025 German Masters', image: '/scores/mark.jpg', position: '65% 48%',
    source: 'https://commons.wikimedia.org/wiki/File:Mark_Selby_2025_(2).jpg',
    author: 'Andrej146', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    achievement: '四届世锦赛冠军，2021 年第四次捧杯。',
    achievementSource: 'https://www.wst.tv/worldchampionship/',
  },
  {
    name: ['Ding', 'Junhui'], chinese: '丁俊晖',
    event: '2014 German Masters', image: '/scores/ding.jpg', position: '48% 50%',
    source: 'https://commons.wikimedia.org/wiki/File:Ding_Junhui_at_Snooker_German_Masters_(Martin_Rulsch)_2014-02-01_01.jpg',
    author: 'Martin Rulsch / Wikimedia Commons', license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    achievement: '三届英锦赛冠军，2011 年大师赛冠军。',
    achievementSource: 'https://www.wst.tv/news/2024/april/18/crucible-seeds-2024--ding-junhui/',
  },
] as const

const PosterCarousel = () => {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const touchStart = useRef<number | null>(null)
  const posterRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const element = posterRef.current
    if (!element) return
    let frame = 0
    const updatePosition = () => {
      frame = 0
      const left = element.parentElement?.getBoundingClientRect().left ?? 0
      const distance = element.offsetWidth + left + 2
      const recordsTop = (element.nextElementSibling?.getBoundingClientRect().top ?? element.getBoundingClientRect().bottom) + window.scrollY
      const finishAt = Math.max(1, recordsTop - window.innerHeight * 0.3)
      const progress = Math.min(1, Math.max(0, window.scrollY / finishAt))
      if (reducedMotion) element.style.removeProperty('--score-poster-shift')
      else element.style.setProperty('--score-poster-shift', `${-distance * progress}px`)
      element.style.visibility = progress >= 1 ? 'hidden' : 'visible'
    }
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updatePosition)
    }
    const observer = new ResizeObserver(scheduleUpdate)
    observer.observe(element)
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)
    scheduleUpdate()
    return () => {
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      observer.disconnect()
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [reducedMotion])

  useEffect(() => {
    if (paused || reducedMotion) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setActive((index) => (index + 1) % posters.length)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [active, paused, reducedMotion])

  const change = (direction: -1 | 1) => setActive((index) => (index + direction + posters.length) % posters.length)
  const poster = posters[active]

  return <section ref={posterRef} className="score-poster" aria-label="斯诺克选手海报轮播"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}
    onKeyDown={(event) => { if (event.key === 'ArrowLeft') change(-1); if (event.key === 'ArrowRight') change(1) }}>
    <div className="score-poster-copy" key={`copy-${active}`}>
      <div className="score-poster-top"><span>THE GREATS OF SNOOKER</span><span>{String(active + 1).padStart(2, '0')} / {String(posters.length).padStart(2, '0')}</span></div>
      <div className="score-poster-title"><span>赛场人物</span><h1><span>{poster.name[0]}</span><span>{poster.name[1]}</span></h1><p>{poster.chinese}</p></div>
      <div className="score-poster-bottom"><span>{poster.event}</span><a href={poster.achievementSource} target="_blank" rel="noopener noreferrer" aria-label={`${poster.chinese}的成就：${poster.achievement} 查看世界斯诺克巡回赛资料`}>{poster.achievement}</a></div>
    </div>
    <div className="score-poster-photo" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX }}
      onTouchEnd={(event) => { if (touchStart.current !== null) { const delta = event.changedTouches[0].clientX - touchStart.current; if (Math.abs(delta) > 45) change(delta < 0 ? 1 : -1); touchStart.current = null } }}>
      <img key={poster.image} className="score-poster-image" src={poster.image} alt={`${poster.chinese}在${poster.event}赛场`} style={{ objectPosition: poster.position }} draggable={false} />
      <div className="score-poster-photo-count" aria-hidden="true">{String(active + 1).padStart(2, '0')}</div>
      <div className="score-poster-credit">摄影：<a href={poster.source} target="_blank" rel="noopener noreferrer">{poster.author}</a> · <a href={poster.licenseUrl} target="_blank" rel="noopener noreferrer">{poster.license}</a> · 裁切展示</div>
    </div>
    <div className="score-poster-controls">
      <div className="score-poster-pagers" aria-label="选择选手海报">{posters.map((item, index) => <button key={item.chinese} type="button" className={index === active ? 'is-active' : ''} onClick={() => setActive(index)} aria-label={`展示${item.chinese}海报`} aria-current={index === active ? 'true' : undefined}><span />{item.chinese}</button>)}</div>
      <div className="score-poster-arrows"><button type="button" onClick={() => change(-1)} aria-label="上一张海报"><ArrowLeftOutlined /></button><button type="button" onClick={() => change(1)} aria-label="下一张海报"><ArrowRightOutlined /></button></div>
    </div>
  </section>
}

export default PosterCarousel
