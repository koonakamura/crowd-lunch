import { useState, useEffect } from 'react'

interface AdminSplashScreenProps {
  onTransition: () => void
}

export default function AdminSplashScreen({ onTransition }: AdminSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [opacity, setOpacity] = useState(1)

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        handleTransition()
      }
    }

    const handleClick = () => {
      handleTransition()
    }

    const handleTransition = () => {
      setOpacity(0)
      setTimeout(() => {
        setIsVisible(false)
        onTransition()
      }, 500)
    }

    window.addEventListener('scroll', handleScroll)
    window.addEventListener('click', handleClick)
    window.addEventListener('touchstart', handleClick)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('click', handleClick)
      window.removeEventListener('touchstart', handleClick)
    }
  }, [onTransition])

  if (!isVisible) {
    return null
  }

  return (
    <div 
      className="fixed inset-0 bg-white z-50 flex items-center justify-center transition-opacity duration-500 ease-out"
      style={{ opacity }}
    >
      <div className="text-center px-8">
        <div className="space-y-2">
          <h1 
            className="font-urbane font-bold text-black"
            style={{ 
              fontSize: 'min(16vw, 4rem)',
              lineHeight: '1.1'
            }}
          >
            CROWD LUNCH
          </h1>
          <h2 
            className="font-urbane font-bold text-black"
            style={{ 
              fontSize: 'min(12vw, 3rem)',
              lineHeight: '1.1'
            }}
          >
            ADMIN
          </h2>
        </div>
      </div>
    </div>
  )
}
