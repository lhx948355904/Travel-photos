import {
  ArrowLeftOutlined, CameraOutlined, DeleteOutlined, EditOutlined, HolderOutlined,
  PlusOutlined, SwapRightOutlined,
} from '@ant-design/icons'
import { message, Modal, Skeleton } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { createScore, deleteScore, getScoreCapabilities, getScores, updateScore, uploadScoreImage } from '../../api/scores'
import { useAuthStore } from '../../store/useAuthStore'
import type { ScoreImage, ScoreInput, ScorePage, ScoreRecord } from '../../types/scores'
import PosterCarousel from './PosterCarousel'
import ScoreCharts from './ScoreCharts'
import ScoreOverview from './ScoreOverview'
import { frameWins } from './chartData'
import { scoreImages } from './scoreImages'
import './scores.css'

const emptyPage: ScorePage = { items: [], page: 1, pageSize: 6, total: 0, totalPages: 0 }

const localDateTime = (value: string) => {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const freshInput = (): ScoreInput => ({
  title: '', playerOne: '', playerTwo: '', scoreOne: 0, scoreTwo: 0,
  playedAt: localDateTime(new Date().toISOString()), venue: '', note: '', imageKey: null, imageKeys: [], frames: [],
})

const formatDate = (value: string) => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
}).format(new Date(value))

const resultText = (record: ScoreRecord) => {
  if (record.scoreOne === record.scoreTwo) return '平局'
  return `${record.scoreOne > record.scoreTwo ? record.playerOne : record.playerTwo} 获胜`
}

