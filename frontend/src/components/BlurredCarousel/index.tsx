import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Location } from '../../types'

interface BlurredCarouselProps {
  locations: Location[]
}

const BlurredCarousel = ({ locations }: BlurredCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  const coverUrls = locations
    .filter((l) => l.coverThumbUrl)
    .map((l) => l.coverThumbUrl!)

  useEffect(() => {
    if (coverUrls.length <= 1) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % coverUrls.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [coverUrls.length])

  if (coverUrls.length === 0) {
    return (
      <div
        className="blurred-carousel"
        style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}
      />
    )
  }

  return (
    <div className="blurred-carousel">
      <AnimatePresence mode="sync">
        <motion.img
          key={currentIndex}
          src={coverUrls[currentIndex]}
          alt=""
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1.05 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '-5%',
            left: '-5%',
            width: '110%',
            height: '110%',
            objectFit: 'cover',
          }}
        />
      </AnimatePresence>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(30px)',
        }}
      />
    </div>
  )
}

export default BlurredCarousel
