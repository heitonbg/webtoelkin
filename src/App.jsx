import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import CareerPath from './pages/CareerPath'
import Vacancies from './pages/Vacancies'
import Chat from './pages/Chat'
import RoleSelection from './pages/RoleSelection'
import ScenarioRunner from './pages/ScenarioRunner'
import DiagnosticTest from './pages/DiagnosticTest'
import BottomNav from './components/BottomNav'
import { useTelegramAuth } from './hooks/useTelegramAuth'

// Контекст для доступа к данным Telegram из любого компонента
export const TelegramContext = createContext(null)

export function useTelegram() {
  return useContext(TelegramContext)
}

function AppWithTelegramAuth() {
  const { profile, loading, error, isAuthenticated } = useTelegramAuth()
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    if (!loading) {
      // Инициализируем Telegram WebApp
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready()
        window.Telegram.WebApp.expand()
      }
      setAppReady(true)
    }
  }, [loading])

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <p>Загрузка...</p>
      </div>
    )
  }

  return (
    <TelegramContext.Provider value={{ profile, loading, error, isAuthenticated }}>
      <BrowserRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<Navigate to="/diagnostic" replace />} />
            <Route path="/diagnostic" element={<DiagnosticTest />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/role-selection" element={<RoleSelection />} />
            <Route path="/scenario-runner" element={<ScenarioRunner />} />
            <Route path="/career" element={<><CareerPath /><BottomNav /></>} />
            <Route path="/dashboard" element={<><Dashboard /><BottomNav /></>} />
            <Route path="/vacancies" element={<><Vacancies /><BottomNav /></>} />
            <Route path="/chat" element={<><Chat /><BottomNav /></>} />
            <Route path="*" element={<Navigate to="/career" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TelegramContext.Provider>
  )
}

function App() {
  return <AppWithTelegramAuth />
}

export default App
