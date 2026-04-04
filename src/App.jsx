import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import CareerPath from './pages/CareerPath'
import Vacancies from './pages/Vacancies'
import Chat from './pages/Chat'
import RoleSelection from './pages/RoleSelection'
import ScenarioRunner from './pages/ScenarioRunner'
import DiagnosticTest from './pages/DiagnosticTest'
import BottomNav from './components/BottomNav'

function App() {
  return (
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
  )
}

export default App
