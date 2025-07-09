import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
// import LoginPage from './pages/LoginPage' // No longer needed
import HomePage from './pages/HomePage'
import OrderPage from './pages/OrderPage'
import ConfirmPage from './pages/ConfirmPage'
import AdminPage from './pages/AdminPage'

function App() {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg"></div>
      </div>
    )
  }

  // if (!user) {
  //   return <LoginPage />
  // }

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
