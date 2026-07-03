import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties } from "react"

interface MosaicBackgroundProps {
  images: string[]
}

const FALLBACK_IMAGE = "/landing-archive.png"

/** 每张图片展示时长 (ms) */
const SLIDE_DURATION = 5500

/** 过渡动画时长 (ms) —— 交叉淡入淡出 */
const CROSSFADE_DURATION = 1600

const normalizeImages = (images: string[]) => {
  const uniqueImages = Array.from(
    new Set(images.map((image) => image.trim()).filter(Boolean)),
  )

  return uniqueImages.length > 0 ? uniqueImages : [FALLBACK_IMAGE]
}

/**
 * 预加载单张图片，返回 Promise<boolean> 表示是否成功
 */
const preloadImage = (src: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = src
    // 超时保护：3 秒后视为失败，避免永远等待
    setTimeout(() => resolve(false), 3000)
  })
}

/**
 * 丝滑双图层背景切换组件
 *
 * 核心设计：
 * - 两张 <div> 常驻 DOM（front / back），永不挂载/卸载 → 消除闪烁
 * - 提前预加载下一张图片 → 过渡时图片已 ready
 * - 通过 z-index 交换 + opacity 交叉淡入淡出实现丝滑切换
 */
const MosaicBackground = ({ images }: MosaicBackgroundProps) => {
  const backgroundRef = useRef<HTMLDivElement | null>(null)
  const safeImages = useMemo(() => normalizeImages(images), [images])
  const totalImages = safeImages.length

  /* ---- 双图层状态 ---- */
  /** front 层当前显示的图片索引 */
  const [frontIndex, setFrontIndex] = useState(0)
  /** back 层预准备的图片索引（-1 表示未准备） */
  const [backIndex, setBackIndex] = useState(-1)
  /** back 层是否已可见（正在交叉淡入） */
  const [isCrossfading, setIsCrossfading] = useState(false)

  /* ---- 预加载缓存：记录哪些图片已经加载过 ---- */
  const loadedRef = useRef<Set<string>>(new Set())

  /* ---- 预加载下一张图片 ---- */
  const preloadNext = useCallback(
    async (nextIdx: number) => {
      const url = safeImages[nextIdx]
      if (!url || loadedRef.current.has(url)) return nextIdx

      await preloadImage(url)
      loadedRef.current.add(url)
      return nextIdx
    },
    [safeImages],
  )

  /* ---- 初始化 & 重置 ---- */
  useEffect(() => {
    setFrontIndex(0)
    setBackIndex(-1)
    setIsCrossfading(false)
    // 预加载第一张
    preloadImage(safeImages[0] || FALLBACK_IMAGE).then(() =>
      loadedRef.current.add(safeImages[0] || FALLBACK_IMAGE),
    )
    // 预加载第二张（如果有的话）
    if (safeImages.length > 1) {
      preloadImage(safeImages[1]).then(() => loadedRef.current.add(safeImages[1]))
    }
  }, [safeImages])

  /* ---- 自动轮播主循环 ---- */
  useEffect(() => {
    if (totalImages < 2) return undefined

    let timers: ReturnType<typeof setTimeout>[] = []

    const runCycle = async () => {
      const nextIdx = (frontIndex + 1) % totalImages

      // 1️⃣ 等待展示时长
      const waitTimer = window.setTimeout(async () => {
        // 2️⃣ 确保 back 层图片已预加载
        const readyIdx = await preloadNext(nextIdx)

        // 3️⃣ 设置 back 层图片（此时 back 层 opacity=0，不可见）
        setBackIndex(readyIdx)

        // 用 rAF 确保 DOM 已更新、浏览器已 paint
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // 4️⃣ 开始交叉淡入淡出
            setIsCrossfading(true)

            // 5️⃣ 交叉淡入完成后，将 back 升为 front
            const swapTimer = window.setTimeout(() => {
              setFrontIndex(readyIdx)
              setBackIndex(-1)
              setIsCrossfading(false)
            }, CROSSFADE_DURATION)

            timers.push(swapTimer)
          })
        })
      }, SLIDE_DURATION)

      timers.push(waitTimer)
    }

    runCycle()

    return () => {
      timers.forEach(window.clearTimeout)
    }
  }, [frontIndex, totalImages, preloadNext])

  /* ---- 视差鼠标跟随 ---- */
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let rafId = 0

    const setBackgroundMotion = (
      shiftX: number,
      shiftY: number,
      focusX: number,
      focusY: number,
    ) => {
      const el = backgroundRef.current
      if (!el) return

      el.style.setProperty("--bg-shift-x", `${shiftX.toFixed(2)}px`)
      el.style.setProperty("--bg-shift-y", `${shiftY.toFixed(2)}px`)
      el.style.setProperty("--bg-focus-x", `${focusX.toFixed(2)}%`)
      el.style.setProperty("--bg-focus-y", `${focusY.toFixed(2)}%`)
    }

    const resetBackgroundMotion = () => {
      window.cancelAnimationFrame(rafId)
      setBackgroundMotion(0, 0, 50, 50)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (motionQuery.matches || event.pointerType === "touch") return

      const vw = Math.max(window.innerWidth, 1)
      const vh = Math.max(window.innerHeight, 1)
      const nx = event.clientX / vw
      const ny = event.clientY / vh

      window.cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(() => {
        setBackgroundMotion(
          (0.5 - nx) * 24,
          (0.5 - ny) * 18,
          nx * 100,
          ny * 100,
        )
      })
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("blur", resetBackgroundMotion)
    document.addEventListener("mouseleave", resetBackgroundMotion)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("blur", resetBackgroundMotion)
      document.removeEventListener("mouseleave", resetBackgroundMotion)
    }
  }, [])

  /* ---- 渲染辅助 ---- */
  const toCssUrl = (url: string) => `url("${url.replace(/"/g, '\\"')}")`

  const frontImage = safeImages[frontIndex] || FALLBACK_IMAGE
  const backImage = backIndex >= 0 ? (safeImages[backIndex] || FALLBACK_IMAGE) : null

  const frontStyle: CSSProperties = {
    backgroundImage: toCssUrl(frontImage),
    zIndex: isCrossfading ? 0 : 1,
  }

  const backStyle: CSSProperties = {
    ...(backImage ? { backgroundImage: toCssUrl(backImage) } : {}),
    zIndex: isCrossfading ? 1 : 0,
  }

  return (
    <div
      ref={backgroundRef}
      className={`landing-background${isCrossfading ? " landing-background--crossfade" : ""}`}
      aria-hidden="true"
    >
      {/* 前层 —— 当前显示的主图 */}
      <div
        key={`front-${frontIndex}`}
        className="landing-background__slide landing-background__slide--front"
        style={frontStyle}
      />

      {/* 后层 —— 预备好的下一张图，常驻不卸载 */}
      <div
        key="back-layer"
        className="landing-background__slide landing-background__slide--back"
        style={backStyle}
      />

      {/* 遮罩层 */}
      <div className="landing-background__veil" />
    </div>
  )
}

export default MosaicBackground
