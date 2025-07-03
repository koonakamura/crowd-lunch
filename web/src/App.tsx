import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import SplashScreen from './components/SplashScreen'
import HomePage from './pages/HomePage'
import OrderPage from './pages/OrderPage'
import ConfirmPage from './pages/ConfirmPage'
import AdminPage from './pages/AdminPage'

function App() {
  const [showSplash, setShowSplash] = useState(true)

  const handleSplashTransition = () => {
    setShowSplash(false)
  }

  if (showSplash) {
    return <SplashScreen onTransition={handleSplashTransition} />
  }

  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/order" element={<OrderPage />} />
        <Route path="/order/confirm/:orderId" element={<ConfirmPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