function ScoresPage() {
  const isAdmin = useAuthStore((state) => state.isAdmin)
  const [data, setData] = useState<ScorePage>(emptyPage)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [allRecords, setAllRecords] = useState<ScoreRecord[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')
  const [editing, setEditing] = useState<ScoreRecord | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<ScoreInput>(freshInput)
  const [editorImages, setEditorImages] = useState<ScoreImage[]>([])
  const [imageUploadingCount, setImageUploadingCount] = useState(0)
  const [imageUploadingTotal, setImageUploadingTotal] = useState(0)
  const [selectedImage, setSelectedImage] = useState<{ record: ScoreRecord; image: ScoreImage } | null>(null)
  const [selectedPortrait, setSelectedPortrait] = useState(false)
  const [order, setOrder] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('score-record-order') || '[]') as number[] }
    catch { return [] }
  })
  const [activeRecordId, setActiveRecordId] = useState<number | null>(null)
  const [draggedRecordId, setDraggedRecordId] = useState<number | null>(null)
  const [analysisId, setAnalysisId] = useState<number | null>(null)
  const [galleryRecordId, setGalleryRecordId] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [maxImagesPerRecord, setMaxImagesPerRecord] = useState(1)
  const [capabilitiesLoading, setCapabilitiesLoading] = useState(true)
  const cardStackRef = useRef<HTMLDivElement | null>(null)
  const stackPan = useRef({ pointerId: -1, startX: 0, startScrollLeft: 0, moved: false })
  const suppressStackClick = useRef(false)
  const [stackDragging, setStackDragging] = useState(false)

  const reload = useCallback(() => setRevision((value) => value + 1), [])

  const startStackPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || event.button !== 0 || (event.target as HTMLElement).closest('button, a, input, textarea, select')) return
    stackPan.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveStackPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = stackPan.current
    if (pan.pointerId !== event.pointerId) return
    const distance = event.clientX - pan.startX
    if (Math.abs(distance) > 5) {
      pan.moved = true
      setStackDragging(true)
      event.currentTarget.scrollLeft = pan.startScrollLeft - distance
    }
  }

  const endStackPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = stackPan.current
    if (pan.pointerId !== event.pointerId) return
    suppressStackClick.current = pan.moved
    stackPan.current.pointerId = -1
    setStackDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    window.setTimeout(() => { suppressStackClick.current = false }, 0)
  }

  useEffect(() => {
    if (!isAdmin) {
      setCapabilitiesLoading(false)
      return
    }
    let active = true
    setCapabilitiesLoading(true)
    getScoreCapabilities()
      .then((result) => { if (active) setMaxImagesPerRecord(Math.max(1, Math.min(result.maxImagesPerRecord, 20))) })
      .catch(() => { if (active) setMaxImagesPerRecord(1) })
      .finally(() => { if (active) setCapabilitiesLoading(false) })
    return () => { active = false }
  }, [isAdmin])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getScores({ page, pageSize: 6 })
      .then((result) => { if (active) setData(result) })
      .catch((reason: Error) => { if (active) setError(reason.message || '比分加载失败') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, revision])

  useEffect(() => {
    let active = true
    setOverviewLoading(true)
    setOverviewError('')
    const loadOverview = async () => {
      const first = await getScores({ page: 1, pageSize: 30 })
      const records = [...first.items]
      for (let page = 2; page <= first.totalPages; page += 4) {
        if (!active) return
        const batch = await Promise.all(Array.from({ length: Math.min(4, first.totalPages - page + 1) }, (_, index) =>
          getScores({ page: page + index, pageSize: 30 })))
        batch.forEach((result) => records.push(...result.items))
      }
      if (active) setAllRecords(records)
    }
    void loadOverview()
      .catch((reason: Error) => { if (active) setOverviewError(reason.message || '统计加载失败') })
      .finally(() => { if (active) setOverviewLoading(false) })
    return () => { active = false }
  }, [revision])

  const openEditor = (record?: ScoreRecord) => {
    setEditing(record || null)
    setForm(record ? {
      title: record.title, playerOne: record.playerOne, playerTwo: record.playerTwo,
      scoreOne: record.scoreOne, scoreTwo: record.scoreTwo,
      playedAt: record.playedAt.slice(0, 16), venue: record.venue || '',
      note: record.note || '', imageKey: record.imageKey,
      imageKeys: scoreImages(record).map((image) => image.imageKey),
      frames: (record.frames || []).map(({ pointsOne, pointsTwo }) => ({ pointsOne, pointsTwo })),
    } : freshInput())
    setEditorImages(record ? scoreImages(record) : [])
    setEditorOpen(true)
  }

  const patch = <K extends keyof ScoreInput>(key: K, value: ScoreInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    if (capabilitiesLoading) {
      message.error('正在确认服务器的图片保存能力，请稍后重试')
      return
    }
    if ((maxImagesPerRecord === 1 ? files.length : editorImages.length + files.length) > maxImagesPerRecord) {
      message.error(maxImagesPerRecord === 1 ? '当前服务器只支持每场一张照片，更新后才能保存多张' : `每场比赛最多上传 ${maxImagesPerRecord} 张图片`)
      return
    }
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      message.error('请选择 JPG、PNG 或 WebP 图片，每张不超过 10 MB')
      return
    }
    setUploading(true)
    setImageUploadingTotal(files.length)
    try {
      let uploaded = 0
      for (const file of files) {
        const result = await uploadScoreImage(file)
        const image = { imageKey: result.cosKey, imageUrl: result.url }
        setEditorImages((current) => maxImagesPerRecord === 1 ? [image] : [...current, image])
        setForm((current) => ({ ...current, imageKeys: maxImagesPerRecord === 1 ? [result.cosKey] : [...current.imageKeys, result.cosKey] }))
        uploaded += 1
        setImageUploadingCount(uploaded)
      }
      message.success(`已上传 ${uploaded} 张图片，请保存比赛记录`)
    } catch (reason) {
      message.error((reason as Error).message || '上传失败')
    } finally {
      setUploading(false)
      setImageUploadingCount(0)
      setImageUploadingTotal(0)
    }
  }

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (capabilitiesLoading || form.imageKeys.length > maxImagesPerRecord) {
      message.error('当前服务器无法保存这场比赛的全部照片，请等待多图服务更新后再保存')
      return
    }
    if (!form.title.trim() || !form.playerOne.trim() || !form.playerTwo.trim() || !form.playedAt) {
      message.error('请填写比赛名称、双方选手和比赛时间')
      return
    }
    if (form.frames.length > 35 || form.frames.some((frame) =>
      !Number.isInteger(frame.pointsOne) || !Number.isInteger(frame.pointsTwo) ||
      frame.pointsOne < 0 || frame.pointsTwo < 0 || frame.pointsOne > 200 ||
      frame.pointsTwo > 200 || frame.pointsOne === frame.pointsTwo)) {
      message.error('每局得分需为 0–200 的整数，且每局须分出胜负')
      return
    }
    const wins = frameWins(form.frames)
    const scoreOne = form.frames.length ? wins.one : form.scoreOne
    const scoreTwo = form.frames.length ? wins.two : form.scoreTwo
    if (!Number.isInteger(scoreOne) || !Number.isInteger(scoreTwo) ||
      scoreOne < 0 || scoreTwo < 0 || scoreOne > 99 || scoreTwo > 99 ||
      scoreOne + scoreTwo === 0) {
      message.error('比分需为 0–99 的整数，双方不能同时为 0')
      return
    }
    setSaving(true)
    try {
      const input = { ...form, imageKey: form.imageKeys[0] || null, scoreOne, scoreTwo, playedAt: `${form.playedAt}:00` }
      const saved = editing ? await updateScore(editing.id, input) : await createScore(input)
      if (input.imageKeys.length > scoreImages(saved).length) {
        message.warning('比赛已保存，但当前服务尚未支持多图，仅第一张图片已保存。请在后端更新后再补传其余照片。', 8)
      } else {
        message.success(editing ? '比分已更新，可在比赛图库查看照片' : '比分已记录，可在比赛图库查看照片')
      }
      setEditorOpen(false)
      setGalleryRecordId(null)
      setPage(1)
      reload()
    } catch (reason) {
      message.error((reason as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = (record: ScoreRecord) => {
    Modal.confirm({
      title: '删除这场比赛？',
      content: `${record.playerOne} 对 ${record.playerTwo} 的比分将不再公开展示。`,
      okText: '删除记录', cancelText: '保留', okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteScore(record.id)
          message.success('记录已删除')
          if (galleryRecordId === record.id) setGalleryRecordId(null)
          if (data.items.length === 1 && page > 1) setPage(page - 1)
          else reload()
        } catch (reason) { message.error((reason as Error).message || '删除失败') }
      },
    })
  }

  const orderedRecords = useMemo(() => [...data.items].sort((first, second) => {
    const firstIndex = order.indexOf(first.id)
    const secondIndex = order.indexOf(second.id)
    if (firstIndex === -1 && secondIndex === -1) return 0
    if (firstIndex === -1) return -1
    if (secondIndex === -1) return 1
    return firstIndex - secondIndex
  }), [data.items, order])
  const featured = orderedRecords[0]
  const activeRecord = orderedRecords.find((record) => record.id === activeRecordId)
  const galleryItems = useMemo(() => allRecords.flatMap((record) =>
    scoreImages(record).map((image) => ({ record, image, seed: [...image.imageKey].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7) })))
    .sort((a, b) => a.seed - b.seed), [allRecords])
  const visibleGalleryItems = galleryRecordId === null ? galleryItems : galleryItems.filter(({ record }) => record.id === galleryRecordId)
  const openGallery = (recordId: number | null = null) => {
    setGalleryRecordId(recordId)
    document.getElementById('score-gallery')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }
  const reorderRecords = (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return
    const ids = orderedRecords.map((record) => record.id)
    ids.splice(ids.indexOf(sourceId), 1)
    ids.splice(ids.indexOf(targetId), 0, sourceId)
    const next = [...ids, ...order.filter((id) => !ids.includes(id))]
    setOrder(next)
    localStorage.setItem('score-record-order', JSON.stringify(next))
  }
  const wins = frameWins(form.frames)

  return (
    <main className="score-page">
      <Helmet><title>台球比分记录 | 比赛档案</title><meta name="description" content="记录每一次对局，查看台球比赛比分与现场图片。" /></Helmet>
      <header className="score-nav">
        <Link className="score-brand" to="/" aria-label="返回首页">Frame<span> & </span>Form</Link>
        <nav aria-label="站点导航">
          <Link to="/">首页</Link>
          <Link to="/map">地图</Link>
          <Link to="/blog">博客</Link>
          <span className="score-nav-active" aria-current="page">比分</span>
        </nav>
        <div className="score-nav-end">
          {isAdmin ? <span className="score-role">管理模式</span> : <span className="score-role">公开浏览</span>}
          {!isAdmin && <Link className="score-nav-login" to="/login?redirect=%2Fscores">管理员登录 <SwapRightOutlined /></Link>}
        </div>
      </header>

      <div className="score-shell">
        <PosterCarousel />
        <section className="score-records" id="score-list" aria-labelledby="records-heading">
          <div className="score-section-heading">
            <div><span>Match archive</span><h2 id="records-heading">比赛记录</h2><p>真实对局，逐局留痕。</p></div>
            <div className="score-section-actions">{!loading && !error && <span>共 {data.total} 场比赛</span>}<button className="score-gallery-link" type="button" onClick={() => openGallery()}>查看比赛图库 · {galleryItems.length} 张</button>{isAdmin && <button className="score-primary-button" onClick={() => openEditor()}><PlusOutlined /> 记录新比赛</button>}</div>
          </div>
          {loading ? <div className="score-loading"><Skeleton active paragraph={{ rows: 4 }} /><Skeleton active paragraph={{ rows: 3 }} /></div>
            : error ? <div className="score-state"><h3>暂时无法载入比分</h3><p>{error}</p><button onClick={reload}>重试</button></div>
              : !featured ? <div className="score-state"><span className="score-state-mark">○</span><h3>第一场比赛，等你来记录</h3><p>比赛结束后，管理员可以在这里留下比分、逐局得分与现场照片。</p>{isAdmin && <button onClick={() => openEditor()}>记录第一场比赛</button>}</div>
                : <div className="score-result-area" aria-live="polite">
                  <div className="score-stack-heading"><span>点击卡片展开详情，再次点击收起</span><span>按住卡片内容左右拖动浏览 · 拖动标题调整顺序</span></div>
                  <div ref={cardStackRef} className={`score-card-stack ${stackDragging ? 'is-dragging' : ''}`} aria-label="比赛记录横向列表，可按住内容左右拖动浏览" tabIndex={0}
                    onPointerDown={startStackPan} onPointerMove={moveStackPan} onPointerUp={endStackPan} onPointerCancel={endStackPan}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
                      event.preventDefault()
                      cardStackRef.current?.scrollBy({ left: event.key === 'ArrowLeft' ? -280 : 280, behavior: 'smooth' })
                    }}>
                    {orderedRecords.map((record, index) => <div key={record.id} className={`score-stack-layer ${activeRecordId === record.id ? 'is-active' : ''}`}
                      style={{
                        '--stack-depth': orderedRecords.length - index,
                        '--stack-offset': `${Math.min(index, 4) * 6}px`,
                        '--stack-tilt': `${index === 0 ? 0 : index % 2 === 0 ? 0.3 : -0.3}deg`,
                      } as React.CSSProperties}
                      onClick={(event) => {
                        if (suppressStackClick.current) return
                        if ((event.target as HTMLElement).closest('button')) return
                        setActiveRecordId(activeRecordId === record.id ? null : record.id)
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => { event.preventDefault(); if (draggedRecordId !== null) reorderRecords(draggedRecordId, record.id); setDraggedRecordId(null) }}>
                      <button className="score-stack-grip" type="button" draggable aria-expanded={activeRecordId === record.id}
                        onClick={() => setActiveRecordId(activeRecordId === record.id ? null : record.id)}
                        onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDraggedRecordId(record.id) }}
                        onDragEnd={() => setDraggedRecordId(null)}
                        onKeyDown={(event) => { if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) { event.preventDefault(); const next = orderedRecords[index + (event.key === 'ArrowLeft' ? -1 : 1)]; if (next) reorderRecords(record.id, next.id) } }}
                        aria-label={`${record.title}，点击${activeRecordId === record.id ? '收起' : '展开'}；可拖动排序`}
                        title="点击展开；拖动排序；Alt + 左右方向键调整顺序"><HolderOutlined /><span className="score-stack-number">NO. {String(index + 1).padStart(2, '0')}</span><span className="score-stack-title">{record.title}</span><span className="score-stack-status">{activeRecordId === record.id ? '收起' : '展开'}</span></button>
                      <ScoreCard record={record} expanded={activeRecordId === record.id} isAdmin={isAdmin} onEdit={openEditor} onDelete={onDelete}
                        analysisOpen={analysisId === record.id} onToggleAnalysis={() => setAnalysisId(analysisId === record.id ? null : record.id)}
                        onImageClick={(image) => { setSelectedPortrait(false); setSelectedImage({ record, image }) }}
                        onGalleryClick={() => openGallery(record.id)} />
                    </div>)}
                  </div>
                  {activeRecord && activeRecord.frames.length > 0 && analysisId === activeRecord.id && <div className="score-stack-analysis"><ScoreCharts record={activeRecord} /></div>}
                  {data.totalPages > 1 && <div className="score-pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button><span>{page} / {data.totalPages}</span><button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>下一页</button></div>}
                </div>}
        </section>
        <section className="score-gallery" id="score-gallery" aria-labelledby="score-gallery-heading">
          <div className="score-gallery-heading"><div><span>Match moments</span><h2 id="score-gallery-heading">比赛图库</h2></div><div className="score-gallery-tools"><p>{galleryRecordId === null ? `全部 ${galleryItems.length} 张现场照片` : `本场 ${visibleGalleryItems.length} 张照片`} · 点击照片查看比赛信息</p>{galleryRecordId !== null && <button type="button" onClick={() => setGalleryRecordId(null)}>查看全部照片</button>}</div></div>
          {overviewLoading ? <div className="score-gallery-empty"><Skeleton active paragraph={{ rows: 2 }} /></div>
            : overviewError ? <div className="score-gallery-empty"><p>图库暂时无法载入：{overviewError}</p><button type="button" onClick={reload}>重试</button></div>
              : visibleGalleryItems.length ? <div className="score-gallery-grid">{visibleGalleryItems.map(({ record, image, seed }) => <button className={`score-gallery-tile score-gallery-tile--${seed % 5}`} key={`${record.id}-${image.imageKey}`} onClick={() => { setSelectedPortrait(false); setSelectedImage({ record, image }) }} aria-label={`查看 ${record.title} 的照片`}><img src={image.imageUrl} alt={`${record.title} 的现场照片`} loading="lazy" /><span>{record.title}</span></button>)}</div>
                : <div className="score-gallery-empty"><CameraOutlined /><p>这里还没有比赛照片。管理员可在“记录新比赛”或编辑已有比赛时上传，保存后照片会出现在这里。</p>{isAdmin && <button type="button" onClick={() => openEditor()}>添加比赛照片</button>}</div>}
        </section>
        {featured && <div className="score-overview-wrap">
          {overviewLoading ? <div className="score-overview-loading"><Skeleton active paragraph={{ rows: 3 }} /></div>
            : overviewError ? <div className="score-overview-error">统计暂时无法载入：{overviewError} <button type="button" onClick={reload}>重试</button></div>
              : <ScoreOverview records={allRecords} />}
        </div>}
        <footer className="score-footer"><Link to="/"><ArrowLeftOutlined /> 返回首页</Link><span>把精彩的对局，好好保存。</span></footer>
      </div>

      <Modal className={`score-photo-modal ${selectedPortrait ? 'is-portrait' : 'is-landscape'}`} open={selectedImage !== null} onCancel={() => setSelectedImage(null)} footer={null} destroyOnHidden width={1050} centered>
        {selectedImage && <div className="score-photo-detail"><div className="score-photo-stage"><img src={selectedImage.image.imageUrl} alt={`${selectedImage.record.title} 的现场照片`} onLoad={(event) => setSelectedPortrait(event.currentTarget.naturalHeight > event.currentTarget.naturalWidth)} /></div><div className="score-photo-information"><span>{formatDate(selectedImage.record.playedAt)}</span><h2>{selectedImage.record.title}</h2><p className="score-photo-result">{selectedImage.record.playerOne} <strong>{selectedImage.record.scoreOne} : {selectedImage.record.scoreTwo}</strong> {selectedImage.record.playerTwo}</p><p>{resultText(selectedImage.record)}</p>{selectedImage.record.venue && <p>场地 · {selectedImage.record.venue}</p>}{selectedImage.record.note && <p>{selectedImage.record.note}</p>}</div></div>}
      </Modal>

      <Modal className="score-editor-modal" open={editorOpen} onCancel={() => !saving && !uploading && setEditorOpen(false)} destroyOnHidden width={600} title={editing ? '编辑比赛记录' : '记录一场比赛'}
        footer={<div className="score-editor-actions"><button type="button" onClick={() => setEditorOpen(false)} disabled={saving || uploading}>取消</button><button type="submit" form="score-editor-form" disabled={saving || uploading || capabilitiesLoading || form.imageKeys.length > maxImagesPerRecord}>{saving ? '正在保存…' : editing ? '保存修改' : '保存比分'}</button></div>}>
        <form id="score-editor-form" className="score-editor" onSubmit={onSave}>
          <p>填写双方比分和比赛信息。上传照片并保存比赛后，可在下方“比赛图库”查看全部照片；编辑已有比赛也能继续添加。</p>
          <label>比赛名称<input required maxLength={100} value={form.title} onChange={(event) => patch('title', event.target.value)} placeholder="例如：周五友谊赛" /></label>
          <div className="score-editor-grid"><label>选手一<input required maxLength={60} value={form.playerOne} onChange={(event) => patch('playerOne', event.target.value)} placeholder="选手姓名" /></label><label>选手二<input required maxLength={60} value={form.playerTwo} onChange={(event) => patch('playerTwo', event.target.value)} placeholder="选手姓名" /></label></div>
          <div className="score-editor-grid"><label>选手一局数<input type="number" required min={0} max={99} step={1} disabled={form.frames.length > 0} value={form.frames.length ? wins.one : form.scoreOne} onChange={(event) => patch('scoreOne', Number(event.target.value))} /></label><label>选手二局数<input type="number" required min={0} max={99} step={1} disabled={form.frames.length > 0} value={form.frames.length ? wins.two : form.scoreTwo} onChange={(event) => patch('scoreTwo', Number(event.target.value))} /></label></div>
          <div className="score-frame-editor"><div className="score-frame-editor-head"><div><strong>逐局得分 <small>可选</small></strong><p>录入后自动计算双方胜局，并生成得分图表。请填写全部已结束的局数。</p></div><button type="button" disabled={form.frames.length >= 35} onClick={() => patch('frames', [...form.frames, { pointsOne: 0, pointsTwo: 0 }])}><PlusOutlined /> 添加一局</button></div>
            {form.frames.map((frame, index) => <div className="score-frame-editor-row" key={index}><span>第 {index + 1} 局</span><label><span>{form.playerOne || '选手一'}</span><input type="number" min={0} max={200} step={1} required value={frame.pointsOne} onChange={(event) => setForm((current) => ({ ...current, frames: current.frames.map((item, at) => at === index ? { ...item, pointsOne: Number(event.target.value) } : item) }))} /></label><label><span>{form.playerTwo || '选手二'}</span><input type="number" min={0} max={200} step={1} required value={frame.pointsTwo} onChange={(event) => setForm((current) => ({ ...current, frames: current.frames.map((item, at) => at === index ? { ...item, pointsTwo: Number(event.target.value) } : item) }))} /></label><button type="button" onClick={() => patch('frames', form.frames.filter((_, at) => at !== index))} aria-label={`移除第 ${index + 1} 局`}><DeleteOutlined /></button></div>)}
          </div>
          <div className="score-editor-grid"><label>比赛时间<input type="datetime-local" required value={form.playedAt} onChange={(event) => patch('playedAt', event.target.value)} /></label><label>场地 <small>可选</small><input maxLength={100} value={form.venue || ''} onChange={(event) => patch('venue', event.target.value)} placeholder="例如：俱乐部 A 台" /></label></div>
          <label>备注 <small>可选</small><textarea rows={2} maxLength={300} value={form.note || ''} onChange={(event) => patch('note', event.target.value)} placeholder="留下一句关于这场比赛的话" /></label>
          <div className="score-image-field"><span>比赛图片 <small>{capabilitiesLoading ? '正在确认服务器支持的图片数量…' : maxImagesPerRecord === 1 ? '当前服务器仅支持一张；升级后可上传多张' : `可选，最多 ${maxImagesPerRecord} 张`}；JPG / PNG / WebP，每张不超过 10 MB</small></span><label className="score-upload-button"><CameraOutlined />{uploading ? `正在上传 ${Math.min(imageUploadingCount + 1, imageUploadingTotal)} / ${imageUploadingTotal}…` : maxImagesPerRecord === 1 && editorImages.length ? '替换图片' : '添加图片'}<input type="file" multiple={maxImagesPerRecord > 1} accept="image/jpeg,image/png,image/webp" disabled={capabilitiesLoading || uploading || saving || (maxImagesPerRecord > 1 && editorImages.length >= maxImagesPerRecord)} onChange={(event) => void onUpload(event)} /></label>{editorImages.length > 0 && <div className="score-image-preview">{editorImages.map((image, index) => <div key={image.imageKey}><img src={image.imageUrl} alt={`比赛图片 ${index + 1}`} /><button type="button" onClick={() => { setEditorImages((current) => current.filter((item) => item.imageKey !== image.imageKey)); setForm((current) => ({ ...current, imageKeys: current.imageKeys.filter((key) => key !== image.imageKey) })) }} aria-label={`移除图片 ${index + 1}`}><DeleteOutlined /></button></div>)}</div>}</div>
        </form>
      </Modal>
    </main>
  )
}

