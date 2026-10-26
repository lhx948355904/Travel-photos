import {
  ArrowLeftOutlined, CameraOutlined, DeleteOutlined, EditOutlined,
  PlusOutlined, SwapRightOutlined,
} from '@ant-design/icons'
import { Image, message, Modal, Skeleton } from 'antd'
import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { createScore, deleteScore, getScores, updateScore, uploadScoreImage } from '../../api/scores'
import { useAuthStore } from '../../store/useAuthStore'
import type { ScoreInput, ScorePage, ScoreRecord } from '../../types/scores'
import PosterCarousel from './PosterCarousel'
import ScoreCharts from './ScoreCharts'
import ScoreOverview from './ScoreOverview'
import { frameWins } from './chartData'
import './scores.css'

const emptyPage: ScorePage = { items: [], page: 1, pageSize: 12, total: 0, totalPages: 0 }

const localDateTime = (value: string) => {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const freshInput = (): ScoreInput => ({
  title: '', playerOne: '', playerTwo: '', scoreOne: 0, scoreTwo: 0,
  playedAt: localDateTime(new Date().toISOString()), venue: '', note: '', imageKey: null, frames: [],
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
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const reload = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getScores({ page, pageSize: 12 })
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
      frames: (record.frames || []).map(({ pointsOne, pointsTwo }) => ({ pointsOne, pointsTwo })),
    } : freshInput())
    setImageUrl(record?.imageUrl || null)
    setEditorOpen(true)
  }

  const patch = <K extends keyof ScoreInput>(key: K, value: ScoreInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) {
      message.error('请选择不超过 10 MB 的图片')
      return
    }
    setUploading(true)
    try {
      const result = await uploadScoreImage(file)
      patch('imageKey', result.cosKey)
      setImageUrl(result.url)
      message.success('图片已上传，请保存比分记录')
    } catch (reason) {
      message.error((reason as Error).message || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const onSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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
      const input = { ...form, scoreOne, scoreTwo, playedAt: `${form.playedAt}:00` }
      if (editing) await updateScore(editing.id, input)
      else await createScore(input)
      message.success(editing ? '比分已更新' : '比分已记录')
      setEditorOpen(false)
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
          if (data.items.length === 1 && page > 1) setPage(page - 1)
          else reload()
        } catch (reason) { message.error((reason as Error).message || '删除失败') }
      },
    })
  }

  const featured = data.items[0]
  const remaining = data.items.slice(1)
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
            <div className="score-section-actions">{!loading && !error && <span>共 {data.total} 场比赛</span>}{isAdmin && <button className="score-primary-button" onClick={() => openEditor()}><PlusOutlined /> 记录新比赛</button>}</div>
          </div>
          {loading ? <div className="score-loading"><Skeleton active paragraph={{ rows: 4 }} /><Skeleton active paragraph={{ rows: 3 }} /></div>
            : error ? <div className="score-state"><h3>暂时无法载入比分</h3><p>{error}</p><button onClick={reload}>重试</button></div>
              : !featured ? <div className="score-state"><span className="score-state-mark">○</span><h3>第一场比赛，等你来记录</h3><p>比赛结束后，管理员可以在这里留下比分、逐局得分与现场照片。</p>{isAdmin && <button onClick={() => openEditor()}>记录第一场比赛</button>}</div>
                : <div className="score-result-area" aria-live="polite">
                  <ScoreCard record={featured} featured isAdmin={isAdmin} onEdit={openEditor} onDelete={onDelete} />
                  {remaining.length > 0 && <div className="score-list-label"><span>更多对局</span><span>按比赛时间排序</span></div>}
                  <div className="score-list">{remaining.map((record) => <ScoreCard key={record.id} record={record} isAdmin={isAdmin} onEdit={openEditor} onDelete={onDelete} />)}</div>
                  {data.totalPages > 1 && <div className="score-pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button><span>{page} / {data.totalPages}</span><button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>下一页</button></div>}
                </div>}
        </section>
        {featured && <div className="score-overview-wrap">
          {overviewLoading ? <div className="score-overview-loading"><Skeleton active paragraph={{ rows: 3 }} /></div>
            : overviewError ? <div className="score-overview-error">统计暂时无法载入：{overviewError} <button type="button" onClick={reload}>重试</button></div>
              : <ScoreOverview records={allRecords} />}
        </div>}
        <footer className="score-footer"><Link to="/"><ArrowLeftOutlined /> 返回首页</Link><span>把精彩的对局，好好保存。</span></footer>
      </div>

      <Modal className="score-editor-modal" open={editorOpen} onCancel={() => !saving && !uploading && setEditorOpen(false)} destroyOnHidden width={600} title={editing ? '编辑比赛记录' : '记录一场比赛'}
        footer={<div className="score-editor-actions"><button type="button" onClick={() => setEditorOpen(false)} disabled={saving || uploading}>取消</button><button type="submit" form="score-editor-form" disabled={saving || uploading}>{saving ? '正在保存…' : editing ? '保存修改' : '保存比分'}</button></div>}>
        <form id="score-editor-form" className="score-editor" onSubmit={onSave}>
          <p>填写双方比分和比赛信息，现场图片可以稍后再补充。</p>
          <label>比赛名称<input required maxLength={100} value={form.title} onChange={(event) => patch('title', event.target.value)} placeholder="例如：周五友谊赛" /></label>
          <div className="score-editor-grid"><label>选手一<input required maxLength={60} value={form.playerOne} onChange={(event) => patch('playerOne', event.target.value)} placeholder="选手姓名" /></label><label>选手二<input required maxLength={60} value={form.playerTwo} onChange={(event) => patch('playerTwo', event.target.value)} placeholder="选手姓名" /></label></div>
          <div className="score-editor-grid"><label>选手一局数<input type="number" required min={0} max={99} step={1} disabled={form.frames.length > 0} value={form.frames.length ? wins.one : form.scoreOne} onChange={(event) => patch('scoreOne', Number(event.target.value))} /></label><label>选手二局数<input type="number" required min={0} max={99} step={1} disabled={form.frames.length > 0} value={form.frames.length ? wins.two : form.scoreTwo} onChange={(event) => patch('scoreTwo', Number(event.target.value))} /></label></div>
          <div className="score-frame-editor"><div className="score-frame-editor-head"><div><strong>逐局得分 <small>可选</small></strong><p>录入后自动计算双方胜局，并生成得分图表。请填写全部已结束的局数。</p></div><button type="button" disabled={form.frames.length >= 35} onClick={() => patch('frames', [...form.frames, { pointsOne: 0, pointsTwo: 0 }])}><PlusOutlined /> 添加一局</button></div>
            {form.frames.map((frame, index) => <div className="score-frame-editor-row" key={index}><span>第 {index + 1} 局</span><label><span>{form.playerOne || '选手一'}</span><input type="number" min={0} max={200} step={1} required value={frame.pointsOne} onChange={(event) => setForm((current) => ({ ...current, frames: current.frames.map((item, at) => at === index ? { ...item, pointsOne: Number(event.target.value) } : item) }))} /></label><label><span>{form.playerTwo || '选手二'}</span><input type="number" min={0} max={200} step={1} required value={frame.pointsTwo} onChange={(event) => setForm((current) => ({ ...current, frames: current.frames.map((item, at) => at === index ? { ...item, pointsTwo: Number(event.target.value) } : item) }))} /></label><button type="button" onClick={() => patch('frames', form.frames.filter((_, at) => at !== index))} aria-label={`移除第 ${index + 1} 局`}><DeleteOutlined /></button></div>)}
          </div>
          <div className="score-editor-grid"><label>比赛时间<input type="datetime-local" required value={form.playedAt} onChange={(event) => patch('playedAt', event.target.value)} /></label><label>场地 <small>可选</small><input maxLength={100} value={form.venue || ''} onChange={(event) => patch('venue', event.target.value)} placeholder="例如：俱乐部 A 台" /></label></div>
          <label>备注 <small>可选</small><textarea rows={2} maxLength={300} value={form.note || ''} onChange={(event) => patch('note', event.target.value)} placeholder="留下一句关于这场比赛的话" /></label>
          <div className="score-image-field"><span>记分图片 <small>可选，JPG / PNG / WebP，最多 10 MB</small></span><label className="score-upload-button"><CameraOutlined />{uploading ? '正在上传…' : imageUrl ? '替换图片' : '上传图片'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || saving} onChange={(event) => void onUpload(event)} /></label>{imageUrl && <div className="score-image-preview"><img src={imageUrl} alt="已上传的记分图片" /><button type="button" onClick={() => { patch('imageKey', null); setImageUrl(null) }}>移除图片</button></div>}</div>
        </form>
      </Modal>
    </main>
  )
}

