import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api/client'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [telegramData, setTelegramData] = useState(null) // Реальные данные из Telegram
  const [loading, setLoading] = useState(true)
  const [matchedRoles, setMatchedRoles] = useState([])
  const [scenarioStats, setScenarioStats] = useState([])
  const [vacancies, setVacancies] = useState([])
  const [vacanciesLoading, setVacanciesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('стажер')
  const [expandedSection, setExpandedSection] = useState(null)

  // Daily Challenge state
  const [dailyChallenge, setDailyChallenge] = useState(null)
  const [dailyAnswer, setDailyAnswer] = useState('')
  const [dailySubmitting, setDailySubmitting] = useState(false)
  const [dailyResult, setDailyResult] = useState(null)
  const [dailyStreak, setDailyStreak] = useState(null)

  // Achievements
  const [achievements, setAchievements] = useState([])
  const [newAchievements, setNewAchievements] = useState([])

  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const profileData = await api.getProfile()
      if (!profileData.exists) {
        setProfile(null)
      } else {
        setProfile(profileData.profile)
        
        // Загружаем реальные данные Telegram (username, photo)
        if (profileData.telegram) {
          setTelegramData(profileData.telegram)
          
          // Если нет фото — загружаем через Bot API (base64)
          if (!profileData.telegram.telegram_photo_url) {
            try {
              const avatarData = await api.getTelegramAvatar()
              if (avatarData?.photo_url) {
                setTelegramData(prev => ({ ...prev, telegram_photo_url: avatarData.photo_url }))
              }
            } catch (e) {
              console.warn('Failed to load avatar')
            }
          }
        }

        try {
          const rolesResult = await api.matchRoles()
          setMatchedRoles(rolesResult.roles || [])
        } catch (e) {
          console.warn('Role matching failed')
        }

        try {
          const stats = await api.getMyScenarioStats()
          setScenarioStats(stats.results || [])
        } catch (e) {
          console.warn('Scenario stats failed')
        }
      }

      // Загружаем daily challenge
      try {
        const challenge = await api.getDailyChallenge()
        if (challenge && !challenge.error) {
          setDailyChallenge(challenge)
          if (challenge.answered) {
            setDailyResult({ ai_score: challenge.ai_score, ai_feedback: challenge.ai_feedback })
          }
        }
        const streak = await api.getDailyStreak()
        setDailyStreak(streak)
      } catch (e) {
        console.warn('Daily challenge failed:', e)
      }

      // Загружаем достижения
      try {
        const ach = await api.getAchievements()
        setAchievements(ach.achievements || [])
      } catch (e) {
        console.warn('Achievements failed:', e)
      }
    } catch (err) {
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function searchVacancies() {
    setVacanciesLoading(true)
    try {
      const result = await api.searchVacancies(searchQuery, '', 10)
      setVacancies(result.vacancies || [])
    } catch (e) {
      console.error('Vacancy search failed')
    } finally {
      setVacanciesLoading(false)
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>
  }

  if (!profile) {
    return (
      <div>
        <div className="page-header">
          <h1>🧠 CareerFlow</h1>
          <p>Твой карьерный навигатор</p>
        </div>
        <div style={{ padding: 16 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>👋</div>
            <h2>Добро пожаловать!</h2>
            <p style={{ color: 'var(--dark-text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
              Ответь на 10 вопросов и мы подберём подходящие профессии из 197 доступных
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/diagnostic')}>
              🚀 Пройти диагностику
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Расчёт заполненности профиля
  const profileFields = [
    !!profile?.education,
    !!profile?.field,
    !!profile?.experience,
    (profile?.interests || []).length > 0,
    (profile?.skills || []).length > 0,
    (profile?.career_goals || []).length > 0,
  ]
  const profileCompleteness = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100)

  // Уровни навыков
  const skills = profile?.skills || []
  const getSkillLevel = (skill) => {
    const tested = scenarioStats.find(s => 
      s.details?.some(d => d.type !== 'situation' && d.score >= 15)
    )
    if (skills.length <= 2) return 'Junior'
    if (skills.length <= 5) return 'Middle'
    return 'Senior'
  }
  const skillLevel = skills.length > 0 ? getSkillLevel(skills[0]) : 'Начинающий'

  // Статистика тестов
  const rolesTested = new Set(scenarioStats.map(s => s.role_id)).size
  const avgScore = scenarioStats.length > 0
    ? Math.round(scenarioStats.reduce((sum, s) => sum + (s.match_score || 0), 0) / scenarioStats.length)
    : null
  const bestScore = scenarioStats.length > 0
    ? Math.max(...scenarioStats.map(s => s.match_score || 0))
    : null
  const testsTaken = scenarioStats.length

  // Рекомендации
  const getRecommendations = () => {
    const recs = []
    if (profileCompleteness < 60) recs.push({ icon: '📝', text: 'Заполни профиль полностью', priority: 'high' })
    if (rolesTested === 0) recs.push({ icon: '🎯', text: 'Пройди первый тест — узнай свои сильные стороны', priority: 'high' })
    if (avgScore && avgScore < 50) recs.push({ icon: '📚', text: 'Подтяни базовые знания — начни с лёгких ролей', priority: 'medium' })
    if (avgScore && avgScore >= 70) recs.push({ icon: '🚀', text: 'Отличный результат! Попробуй более сложные роли', priority: 'low' })
    if (matchedRoles.length > 3 && rolesTested < 3) recs.push({ icon: '🔍', text: `Ещё ${matchedRoles.length - rolesTested} ролей ждут тестирования`, priority: 'medium' })
    if (scenarioStats.some(s => s.match_score < 40)) recs.push({ icon: '💡', text: 'Есть зоны роста — посмотри детальные результаты', priority: 'medium' })
    return recs
  }
  const recommendations = getRecommendations()

  async function handleDailyAnswerSubmit() {
    if (!dailyAnswer.trim()) return
    setDailySubmitting(true)
    try {
      const result = await api.submitDailyAnswer(dailyAnswer)
      if (result.error) {
        alert(result.error)
      } else {
        setDailyResult(result)
        setDailyStreak(prev => ({ ...prev, streak: result.streak, best_streak: result.best_streak }))
        setDailyChallenge(prev => prev ? { ...prev, answered: true } : null)
        if (result.new_achievements && result.new_achievements.length > 0) {
          setNewAchievements(result.new_achievements)
          // Refresh achievements list
          const ach = await api.getAchievements()
          setAchievements(ach.achievements || [])
        }
      }
    } catch (e) {
      console.error('Daily answer submit error:', e)
    } finally {
      setDailySubmitting(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>🚀 Карьерный путь</h1>
        <p>Твой персональный план развития</p>
      </div>

      <div style={{ padding: 16 }}>

        {/* ===== ПРОФИЛЬ TELEGRAM ===== */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(227,6,17,0.12) 0%, rgba(255,45,55,0.08) 100%)', border: '1px solid rgba(227,6,17,0.25)' }}>
          {/* Аватар + Имя */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
            {/* Аватарка */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, #E30611, #FF2D37)',
                padding: '3px',
                boxShadow: '0 4px 20px rgba(227,6,17,0.3)',
              }}>
                <img
                  src={telegramData?.telegram_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent((telegramData?.telegram_first_name || 'U') + ' ' + (telegramData?.telegram_last_name || ''))}&background=E30611&color=fff&size=160&bold=true`}
                  alt="Avatar"
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #1A1A1A' }}
                />
              </div>
              {telegramData?.telegram_language_code && (
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  background: '#1A1A1A', borderRadius: 12,
                  padding: '2px 6px', fontSize: '0.7rem',
                  border: '2px solid rgba(227,6,17,0.3)',
                }}>
                  🌐 {telegramData.telegram_language_code.toUpperCase()}
                </div>
              )}
            </div>

            {/* Информация */}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--dark-text)' }}>
                {telegramData?.telegram_first_name || profile?.education?.split(' ')[0] || 'Пользователь'}
                {telegramData?.telegram_last_name && (
                  <span style={{ marginLeft: 6, color: 'var(--dark-text-muted)', fontWeight: 400 }}>
                    {telegramData.telegram_last_name}
                  </span>
                )}
              </h3>
              
              {telegramData?.telegram_username && (
                <div style={{ fontSize: '0.9rem', color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>
                  @{telegramData.telegram_username}
                </div>
              )}

              <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)', marginTop: 6 }}>
                ID: {profile?.telegram_id}
              </div>
            </div>
          </div>

          {/* Заполненность профиля */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--dark-text)', fontWeight: 600 }}>Заполненность профиля</span>
              <span style={{
                padding: '4px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700,
                background: profileCompleteness >= 80 ? 'rgba(16,185,129,0.15)' : profileCompleteness >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                color: profileCompleteness >= 80 ? '#059669' : profileCompleteness >= 50 ? '#D97706' : '#DC2626',
              }}>
                {profileCompleteness}%
              </span>
            </div>
            <div className="progress-bar" style={{ height: '8px' }}>
              <div className="progress-fill" style={{ width: `${profileCompleteness}%`, height: '100%' }} />
            </div>
          </div>

          {/* Информация профиля */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--dark-text-muted)', marginBottom: 4 }}>🎓 Образование</div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--dark-text)' }}>{profile?.education || '—'}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--dark-text-muted)', marginBottom: 4 }}>💼 Направление</div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--dark-text)' }}>{profile?.field || '—'}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--dark-text-muted)', marginBottom: 4 }}>⏱️ Опыт</div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--dark-text)' }}>{profile?.experience || '—'}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--dark-text-muted)', marginBottom: 4 }}>📊 Уровень</div>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--dark-text)' }}>{skillLevel}</div>
            </div>
          </div>

          {/* Интересы */}
          {(profile?.interests || []).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)', marginBottom: 6, fontWeight: 600 }}>🎯 Интересы</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile.interests.map((interest, i) => (
                  <span key={i} className="tag tag-primary" style={{ fontSize: '0.75rem' }}>{interest}</span>
                ))}
              </div>
            </div>
          )}

          {/* Цели */}
          {(profile?.career_goals || []).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)', marginBottom: 6, fontWeight: 600 }}>🏆 Цели</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {profile.career_goals.map((goal, i) => (
                  <span key={i} className="tag tag-primary" style={{ fontSize: '0.75rem' }}>{goal}</span>
                ))}
              </div>
            </div>
          )}

          {/* Кнопки */}
          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: 16, fontSize: '0.8rem' }}
            onClick={() => navigate('/diagnostic')}
          >
            ✏️ Пройти диагностику
          </button>
        </div>

        {/* ===== РЕКОМЕНДАЦИИ ===== */}
        {recommendations.length > 0 && (
          <div className="card" style={{ background: 'rgba(227, 6, 17, 0.08)', border: '1px solid rgba(227, 6, 17, 0.2)' }}>
            <h3 style={{ marginBottom: 12 }}>💡 Что делать дальше</h3>
            {recommendations.map((rec, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                borderBottom: i < recommendations.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <span style={{ fontSize: '1.3rem' }}>{rec.icon}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--dark-text)' }}>{rec.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* ===== NEW ACHIEVEMENT POPUP ===== */}
        {newAchievements.length > 0 && (
          <div className="card" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <h3 style={{ marginBottom: 12 }}>🏆 Новые достижения!</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {newAchievements.map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>{a.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--dark-text)' }}>{a.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--dark-text-muted)' }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== ACHIEVEMENTS ===== */}
        {achievements.length > 0 && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>🏅 Достижения</h3>
              <span style={{
                padding: '4px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700,
                background: 'rgba(168, 85, 247, 0.15)', color: '#C084FC',
              }}>
                {achievements.filter(a => a.unlocked).length} / {achievements.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {achievements.map((a, i) => (
                <div key={a.achievement_id} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 20,
                  background: a.unlocked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.04)',
                  border: a.unlocked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                  opacity: a.unlocked ? 1 : 0.4,
                }} title={a.desc}>
                  <span style={{ fontSize: '1.1rem' }}>{a.unlocked ? a.emoji : '🔒'}</span>
                  <span style={{ fontSize: '0.75rem', color: a.unlocked ? 'var(--dark-text)' : 'var(--dark-text-muted)' }}>
                    {a.unlocked ? a.title : '???'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== DAILY CHALLENGE ===== */}
        <div className="card" style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>🎭 Daily Challenge</h3>
            {dailyStreak && dailyStreak.streak > 0 && (
              <span style={{
                padding: '4px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700,
                background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B',
              }}>
                🔥 {dailyStreak.streak} дн.
              </span>
            )}
          </div>

          {dailyChallenge && !dailyChallenge.answered && !dailyResult && (
            <>
              <div style={{
                padding: '12px 16px', borderRadius: 12, marginBottom: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)', marginBottom: 6 }}>
                  {dailyChallenge.role_title || dailyChallenge.role_id}
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--dark-text)', lineHeight: 1.5 }}>
                  {dailyChallenge.situation_text}
                </div>
              </div>

              <textarea
                className="situation-input"
                placeholder="Опиши, как бы ты поступил в этой ситуации..."
                value={dailyAnswer}
                onChange={(e) => setDailyAnswer(e.target.value)}
                rows={3}
                style={{ marginBottom: 12 }}
              />

              <button
                className="btn btn-primary"
                onClick={handleDailyAnswerSubmit}
                disabled={dailySubmitting || !dailyAnswer.trim()}
              >
                {dailySubmitting ? '⏳ Оцениваю...' : '✍️ Отправить ответ'}
              </button>
            </>
          )}

          {dailyChallenge?.answered && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 600, color: 'var(--dark-text)', marginBottom: 4 }}>Сегодняшний челлендж выполнен!</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--dark-text-muted)' }}>Завтра будет новая ситуация</div>
              {dailyResult && (
                <div style={{
                  marginTop: 12, padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
                    {dailyResult.ai_score}/10
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--dark-text-muted)' }}>
                    {dailyResult.ai_feedback}
                  </div>
                </div>
              )}
            </div>
          )}

          {!dailyChallenge && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--dark-text-muted)' }}>
              Загрузка ситуации...
            </div>
          )}
        </div>

        {/* ===== НАВЫКИ ===== */}
        {skills.length > 0 && (
          <div className="card">
            <h3>🛠️ Твои навыки ({skills.length})</h3>
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map(s => (
                <span key={s} className="tag tag-primary">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* ===== СТАТИСТИКА ТЕСТОВ ===== */}
        {scenarioStats.length > 0 && (
          <div className="card">
            <h3>📊 Результаты тестов</h3>

            {/* Сводка */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12, marginBottom: 16 }}>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{avgScore}%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)' }}>Средний</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>{bestScore}%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)' }}>Лучший</div>
              </div>
              <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#D97706' }}>{testsTaken}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)' }}>Тестов</div>
              </div>
            </div>

            {/* Детали по ролям */}
            {scenarioStats.slice(0, 8).map((stat, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < Math.min(scenarioStats.length, 8) - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark-text)' }}>{stat.role_id}</div>
                  {stat.feedback && <div style={{ fontSize: '0.75rem', color: 'var(--dark-text-muted)' }}>{stat.feedback}</div>}
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 16,
                  background: stat.match_score >= 70 ? 'rgba(16,185,129,0.12)' : stat.match_score >= 40 ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                  color: stat.match_score >= 70 ? '#059669' : stat.match_score >= 40 ? '#D97706' : '#DC2626',
                  fontWeight: 700, fontSize: '0.85rem',
                }}>
                  {stat.match_score}%
                </span>
              </div>
            ))}

            <button
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: 12, fontSize: '0.85rem' }}
              onClick={() => navigate('/career')}
            >
              🔄 Пройти ещё тесты
            </button>
          </div>
        )}

        {/* ===== ПОДХОДЯЩИЕ РОЛИ ===== */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>🎯 Подходящие роли</h3>
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              onClick={() => navigate('/career')}
            >
              Все роли →
            </button>
          </div>

          {matchedRoles.length > 0 ? (
            matchedRoles.slice(0, 4).map((role, i) => {
              const tested = scenarioStats.some(s => s.role_id === role.role_id)
              return (
                <div key={role.role_id} className="profession-card" style={{ marginTop: i > 0 ? 10 : 0, opacity: tested ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div className="profession-title">
                      {tested && '✅ '}{role.title}
                    </div>
                    <span className={`vacancy-match ${role.match_percent >= 70 ? 'vacancy-match-high' : role.match_percent >= 50 ? 'vacancy-match-medium' : 'vacancy-match-low'}`}>
                      {role.match_percent}%
                    </span>
                  </div>
                  <div className="profession-reason" style={{ marginBottom: 8 }}>{role.reason}</div>
                  {!tested && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => navigate('/scenario-runner', { state: { roles: [role] } })}
                      >
                        Пройти тест →
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <p style={{ color: 'var(--dark-text-muted)' }}>Выбери роли для тестирования</p>
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => navigate('/career')}>
                Выбрать роли
              </button>
            </div>
          )}
        </div>

        {/* ===== ВАКАНСИИ HH.RU ===== */}
        <div className="card">
          <h3>💼 Вакансии на рынке</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--dark-text-muted)', marginBottom: 10 }}>Поиск по HH.ru</p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              className="chat-input"
              style={{ flex: 1, borderRadius: 10, padding: '8px 12px', fontSize: '0.85rem' }}
              placeholder="Профессия..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchVacancies()}
            />
            <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onClick={searchVacancies}>
              🔍
            </button>
          </div>

          {vacanciesLoading && <div className="loading" style={{ padding: 20 }}><div className="spinner" style={{ width: 24, height: 24 }} /></div>}

          {!vacanciesLoading && vacancies.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vacancies.slice(0, 5).map((v, i) => (
                <a key={v.id || i} href={v.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    padding: 12, borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark-text)' }}>{v.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--dark-text-muted)' }}>{v.company} • {v.salary || 'По договорённости'}</div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {!vacanciesLoading && vacancies.length === 0 && (
            <div style={{ textAlign: 'center', padding: 16, fontSize: '0.85rem', color: 'var(--dark-text-muted)' }}>
              Введи профессию и нажми 🔍
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
