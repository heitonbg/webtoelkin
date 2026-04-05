import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api/client'

export default function ScenarioRunner() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Получаем роли из state или из sessionStorage (fallback)
  const [roles, setRoles] = useState(() => {
    const stateRoles = location.state?.roles || []
    if (stateRoles.length === 0) {
      // Пробуем загрузить из sessionStorage
      try {
        const stored = sessionStorage.getItem('pending_scenario_roles')
        if (stored) {
          const parsed = JSON.parse(stored)
          console.log('📦 Loaded roles from sessionStorage:', parsed)
          return parsed
        }
      } catch (e) {
        console.error('Failed to load roles from sessionStorage:', e)
      }
    }
    return stateRoles
  })

  const [scenarios, setScenarios] = useState([])
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [situationAnswer, setSituationAnswer] = useState('')
  const [results, setResults] = useState({})
  const [fading, setFading] = useState(false)

  useEffect(() => {
    console.log(' ScenarioRunner mounted, roles:', roles)
    if (roles.length === 0) {
      console.warn('⚠️ No roles, showing fallback')
      setLoading(false) // Не редиректим, показываем fallback
      return
    }
    loadScenarios()
  }, [roles])

  async function loadScenarios() {
    setLoading(true)
    try {
      console.log('📦 Loading scenarios for roles:', roles.map(r => r.role_id))
      const loaded = []
      for (const roleData of roles) {
        // Быстрая загрузка сценария из БД
        const scenario = await api.getScenario(roleData.role_id, 'junior')
        console.log(`📋 Scenario for ${roleData.role_id}:`, scenario)
        if (scenario && !scenario.error) {
          loaded.push({
            role_id: scenario.role_id,
            role_name: scenario.title || roleData.title,
            questions: scenario.questions || [],
          })
        } else {
          console.warn(`⚠️ No scenario for ${roleData.role_id}`)
        }
      }

      if (loaded.length === 0) {
        console.error('❌ No scenarios loaded, showing fallback')
        setLoading(false)
        return
      }

      console.log('✅ Loaded scenarios:', loaded.map(s => ({ role_id: s.role_id, questions: s.questions.length })))
      // Очищаем sessionStorage после успешной загрузки
      sessionStorage.removeItem('pending_scenario_roles')

      setScenarios(loaded)

      const initAnswers = {}
      for (const s of loaded) initAnswers[s.role_id] = []
      setAnswers(initAnswers)
      setLoading(false)
    } catch (err) {
      console.error('Load scenarios error:', err)
      setLoading(false)
    }
  }

  const currentScenario = scenarios[currentRoleIndex]
  const currentQuestion = currentScenario?.questions?.[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex >= (currentScenario?.questions?.length || 1) - 1
  const isLastRole = currentRoleIndex >= scenarios.length - 1

  // Определяем тип вопроса: ситуация или тест
  const isSituation = currentQuestion?.type === 'situation' || !currentQuestion?.options?.length

  const handleTestAnswer = (option) => {
    if (!currentScenario) return
    const roleId = currentScenario.role_id

    setAnswers(prev => {
      const roleAnswers = prev[roleId] || []
      const existingIndex = roleAnswers.findIndex(a => a.question_id === currentQuestion.id)
      if (existingIndex >= 0) {
        const updated = [...roleAnswers]
        updated[existingIndex] = { question_id: currentQuestion.id, answer: option }
        return { ...prev, [roleId]: updated }
      }
      return { ...prev, [roleId]: [...roleAnswers, { question_id: currentQuestion.id, answer: option }] }
    })

    if (isLastQuestion) {
      if (isLastRole) {
        submitAll()
      } else {
        setCurrentRoleIndex(currentRoleIndex + 1)
        setCurrentQuestionIndex(0)
      }
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handleSituationSubmit = () => {
    if (!situationAnswer.trim() || !currentScenario) return
    const roleId = currentScenario.role_id

    setAnswers(prev => {
      const roleAnswers = prev[roleId] || []
      return { ...prev, [roleId]: [...roleAnswers, { question_id: currentQuestion.id, answer: situationAnswer.trim(), type: 'situation' }] }
    })

    setSituationAnswer('')

    if (isLastQuestion) {
      if (isLastRole) {
        submitAll()
      } else {
        setCurrentRoleIndex(currentRoleIndex + 1)
        setCurrentQuestionIndex(0)
      }
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  async function submitAll() {
    setSubmitting(true)
    setFading(true)
    try {
      const allResults = []

      // Мгновенный rule-based скоринг для каждой роли
      for (const scenario of scenarios) {
        const roleAnswers = answers[scenario.role_id] || []
        if (roleAnswers.length > 0) {
          const result = await api.scoreScenario(scenario.role_id, 'junior', roleAnswers)
          allResults.push(result)
        }
      }

      setResults(allResults)

      // Плавный переход на дашборд
      try { await api.completeRetest() } catch (e) {}
      setTimeout(() => navigate('/dashboard'), 400)
    } catch (err) {
      console.error('Submit error:', err)
      navigate('/dashboard')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>
  }

  if (scenarios.length === 0 || roles.length === 0) {
    return (
      <div className="onboarding-container">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>📋</div>
          <h2 style={{ color: 'var(--dark-text)' }}>Нет доступных сценариев</h2>
          <p style={{ color: 'var(--dark-text-muted)', marginBottom: 24 }}>
            Для выбранных ролей пока нет сценариев. Попробуй выбрать другие профессии.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/diagnostic')} style={{ marginRight: 8 }}>
            ← К результатам теста
          </button>
          <button className="btn" onClick={() => navigate('/career')} style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--dark-text)' }}>
            На главную
          </button>
        </div>
      </div>
    )
  }

  const totalQuestions = scenarios.reduce((acc, s) => acc + (s.questions?.length || 0), 0)
  const currentTotal = scenarios.slice(0, currentRoleIndex).reduce((acc, s) => acc + (s.questions?.length || 0), 0) + currentQuestionIndex
  const progress = (currentTotal / totalQuestions) * 100

  return (
    <div className="onboarding-container">
      <div className="onboarding-step">
        {/* Прогресс */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem', color: 'var(--dark-text-muted)' }}>
            <span>{currentScenario.role_name}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Индикатор типа вопроса */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <span style={{
            padding: '4px 12px', borderRadius: 16,
            background: isSituation ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.08)',
            color: isSituation ? '#C084FC' : 'var(--dark-text-muted)',
            fontSize: '0.8rem', fontWeight: isSituation ? 600 : 400,
          }}>
            {isSituation ? '🎭 Ситуация' : '❓ Тест'} • Роль {currentRoleIndex + 1}/{scenarios.length} • Вопрос {currentQuestionIndex + 1}/{currentScenario.questions.length}
          </span>
        </div>

        {/* Вопрос */}
        <h2 className="onboarding-question">
          {currentQuestion?.text}
        </h2>

        {/* ТЕСТ: варианты ответов (кнопки) */}
        {!isSituation && currentQuestion?.options && (
          <div className="onboarding-options">
            {currentQuestion.options.map((option, i) => {
              const optionText = typeof option === 'string' ? option : option.text
              if (optionText === 'Свой вариант') return null
              return (
                <button key={i} className="onboarding-option" onClick={() => handleTestAnswer(optionText)}>
                  {optionText}
                </button>
              )
            })}
          </div>
        )}

        {/* СИТУАЦИЯ: поле ввода */}
        {isSituation && (
          <div style={{ marginTop: 8 }}>
            <textarea
              className="situation-input"
              placeholder="Опиши, как бы ты поступил в этой ситуации..."
              value={situationAnswer}
              onChange={(e) => setSituationAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  handleSituationSubmit()
                }
              }}
              rows={4}
            />
            <button
              className="btn btn-primary"
              onClick={handleSituationSubmit}
              disabled={!situationAnswer.trim()}
              style={{ marginTop: 12 }}
            >
              {isLastQuestion && isLastRole ? '🚀 Завершить' : 'Отправить →'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.75rem', color: 'var(--dark-text-muted)' }}>
              Ctrl + Enter для отправки
            </div>
          </div>
        )}

        {submitting && <div className="loading"><div className="spinner" /></div>}
      </div>

      {/* Fade overlay для плавного перехода */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#18181B',
          opacity: fading ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
          zIndex: 999,
        }}
      />
    </div>
  )
}