function ScoreCard({ record, expanded, isAdmin, onEdit, onDelete, onImageClick, onGalleryClick, analysisOpen, onToggleAnalysis }: {
  record: ScoreRecord; expanded: boolean; isAdmin: boolean; analysisOpen: boolean;
  onEdit: (record: ScoreRecord) => void; onDelete: (record: ScoreRecord) => void;
  onImageClick: (image: ScoreImage) => void; onGalleryClick: () => void; onToggleAnalysis: () => void;
}) {
  const images = scoreImages(record)
  const firstImage = images[0]
  return <article className={`score-card ${expanded && firstImage ? 'score-card--with-image' : ''}`}>
    <div className="score-card-main">
      <div className="score-card-meta"><span>{formatDate(record.playedAt)}</span>{record.venue && <span>{record.venue}</span>}</div>
      <h3>{record.title}</h3>
      <div className="score-card-board" aria-label={`${record.playerOne} ${record.scoreOne} 比 ${record.scoreTwo} ${record.playerTwo}`}>
        <div className={record.scoreOne > record.scoreTwo ? 'is-winner' : ''}><span>{record.playerOne}</span><strong>{record.scoreOne}</strong></div>
        <span className="score-card-divider">:</span>
        <div className={record.scoreTwo > record.scoreOne ? 'is-winner' : ''}><strong>{record.scoreTwo}</strong><span>{record.playerTwo}</span></div>
      </div>
      <div className="score-card-bottom"><span>{resultText(record)}</span>{images.length > 0 && <span>{images.length} 张照片</span>}{expanded && record.note && <p>{record.note}</p>}</div>
      {expanded && <>
        {record.frames?.length ? <button className="score-chart-toggle" type="button" aria-expanded={analysisOpen} onClick={onToggleAnalysis}>{analysisOpen ? '收起逐局分析' : `查看 ${record.frames.length} 局分析`} <SwapRightOutlined /></button>
          : <p className="score-card-no-frames">暂无逐局数据{isAdmin ? '，可编辑补录' : ''}</p>}
        {images.length > 0 && <button className="score-card-gallery-link" type="button" onClick={onGalleryClick}>查看本场全部 {images.length} 张照片 <SwapRightOutlined /></button>}
        {isAdmin && <div className="score-card-actions"><button onClick={() => onEdit(record)} aria-label={`编辑 ${record.title}`}><EditOutlined /> 编辑</button><button onClick={() => onDelete(record)} aria-label={`删除 ${record.title}`}><DeleteOutlined /> 删除</button></div>}
      </>}
    </div>
    {expanded && firstImage && <button className="score-card-image" type="button" onClick={() => onImageClick(firstImage)}><img src={firstImage.imageUrl} alt={`${record.title} 的现场照片`} /><span>查看第一张照片</span></button>}
  </article>
}

export default ScoresPage
