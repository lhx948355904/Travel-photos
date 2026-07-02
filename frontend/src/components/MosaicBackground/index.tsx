import { useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"

interface MosaicBackgroundProps {
  images: string[]
}

interface Tile {
  column: number
  row: number
  index: number
}

const FALLBACK_IMAGE = "/landing-archive.png"
const TILE_COLUMNS = 8
const TILE_ROWS = 5
const TILE_DELAY = 34
const TILE_DURATION = 760
const CHANGE_INTERVAL = 5200

const tiles: Tile[] = Array.from({ length: TILE_COLUMNS * TILE_ROWS }, (_, index) => ({
  column: index % TILE_COLUMNS,
  row: Math.floor(index / TILE_COLUMNS),
  index,
}))

const normalizeImages = (images: string[]) => {
  const uniqueImages = Array.from(
    new Set(images.map((image) => image.trim()).filter(Boolean)),
  )

  return uniqueImages.length > 0 ? uniqueImages : [FALLBACK_IMAGE]
}

const toCssImage = (url: string) => `url("${url.replace(/"/g, '\\"')}")`

const getTilePosition = (value: number, count: number) => {
  if (count <= 1) return "0%"
  return `${(value / (count - 1)) * 100}%`
}

const MosaicBackground = ({ images }: MosaicBackgroundProps) => {
  const safeImages = useMemo(() => normalizeImages(images), [images])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState(safeImages.length > 1 ? 1 : 0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    setCurrentIndex(0)
    setNextIndex(safeImages.length > 1 ? 1 : 0)
    setIsTransitioning(false)
  }, [safeImages])

  useEffect(() => {
    if (safeImages.length < 2) return undefined

    const nextImageIndex = (currentIndex + 1) % safeImages.length
    const startTimer = window.setTimeout(() => {
      setNextIndex(nextImageIndex)
      setIsTransitioning(true)
    }, CHANGE_INTERVAL)

    const finishTimer = window.setTimeout(
      () => {
        setCurrentIndex(nextImageIndex)
        setIsTransitioning(false)
      },
      CHANGE_INTERVAL + TILE_DURATION + TILE_DELAY * tiles.length,
    )

    return () => {
      window.clearTimeout(startTimer)
      window.clearTimeout(finishTimer)
    }
  }, [currentIndex, safeImages.length])

  const currentImage = safeImages[currentIndex] || FALLBACK_IMAGE
  const nextImage = safeImages[nextIndex] || currentImage

  return (
    <div
      className={`landing-background${isTransitioning ? " landing-background--active" : ""}`}
      aria-hidden="true"
    >
      <div
        className="landing-background__image"
        style={{ backgroundImage: toCssImage(currentImage) }}
      />
      <div className="landing-background__tiles">
        {tiles.map((tile) => {
          const style: CSSProperties = {
            left: `${(tile.column / TILE_COLUMNS) * 100}%`,
            top: `${(tile.row / TILE_ROWS) * 100}%`,
            width: `${100 / TILE_COLUMNS}%`,
            height: `${100 / TILE_ROWS}%`,
            backgroundImage: toCssImage(nextImage),
            backgroundPosition: `${getTilePosition(tile.column, TILE_COLUMNS)} ${getTilePosition(
              tile.row,
              TILE_ROWS,
            )}`,
            backgroundSize: `${TILE_COLUMNS * 100}% ${TILE_ROWS * 100}%`,
            transitionDelay: `${tile.index * TILE_DELAY}ms`,
          }

          return <span key={`${tile.column}-${tile.row}`} className="landing-background__tile" style={style} />
        })}
      </div>
      <div className="landing-background__veil" />
    </div>
  )
}

export default MosaicBackground
