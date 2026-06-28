import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Keyboard, Navigation, Thumbs, Zoom } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import { CalendarOutlined, CloseOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { Location } from '../../types'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/zoom'
import 'swiper/css/thumbs'

interface FullscreenGalleryProps {
  location: Location | null
  open: boolean
  onClose: () => void
}

const FullscreenGallery = ({ location, open, onClose }: FullscreenGalleryProps) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null)
  const mainSwiperRef = useRef<SwiperType | null>(null)

  const photos = location?.photos || []
  const hasPhotos = photos.length > 0

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setActiveIndex(0)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') mainSwiperRef.current?.slidePrev()
      if (e.key === 'ArrowRight') mainSwiperRef.current?.slideNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!location) return null

  const currentPhoto = photos[activeIndex]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="gallery-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={onClose}
            className="gallery-close"
            aria-label="关闭画廊"
          >
            <CloseOutlined />
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="gallery-info"
          >
            <h2>{location.name}</h2>
            <p>
              {hasPhotos ? `${activeIndex + 1} / ${photos.length}` : '0 / 0'}
              {currentPhoto?.shotDate && (
                <span>
                  <CalendarOutlined /> {currentPhoto.shotDate}
                </span>
              )}
            </p>
          </motion.div>

          {hasPhotos ? (
            <Swiper
              modules={[Navigation, Zoom, Keyboard, Thumbs]}
              onSwiper={(swiper) => (mainSwiperRef.current = swiper)}
              onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
              zoom
              keyboard
              thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
              className="gallery-swiper"
            >
              {photos.map((photo, index) => (
                <SwiperSlide key={photo.id}>
                  <div className="swiper-zoom-container gallery-zoom">
                    <div
                      className="gallery-photo-stage"
                      style={{ backgroundImage: `url(${photo.url})` }}
                    >
                      <div className="gallery-photo-backdrop" />
                      <motion.img
                        layoutId={index === 0 ? `cover-${location.id}` : undefined}
                        src={photo.url}
                        alt={`${location.name} ${index + 1}`}
                        className="gallery-image"
                      />
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="gallery-empty">
              <h3>这个地点还没有照片</h3>
            </div>
          )}

          {photos.length > 1 && (
            <>
              <button
                onClick={() => mainSwiperRef.current?.slidePrev()}
                className="gallery-nav prev"
                aria-label="上一张照片"
              >
                <LeftOutlined />
              </button>
              <button
                onClick={() => mainSwiperRef.current?.slideNext()}
                className="gallery-nav next"
                aria-label="下一张照片"
              >
                <RightOutlined />
              </button>
            </>
          )}

          {photos.length > 1 && (
            <div className="gallery-thumbs">
              <Swiper
                onSwiper={setThumbsSwiper}
                slidesPerView="auto"
                spaceBetween={8}
                watchSlidesProgress
                className="gallery-thumbs-swiper"
              >
                {photos.map((photo, index) => (
                  <SwiperSlide
                    key={photo.id}
                    className={`gallery-thumb ${activeIndex === index ? 'active' : ''}`}
                  >
                    <img
                      src={photo.thumbUrl || photo.url}
                      alt={`${location.name} 缩略图 ${index + 1}`}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default FullscreenGallery
