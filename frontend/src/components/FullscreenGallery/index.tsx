import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Zoom, Keyboard, Thumbs } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import { CloseOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
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
          {/* Close button */}
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              zIndex: 10,
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontSize: 18,
              backdropFilter: 'blur(10px)',
            }}
          >
            <CloseOutlined />
          </motion.button>

          {/* Top info */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              zIndex: 10,
              color: '#fff',
              textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{location.name}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.8 }}>
              {activeIndex + 1} / {photos.length}
              {currentPhoto?.shotDate && ` · ${currentPhoto.shotDate}`}
            </p>
          </motion.div>

          {/* Main Swiper */}
          <Swiper
            modules={[Navigation, Pagination, Zoom, Keyboard, Thumbs]}
            onSwiper={(swiper) => (mainSwiperRef.current = swiper)}
            onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
            zoom
            keyboard
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            style={{ flex: 1, width: '100%' }}
          >
            {photos.map((photo, index) => (
              <SwiperSlide key={photo.id}>
                <div className="swiper-zoom-container" style={{ width: '100%', height: '100%' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: `url(${photo.url}) center/cover`,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.3)',
                        backdropFilter: 'blur(40px)',
                      }}
                    />
                    <motion.img
                      layoutId={index === 0 ? `cover-${location.id}` : undefined}
                      src={photo.url}
                      alt=""
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        maxWidth: '90%',
                        maxHeight: '85vh',
                        objectFit: 'contain',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                      }}
                    />
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={() => mainSwiperRef.current?.slidePrev()}
                style={{
                  position: 'absolute',
                  left: 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 20,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <LeftOutlined />
              </button>
              <button
                onClick={() => mainSwiperRef.current?.slideNext()}
                style={{
                  position: 'absolute',
                  right: 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 20,
                  backdropFilter: 'blur(10px)',
                }}
              >
                <RightOutlined />
              </button>
            </>
          )}

          {/* Thumbs */}
          {photos.length > 1 && (
            <div style={{ padding: '12px 20px', background: 'rgba(0,0,0,0.5)' }}>
              <Swiper
                onSwiper={setThumbsSwiper}
                slidesPerView="auto"
                spaceBetween={8}
                watchSlidesProgress
                style={{ height: 60 }}
              >
                {photos.map((photo, index) => (
                  <SwiperSlide
                    key={photo.id}
                    style={{
                      width: 80,
                      height: 60,
                      borderRadius: 4,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: activeIndex === index ? '2px solid #1890ff' : '2px solid transparent',
                      opacity: activeIndex === index ? 1 : 0.6,
                      transition: 'all 0.2s',
                    }}
                  >
                    <img
                      src={photo.thumbUrl || photo.url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
