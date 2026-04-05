import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function CareerPath() {
  const [matchedRoles, setMatchedRoles] = useState([])
  const [scenarioStats, setScenarioStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedForTest, setSelectedForTest] = useState([])
  const [showAllRoles, setShowAllRoles] = useState(false)
  const [dailyStreak, setDailyStreak] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      // Загружаем результаты диагностики из БД
      const dbResult = await api.getDiagnosticResult()
      if (dbResult.exists && dbResult.result?.recommended_roles?.length > 0) {
        console.log('✅ Found diagnostic results in DB')
        setMatchedRoles(dbResult.result.recommended_roles)
        try {
          const stats = await api.getMyScenarioStats()
          setScenarioStats(stats.results || [])
        } catch (e) { /* ignore */ }
        setLoading(false)
        return
      }

      // Нет результатов — показываем приглашение
      console.log('📋 No results in DB, showing onboarding prompt')
      setMatchedRoles([])
      setLoading(false)
    } catch (err) {
      console.error('CareerPath error:', err)
      setMatchedRoles([])
      setLoading(false)
    }
  }

  const toggleSelect = (role) => {
    setSelectedForTest(prev => {
      const exists = prev.find(r => r.role_id === role.role_id)
      if (exists) return prev.filter(r => r.role_id !== role.role_id)
      return [...prev, role]
    })
  }

  const selectAll = () => {
    const untested = matchedRoles.filter(r => !testedRoleIds.has(r.role_id))
    setSelectedForTest(untested.slice(0, 5))
  }

  const startTest = () => {
    if (selectedForTest.length === 0) {
      const top3 = matchedRoles.filter(r => r.match_percent >= 30).slice(0, 3)
      navigate('/scenario-runner', { state: { roles: top3 } })
    } else {
      navigate('/scenario-runner', { state: { roles: selectedForTest } })
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>
  }

  const testedRoleIds = new Set(scenarioStats.map(s => s.role_id))
  const untestedRoles = matchedRoles.filter(r => !testedRoleIds.has(r.role_id))
  const testedRoles = matchedRoles.filter(r => testedRoleIds.has(r.role_id))

  // Прогресс
  const totalRoles = matchedRoles.length
  const testedCount = testedRoles.length
  const progressPercent = totalRoles > 0 ? Math.round((testedCount / totalRoles) * 100) : 0

  // Следующий рекомендуемый шаг
  const getNextStep = () => {
    if (testedCount === 0) return { icon: '🎯', text: 'Пройди первый тест', action: 'test' }
    if (progressPercent < 50) return { icon: '📈', text: `Продолжай — осталось ${totalRoles - testedCount} ролей`, action: 'test' }
    if (progressPercent < 100) return { icon: '🏁', text: 'Почти готово! Заверши оставшиеся', action: 'test' }
    return { icon: '🎉', text: 'Все тесты пройдены!', action: 'done' }
  }
  const nextStep = getNextStep()

  // Лучшие роли
  const bestRoles = [...testedRoles].sort((a, b) => {
    const aStat = scenarioStats.find(s => s.role_id === a.role_id)
    const bStat = scenarioStats.find(s => s.role_id === b.role_id)
    return (bStat?.match_score || 0) - (aStat?.match_score || 0)
  })

  // Отображаемые роли
  const displayRoles = showAllRoles ? untestedRoles : untestedRoles.slice(0, 8)

  return (
    <div>
      <div className="page-header">
        <h1>🎯 Карьерный путь</h1>
        <p>Твой план развития и прогресс</p>
      </div>

      <div style={{ padding: 16 }}>

        {/* ===== ПРИГЛАШЕНИЕ ПРОЙТИ ТЕСТ ===== */}
        {matchedRoles.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🧠</div>
            <h2 style={{ color: 'var(--dark-text)', marginBottom: 8 }}>Пройди диагностику</h2>
            <p style={{ color: 'var(--dark-text-muted)', marginBottom: 20, fontSize: '0.9rem' }}>
              Ответь на 10 вопросов и мы подберём подходящие профессии из 197 доступных
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/diagnostic')}
              style={{ width: '100%' }}
            >
              Начать тест →
            </button>
          </div>
        )}

        {/* ===== ПРОГРЕСС ===== */}
        <div className="card">
          {/* Заголовок прогресса */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--dark-text)' }}>Твой прогресс</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--dark-text-muted)' }}>{testedCount} из {totalRoles} ролей пройдено</div>
            </div>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: progressPercent >= 70 ? 'rgba(16,185,129,0.15)' : progressPercent >= 30 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.9rem',
              color: progressPercent >= 70 ? '#059669' : progressPercent >= 30 ? '#D97706' : '#DC2626',
            }}>
              {progressPercent}%
            </div>
          </div>

          {/* Прогресс-бар */}
          <div className="progress-bar" style={{ marginBottom: 16 }}>
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          {/* Следующий шаг */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 12,
            background: 'rgba(255,255,255,0.04)',
          }}>
            <span style={{ fontSize: '1.5rem' }}>{nextStep.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark-text)' }}>{nextStep.text}</div>
              {nextStep.action === 'test' && (
                <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)' }}>Нажми кнопку ниже чтобы начать</div>
              )}
            </div>
          </div>
        </div>

        {/* ===== ЛУЧШИЕ РЕЗУЛЬТАТЫ ===== */}
        {bestRoles.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>🏆 Лучшие результаты</h3>
            {bestRoles.slice(0, 3).map((role, i) => {
              const stat = scenarioStats.find(s => s.role_id === role.role_id)
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={role.role_id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: i < Math.min(bestRoles.length, 3) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>{medals[i]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark-text)' }}>{role.title}</div>
                    {stat?.feedback && <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)' }}>{stat.feedback}</div>}
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: 16, fontSize: '0.85rem', fontWeight: 700,
                    background: stat?.match_score >= 70 ? 'rgba(16,185,129,0.12)' : stat?.match_score >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                    color: stat?.match_score >= 70 ? '#059669' : stat?.match_score >= 40 ? '#D97706' : '#DC2626',
                  }}>
                    {stat?.match_score}%
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* ===== DAILY STREAK ===== */}
        {dailyStreak && dailyStreak.total_completed > 0 && (
          <div className="card" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <h3 style={{ marginBottom: 12 }}>🔥 Daily Challenge</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F59E0B' }}>{dailyStreak.streak}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)' }}>Текущий</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{dailyStreak.best_streak}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)' }}>Лучший</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{dailyStreak.total_completed}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)' }}>Всего</div>
              </div>
            </div>
            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: 12, fontSize: '0.85rem' }}
              onClick={() => navigate('/dashboard')}
            >
              🎭 Решить сегодня →
            </button>
          </div>
        )}

        {/* ===== ДОСТУПНЫЕ РОЛИ ===== */}
        {untestedRoles.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>🆕 Доступные роли ({untestedRoles.length})</h3>
              {untestedRoles.length > 8 && (
                <button
                  onClick={() => setShowAllRoles(!showAllRoles)}
                  style={{
                    background: 'transparent', border: 'none',
                    color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                  }}
                >
                  {showAllRoles ? 'Свернуть' : 'Показать все →'}
                </button>
              )}
            </div>

            {/* Быстрый выбор */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={() => {
                const top3 = untestedRoles.filter(r => r.match_percent >= 30).slice(0, 3)
                setSelectedForTest(top3)
              }} style={{
                flex: 1, padding: '8px 12px', borderRadius: 10,
                background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                color: '#059669', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600,
              }}>✨ Топ совпадения</button>
              <button onClick={selectAll} style={{
                flex: 1, padding: '8px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--dark-text)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600,
              }}>Выбрать все</button>
            </div>

            {/* Список ролей */}
            {displayRoles.map((role) => {
              const isSelected = selectedForTest.find(r => r.role_id === role.role_id)
              return (
                <button
                  key={role.role_id}
                  onClick={() => toggleSelect(role)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 12, marginBottom: 6, width: '100%',
                    border: isSelected ? '2px solid var(--primary)' : '2px solid rgba(255, 255, 255, 0.08)',
                    background: isSelected ? 'rgba(227,6,17,0.15)' : 'rgba(255, 255, 255, 0.04)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.3rem' }}>{role.category_emoji || '💼'}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark-text)' }}>{role.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)' }}>{role.category}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700,
                      background: role.match_percent >= 70 ? 'rgba(16,185,129,0.12)' : role.match_percent >= 50 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                      color: role.match_percent >= 70 ? '#059669' : role.match_percent >= 50 ? '#D97706' : '#DC2626',
                    }}>
                      {role.match_percent}%
                    </span>
                    <span style={{
                      width: 22, height: 22, borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.15)'}`,
                      background: isSelected ? 'var(--primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: '0.65rem', fontWeight: 700,
                    }}>
                      {isSelected && '✓'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* ===== КНОПКА ТЕСТА ===== */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: 12 }}
          onClick={startTest}
        >
          🚀 {selectedForTest.length > 0
            ? `Начать тест (${selectedForTest.length} ${selectedForTest.length === 1 ? 'роль' : selectedForTest.length < 5 ? 'роли' : 'ролей'})`
            : 'Начать тест (топ-3 роли)'}
        </button>

        {/* ===== ПРОЙДЕННЫЕ РОЛИ ===== */}
        {testedRoles.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>✅ Пройденные роли ({testedRoles.length})</h3>
            {testedRoles.map((role, i) => {
              const stat = scenarioStats.find(s => s.role_id === role.role_id)
              return (
                <div key={role.role_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: i < testedRoles.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark-text)' }}>{role.title}</div>
                    {stat?.feedback && <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)' }}>{stat.feedback}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 16, fontSize: '0.8rem', fontWeight: 700,
                      background: stat?.match_score >= 70 ? 'rgba(16,185,129,0.12)' : stat?.match_score >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                      color: stat?.match_score >= 70 ? '#059669' : stat?.match_score >= 40 ? '#D97706' : '#DC2626',
                    }}>
                      {stat?.match_score}%
                    </span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      onClick={() => navigate('/scenario-runner', { state: { roles: [role] } })}
                    >
                      ↻
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
