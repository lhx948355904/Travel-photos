import { useEffect, useState, useCallback } from 'react'

export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false)

  const check = useCallback(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  useEffect(() => {
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [check])

  return { isMobile }
}
