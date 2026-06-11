import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { Location } from '../../types'

interface BlurredCarouselProps {
  locations: Location[]
}

const ROWS = 5
const COLS = 8
const TILE_COUNT = ROWS * COLS

const BlurredCarousel = ({ locations }: BlurredCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [baseIndex, setBaseIndex] = useState(0)

  const coverUrls = useMemo(
    () => locations.filter((l) => l.coverThumbUrl).map((l) => l.coverThumbUrl!),
    [locations]
  )

  useEffect(() => {
    setCurrentIndex(0)
    setBaseIndex(0)
  }, [coverUrls.length])

  useEffect(() => {
    if (coverUrls.length <= 1) return
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % coverUrls.length)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [coverUrls.length])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBaseIndex(currentIndex)
    }, 1800)
    return () => window.clearTimeout(timer)
  }, [currentIndex])

  if (coverUrls.length === 0) {
    return <div className="blurred-carousel empty" />
  }

  const baseUrl = coverUrls[baseIndex] || coverUrls[0]
  const nextUrl = coverUrls[currentIndex] || coverUrls[0]

  return (
    <div className="blurred-carousel">
      <div className="carousel-base" style={{ backgroundImage: `url(${baseUrl})` }} />
      <div className="carousel-tile-grid" aria-hidden="true">
        {Array.from({ length: TILE_COUNT }).map((_, index) => {
          const row = Math.floor(index / COLS)
          const col = index % COLS
          const delay = (row + col) * 0.045

          return (
            <motion.div
              key={`${currentIndex}-${index}`}
              className="carousel-tile"
              initial={{ opacity: 0, scale: 0.92, filter: 'blur(12px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.85, delay, ease: 'easeOut' }}
              style={{
                backgroundImage: `url(${nextUrl})`,
                backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
                backgroundPosition: `${(col / (COLS - 1)) * 100}% ${(row / (ROWS - 1)) * 100}%`,
              }}
            />
          )
        })}
      </div>
      <div className="carousel-vignette" />
    </div>
  )
}

export default BlurredCarousel