function ScoreCard({ record, featured = false, isAdmin, onEdit, onDelete }: {
  record: ScoreRecord; featured?: boolean; isAdmin: boolean;
  onEdit: (record: ScoreRecord) => void; onDelete: (record: ScoreRecord) => void;
}) {
  const [analysisOpen, setAnalysisOpen] = useState(featured)
  return <article className={`score-card ${featured ? 'score-card--featured' : ''} ${record.imageUrl ? 'score-card--with-image' : ''}`}>
    <div className="score-card-main">
      <div className="score-card-meta"><span>{formatDate(record.playedAt)}</span>{record.venue && <span>{record.venue}</span>}</div>
      <h3>{record.title}</h3>
      <div className="score-card-board" aria-label={`${record.playerOne} ${record.scoreOne} 比 ${record.scoreTwo} ${record.playerTwo}`}>
        <div className={record.scoreOne > record.scoreTwo ? 'is-winner' : ''}><span>{record.playerOne}</span><strong>{record.scoreOne}</strong></div>
        <span className="score-card-divider">:</span>
        <div className={record.scoreTwo > record.scoreOne ? 'is-winner' : ''}><strong>{record.scoreTwo}</strong><span>{record.playerTwo}</span></div>
      </div>
      <div className="score-card-bottom"><span>{resultText(record)}</span>{record.note && <p>{record.note}</p>}</div>
      {record.frames?.length ? <button className="score-chart-toggle" type="button" aria-expanded={analysisOpen} onClick={() => setAnalysisOpen(!analysisOpen)}>{analysisOpen ? '收起逐局分析' : `查看 ${record.frames.length} 局分析`} <SwapRightOutlined /></button>
        : <p className="score-card-no-frames">暂无逐局数据{isAdmin ? '，可编辑补录' : ''}</p>}
      {isAdmin && <div className="score-card-actions"><button onClick={() => onEdit(record)} aria-label={`编辑 ${record.title}`}><EditOutlined /> 编辑</button><button onClick={() => onDelete(record)} aria-label={`删除 ${record.title}`}><DeleteOutlined /> 删除</button></div>}
    </div>
    {record.imageUrl && <div className="score-card-image"><Image src={record.imageUrl} alt={`${record.title} 的记分图片`} preview={{ mask: '查看图片' }} /></div>}
    {record.frames?.length > 0 && analysisOpen && <ScoreCharts record={record} />}
  </article>
}

export default ScoresPage
