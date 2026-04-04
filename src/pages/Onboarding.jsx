import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getTelegramId } from '../api/client'

// Упрощённый онбординг: 3 шага → AI-роли
const STEPS = [
  {
    id: 'education',
    question: 'Какое у тебя образование?',
    subtitle: 'Выбери или напиши своё',
    type: 'select_with_input',
    options: [
      'Нет образования (учусь в школе)',
      'Школа (окончил)',
      'Колледж / техникум',
      'Бакалавриат (учусь / окончил)',
      'Магистратура (учусь / окончил)',
      'PhD / Аспирантура',
      'Самоучка',
    ],
  },
  {
    id: 'profession',
    question: 'Кем ты хочешь работать?',
    subtitle: 'Напиши профессию или направление — это главное',
    type: 'text',
    placeholder: 'Например: Python-разработчик, маркетолог, юрист, дизайнер, повар, механик...',
  },
  {
    id: 'experience',
    question: 'Какой у тебя опыт работы?',
    subtitle: 'Это влияет на уровень позиций',
    type: 'select',
    options: [
      'Нет опыта — ищу первую работу / стажировку',
      'Стажировка / практика (до 1 года)',
      'Начальный уровень (1-2 года)',
      'Средний уровень (3-5 лет)',
      'Опытный специалист (5+ лет)',
    ],
  },
]

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    education: '',
    profession: '',
    experience: '',
    interests: [],
    skills: [],
    goal: '',
  })
  const [textInput, setTextInput] = useState('')
  const [multiSelect, setMultiSelect] = useState([])
  const [loading, setLoading] = useState(false)
  const [fading, setFading] = useState(false)
  const navigate = useNavigate()

  const currentStep = STEPS[step]
  const isLastStep = step === STEPS.length - 1

  const canProceed = (() => {
    switch (currentStep.type) {
      case 'select': return multiSelect.length === 1
      case 'select_with_input': return multiSelect.length === 1 || textInput.trim().length > 0
      case 'text': return textInput.trim().length >= 2
      default: return false
    }
  })()

  const handleNext = () => {
    if (!canProceed) return

    let newData = { ...data }

    switch (currentStep.type) {
      case 'select':
        newData[currentStep.id] = multiSelect[0]
        break
      case 'select_with_input':
        newData[currentStep.id] = textInput.trim() || multiSelect[0]
        break
      case 'text':
        newData[currentStep.id] = textInput.trim()
        break
    }

    if (isLastStep) {
      setData(newData)
      handleSubmit(newData)
    } else {
      setData(newData)
      setStep(step + 1)
      setMultiSelect([])
      setTextInput('')
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
      setMultiSelect([])
      setTextInput('')
    }
  }

  const toggleOption = (option) => {
    if (currentStep.type.includes('multi')) {
      setMultiSelect(prev =>
        prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
      )
    } else {
      setMultiSelect([option])
    }
  }

  const handleSubmit = async (finalData) => {
    setLoading(true)
    setFading(true)
    try {
      const payload = {
        telegram_id: getTelegramId(),
        education: finalData.education,
        field: finalData.profession,
        experience: finalData.experience,
        interests: [],
        skills: [],
        career_goals: [],
      }
      await api.saveOnboarding(payload)
      // Плавный переход — навигация после fade
      setTimeout(() => navigate('/diagnostic'), 400)
    } catch (err) {
      console.error('Onboarding error:', err)
      navigate('/career')
    } finally {
      setLoading(false)
    }
  }

  // Рендер поля ввода
  const renderInput = () => {
    const inputStyle = {
      width: '100%',
      padding: '14px 18px',
      borderRadius: 14,
      border: textInput ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
      background: 'var(--dark-bg-light)',
      color: 'var(--dark-text)',
      fontSize: currentStep.type === 'text' ? '1.05rem' : '0.95rem',
      outline: 'none',
    }

    if (currentStep.type === 'text') {
      return (
        <input
          type="text"
          className="onboarding-input"
          placeholder={currentStep.placeholder}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canProceed && handleNext()}
          autoFocus
          style={{ ...inputStyle, marginBottom: 20 }}
        />
      )
    }

    return null
  }

  // Рендер выбора
  const renderOptions = () => {
    const showInput = currentStep.type === 'select_with_input'

    return (
      <>
        <div className="onboarding-options">
          {currentStep.options.map(option => (
            <button
              key={option}
              className={`onboarding-option ${multiSelect.includes(option) ? 'selected' : ''}`}
              onClick={() => {
                if (showInput && textInput) setTextInput('')
                toggleOption(option)
              }}
            >
              {option}
            </button>
          ))}
        </div>

        {showInput && (
          <div style={{ marginTop: 12 }}>
            <input
              type="text"
              className="onboarding-input"
              placeholder="Или напиши своё..."
              value={textInput}
              onChange={(e) => { setTextInput(e.target.value); if (e.target.value.trim()) setMultiSelect([]) }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: textInput ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.1)',
                background: 'var(--dark-bg-light)',
                color: 'var(--dark-text)',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>
        )}
      </>
    )
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-step">
        {/* Прогресс */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem', color: 'var(--dark-text-muted)' }}>
            <span>Шаг {step + 1} из {STEPS.length}</span>
            <span>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="progress-bar" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="progress-fill"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Вопрос */}
        <h2 className="onboarding-question">{currentStep.question}</h2>
        {currentStep.subtitle && (
          <p style={{ textAlign: 'center', color: 'var(--dark-text-muted)', marginBottom: 24, fontSize: '0.95rem' }}>
            {currentStep.subtitle}
          </p>
        )}

        {/* Контент */}
        {currentStep.type === 'text'
          ? renderInput()
          : renderOptions()
        }

        {/* Навигация */}
        <div className="onboarding-nav">
          {step > 0 && (
            <button
              className="btn btn-secondary"
              onClick={handleBack}
              style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--dark-text)' }}
            >
              ← Назад
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!canProceed || loading}
          >
            {loading ? '⏳ Сохраняю...' : isLastStep ? '🤖 Подобрать роли AI' : 'Далее →'}
          </button>
        </div>

        {/* Пропустить */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={() => navigate('/career')}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--dark-text-muted)',
              padding: '8px 16px',
              borderRadius: 12,
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Пропустить →
          </button>
        </div>
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
