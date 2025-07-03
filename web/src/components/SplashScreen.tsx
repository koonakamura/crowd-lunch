import { useState, useEffect } from 'react'

interface SplashScreenProps {
  onTransition: () => void
}

export default function SplashScreen({ onTransition }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

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
      setIsVisible(false)
      setTimeout(() => {
        onTransition()
      }, 300)
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
    <div className="fixed inset-0 bg-white z-50 flex items-center justify-center transition-opacity duration-300">
      <div className="text-center px-8">
        <h1 
          className="font-urbane font-bold text-black"
          style={{ 
            fontSize: 'min(16vw, 4rem)',
            lineHeight: '1.1'
          }}
        >
          Crowd Lunch
        </h1>
        <p className="text-gray-500 text-sm mt-4 opacity-70">
          タップまたはスクロールして続行
        </p>
      </div>
    </div>
  )
}
