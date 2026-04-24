import React, { Suspense, useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import { AppProviders } from './components/AppProviders'
import { Layout } from './components/layout/Layout'
import { useAuth } from './context/AuthContext'
import './styles/base.css'

// 受保护的路由：未登录用户重定向到登录页
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, authLoaded } = useAuth()
  if (!authLoaded) return null
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
import './styles/common.css'
import './styles/layout.css'
import './styles/auth.css'
import './styles/home.css'
import './styles/gacha.css'
import './styles/gallery.css'
import './styles/friends.css'
import './styles/ranking.css'
import './styles/detail.css'
import './styles/support.css'
import './styles/navbar.css'
import './styles/rhythm.css'
import './styles/stamina.css'
import './styles/outfit.css'
import './styles/neon.css'

const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = React.lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const HomePage = React.lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const GalleryPage = React.lazy(() => import('./pages/GalleryPage').then(m => ({ default: m.GalleryPage })))
const InventoryPage = React.lazy(() => import('./pages/InventoryPage').then(m => ({ default: m.InventoryPage })))
const SupportHallPage = React.lazy(() => import('./pages/SupportHallPage').then(m => ({ default: m.SupportHallPage })))
const CharacterDetailPage = React.lazy(() => import('./pages/CharacterDetailPage').then(m => ({ default: m.CharacterDetailPage })))
const FriendsPage = React.lazy(() => import('./pages/FriendsPage').then(m => ({ default: m.FriendsPage })))
const DailyPage = React.lazy(() => import('./pages/DailyPage').then(m => ({ default: m.DailyPage })))
const RankingPage = React.lazy(() => import('./pages/RankingPage').then(m => ({ default: m.RankingPage })))
const PassPage = React.lazy(() => import('./pages/PassPage').then(m => ({ default: m.PassPage })))
const CalendarPage = React.lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })))
const StaminaShopPage = React.lazy(() => import('./pages/StaminaShopPage').then(m => ({ default: m.StaminaShopPage })))
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ShopPage = React.lazy(() => import('./pages/ShopPage').then(m => ({ default: m.ShopPage })))
import RhythmPage from './components/RhythmPage'

function App() {
  const { token, authLoaded } = useAuth()
  const [showGuide, setShowGuide] = useState(() => {
    // Show guide on first visit (hasSeenGuide not set)
    return localStorage.getItem('hasSeenGuide') !== '1'
  })

  const handleGuideComplete = () => {
    localStorage.setItem('hasSeenGuide', '1')
    setShowGuide(false)
  }

  const handleShowGuide = () => {
    localStorage.removeItem('hasSeenGuide')
    setShowGuide(true)
  }
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  // Check for guide reset flag on mount (set by Settings page)
  useEffect(() => {
    if (sessionStorage.getItem('showGuideReset') === '1') {
      sessionStorage.removeItem('showGuideReset')
      setShowGuide(true)
    }
  }, [])

  // Expose guide reset for other components via window
  useEffect(() => {
    (window as any).__resetGuide = handleShowGuide
  }, [])

  if (!authLoaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020008' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#00ccff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <AppProviders>
      <Layout
        showGuide={showGuide}
        setShowGuide={setShowGuide}
        onGuideComplete={handleGuideComplete}
        logoutConfirmOpen={logoutConfirmOpen}
        setLogoutConfirmOpen={setLogoutConfirmOpen}
        pendingRequestsCount={pendingRequestsCount}
      >
        <Suspense fallback={<div className="page-loading"><LoadingSpinner /></div>}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/gallery" element={<ProtectedRoute><GalleryPage /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
            <Route path="/support" element={<ProtectedRoute><SupportHallPage /></ProtectedRoute>} />
            <Route path="/detail/:charId" element={<ProtectedRoute><CharacterDetailPage /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
            <Route path="/daily" element={<ProtectedRoute><DailyPage /></ProtectedRoute>} />
            <Route path="/ranking" element={<ProtectedRoute><RankingPage /></ProtectedRoute>} />
            <Route path="/pass" element={<ProtectedRoute><PassPage /></ProtectedRoute>} />
            <Route path="/rhythm" element={<ProtectedRoute><RhythmPage token={token} /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/stamina" element={<ProtectedRoute><StaminaShopPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/shop" element={<ProtectedRoute><ShopPage /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </Layout>
    </AppProviders>
  )
}

export default App
