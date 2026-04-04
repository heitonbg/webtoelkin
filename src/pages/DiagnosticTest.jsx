import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function DiagnosticTest() {
  const navigate = useNavigate()
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState(null)

  // Profile collection step (after questions, before results)
  const [collectProfile, setCollectProfile] = useState(false)
  const [profileStep, setProfileStep] = useState(0)
  const [profileData, setProfileData] = useState({ education: '', experience: '' })

  const profileOptions = {
    education: ['Нет образования (учусь в школе)', 'Школа (окончил)', 'Колледж / техникум', 'Бакалавриат', 'Магистратура', 'PhD / Аспирантура', 'Самоучка'],
    experience: ['Нет опыта — ищу первую работу', 'Стажировка / практика (до 1 года)', 'Начальный уровень (1-2 года)', 'Средний уровень (3-5 лет)', 'Опытный специалист (5+ лет)'],
  }

  useEffect(() => {
    loadQuestions()
  }, [])

  async function loadQuestions() {
    try {
      const data = await api.getDiagnosticQuestions()
      setQuestions(data.questions || [])
    } catch (err) {
      console.error('Load questions error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = (answerText) => {
    const newAnswers = [...answers]
    newAnswers[currentQuestion] = {
      question_id: questions[currentQuestion].id,
      answer: answerText,
    }
    setAnswers(newAnswers)

    // Переход к следующему вопросу или сбор профиля
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // После последнего вопроса — собираем профиль
      setCollectProfile(true)
      setProfileStep(0)
    }
  }

  const handleProfileSelect = (value) => {
    const field = profileStep === 0 ? 'education' : 'experience'
    setProfileData(prev => ({ ...prev, [field]: value }))

    if (profileStep === 0) {
      setProfileStep(1)
    } else {
      // Оба поля заполнены — отправляем
      submitDiagnostic(answers, profileData)
    }
  }

  const handleProfileBack = () => {
    if (profileStep > 0) {
      setProfileStep(profileStep - 1)
    } else {
      setCollectProfile(false)
    }
  }

  async function submitDiagnostic(finalAnswers, profile = null) {
    setSubmitting(true)
    try {
      const result = await api.runDiagnostic(finalAnswers)
      setResults(result)
      localStorage.setItem('diagnostic_results', JSON.stringify(result))

      // Сохраняем профиль в БД
      if (profile) {
        try {
          const topCat = result.top_categories?.[0]?.category_name || ''
          const topRoles = result.recommended_roles?.slice(0, 3).map(r => r.title) || []
          await api.saveProfile({
            education: profile.education,
            field: topCat || 'IT и разработка',
            experience: profile.experience,
            interests: [],
            skills: [],
            career_goals: topRoles,
          })
        } catch (e) {
          console.warn('Failed to save profile:', e)
        }
      }
    } catch (err) {
      console.error('Diagnostic error:', err)
      navigate('/career')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100

  // Экран результатов
  if (results) {
    return (
      <div className="onboarding-container">
        <div className="onboarding-step">
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: '4rem', marginBottom: 12 }}>🎯</div>
            <h2 style={{ marginBottom: 8, color: 'var(--dark-text)' }}>Твои подходящие роли</h2>
            <p style={{ color: 'var(--dark-text-muted)', fontSize: '0.9rem' }}>На основе твоих ответов мы подобрали профессии</p>
          </div>

          {/* Топ категории */}
          {results.top_categories && results.top_categories.length > 0 && (
            <div className="card" style={{ marginBottom: 16, background: 'var(--dark-bg-light)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginBottom: 12, color: 'var(--dark-text)' }}>📊 Твои сильные стороны</h3>
              {results.top_categories.slice(0, 3).map((cat, i) => {
                const emojiMap = {
                  'it_and_development': '💻', 'data_and_analytics': '📊', 'design_and_creative': '🎨',
                  'marketing_and_sales': '📢', 'management': '👔', 'finance_and_accounting': '💰',
                  'healthcare': '🏥', 'education': '📚', 'engineering_and_manufacturing': '⚙️',
                  'media_and_entertainment': '🎬', 'hr_and_recruitment': '🤝', 'legal': '⚖️',
                  'customer_service': '🎧', 'science_and_research': '🔬', 'retail': '🛒',
                }
                const emoji = emojiMap[cat.category_id] || '💼'
                return (
                  <div key={cat.category_id} style={{ marginBottom: i < 2 ? 12 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', color: 'var(--dark-text)' }}>{emoji} {cat.category_name}</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{cat.score}%</span>
                    </div>
                    <div className="progress-bar" style={{ background: 'rgba(255,255,255,0.1)', height: '8px', borderRadius: '4px' }}>
                      <div className="progress-fill" style={{ width: `${cat.score}%`, background: 'var(--primary)', height: '100%', borderRadius: '4px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Рекомендованные роли */}
          <div className="card" style={{ background: 'var(--dark-bg-light)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: 12, color: 'var(--dark-text)' }}>💼 Рекомендуем попробовать</h3>
            <p style={{ color: 'var(--dark-text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
              Выбери одну или несколько — по каждой будет тест
            </p>

            {results.recommended_roles?.slice(0, 8).map((role) => (
              <button
                key={role.role_id}
                onClick={() => {
                  console.log('🎯 Navigating to scenario-runner with role:', role)
                  // Сохраняем роль в localStorage как fallback
                  localStorage.setItem('pending_scenario_roles', JSON.stringify([role]))
                  navigate('/scenario-runner', { state: { roles: [role] } })
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 12, marginBottom: 8,
                  border: '2px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.04)',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.04)'}
              >
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.5rem' }}>{role.category_emoji || '💼'}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--dark-text)' }}>{role.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--dark-text-muted)' }}>{role.category_emoji || ''} {role.category}</div>
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700,
                  background: role.match_percent >= 70 ? 'rgba(0,184,148,0.15)' : role.match_percent >= 50 ? 'rgba(253,203,110,0.15)' : 'rgba(225,112,85,0.15)',
                  color: role.match_percent >= 70 ? 'var(--success)' : role.match_percent >= 50 ? '#e17055' : 'var(--danger)',
                }}>
                  {role.match_percent}%
                </span>
              </button>
            ))}
          </div>

          {/* Кнопка продолжить */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 16 }}
            onClick={() => navigate('/career')}
          >
            Продолжить →
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>
  }

  if (questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>😕</div>
        <h2>Не удалось загрузить вопросы</h2>
        <button className="btn btn-primary" onClick={() => navigate('/career')}>← На главную</button>
      </div>
    )
  }

  const q = questions[currentQuestion]

  // ===== СБОР ПРОФИЛЯ (после вопросов) =====
  if (collectProfile && !results) {
    const field = profileStep === 0 ? 'education' : 'experience'
    const label = profileStep === 0 ? 'Какое у тебя образование?' : 'Какой у тебя опыт работы?'
    const options = profileOptions[field]
    const selected = profileData[field]

    return (
      <div className="onboarding-container">
        <div className="onboarding-step">
          {/* Прогресс */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem', color: 'var(--dark-text-muted)' }}>
              <span>{profileStep === 0 ? 'Почти готово!' : 'Ещё чуть-чуть!'}</span>
              <span>Шаг {profileStep + 1} из 2</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '100%' }} />
            </div>
          </div>

          <h2 className="onboarding-question">{label}</h2>

          <div className="onboarding-options">
            {options.map(opt => (
              <button
                key={opt}
                className={`onboarding-option ${selected === opt ? 'selected' : ''}`}
                onClick={() => handleProfileSelect(opt)}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="onboarding-nav">
            <button className="btn btn-secondary" onClick={handleProfileBack} style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--dark-text)' }}>
              ← Назад
            </button>
          </div>

          {submitting && (
            <div className="loading" style={{ marginTop: 20 }}>
              <div className="spinner" />
              <p style={{ marginTop: 12, color: 'var(--dark-text-muted)' }}>Подбираю роли...</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-step">
        {/* Прогресс */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem', color: 'var(--dark-text-muted)' }}>
            <span>Вопрос {currentQuestion + 1} из {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Вопрос */}
        <h2 className="onboarding-question">{q.text}</h2>

        {/* Варианты */}
        <div className="onboarding-options">
          {q.options.map((option, i) => (
            <button
              key={i}
              className="onboarding-option"
              onClick={() => handleAnswer(option.text)}
              style={{ textAlign: 'left', fontSize: '0.95rem', padding: '14px 18px' }}
            >
              {option.text}
            </button>
          ))}
        </div>

        {/* Навигация */}
        <div className="onboarding-nav">
          {currentQuestion > 0 && (
            <button
              className="btn btn-secondary"
              onClick={handleBack}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--dark-text)' }}
            >
              ← Назад
            </button>
          )}
        </div>

        {submitting && (
          <div className="loading" style={{ marginTop: 20 }}>
            <div className="spinner" />
            <p style={{ marginTop: 12, opacity: 0.8 }}>Анализируем твои ответы...</p>
          </div>
        )}
      </div>
    </div>
  )
}
