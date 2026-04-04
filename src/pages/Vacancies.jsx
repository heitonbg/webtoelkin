import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Vacancies() {
  const [vacancies, setVacancies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [city, setCity] = useState('')

  useEffect(() => {
    searchVacancies('стажер', '')
  }, [])

  async function searchVacancies(query = '', loc = '') {
    setLoading(true)
    setError(null)
    try {
      const result = await api.searchVacancies(query || searchQuery, loc || city)
      if (result.error) {
        setError(result.error)
        setVacancies([])
      } else {
        setVacancies(result.vacancies || [])
        if ((result.vacancies || []).length === 0) {
          setError('Ничего не найдено. Попробуй другой запрос или город.')
        }
      }
    } catch (err) {
      setError('Не удалось выполнить поиск.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    await searchVacancies(searchQuery, city)
  }

  return (
    <div>
      <div className="page-header">
        <h1>💼 Поиск вакансий</h1>
        <p>Реальные вакансии с HH.ru</p>
      </div>

      <div style={{ padding: 16 }}>
        {/* Город */}
        <input
          type="text"
          className="chat-input"
          style={{ width: '100%', borderRadius: 12, marginBottom: 8 }}
          placeholder="Город (например: Москва, Казань, Новосибирск...)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        {/* Поиск */}
        <form onSubmit={handleSearch} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="chat-input"
              style={{ flex: 1, borderRadius: 12 }}
              placeholder="Профессия, ключевые слова..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="chat-send-btn" disabled={loading}>
              🔍
            </button>
          </div>
        </form>

        {/* Загрузка */}
        {loading && (
          <div className="loading">
            <div className="spinner" />
          </div>
        )}

        {/* Ошибка */}
        {!loading && error && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📡</div>
            <h3>{error.includes('Ничего') ? 'Ничего не найдено' : 'Ошибка'}</h3>
            <p style={{ color: 'var(--dark-text-muted)', marginBottom: 16 }}>{error}</p>
            <button className="btn btn-primary" onClick={() => searchVacancies(searchQuery, city)}>
              🔄 Попробовать снова
            </button>
          </div>
        )}

        {/* Вакансии */}
        {!loading && !error && vacancies.length > 0 && (
          <>
            <div style={{ fontSize: '0.85rem', color: 'var(--dark-text-muted)', marginBottom: 12 }}>
              Найдено: {vacancies.length} вакансий{city ? ` • ${city}` : ' • Вся Россия'}
            </div>
            {vacancies.map((item, i) => {
              const vacancy = item.vacancy || item
              const matchScore = item.match_score

              return (
                <a
                  key={vacancy.id || i}
                  href={vacancy.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="vacancy-card">
                    {matchScore !== undefined && (
                      <div style={{
                        background: matchScore > 70 ? '#d4edda' : matchScore > 40 ? '#fff3cd' : '#f8d7da',
                        padding: '4px 8px',
                        borderRadius: 8,
                        display: 'inline-block',
                        marginBottom: 8,
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}>
                        Совпадение: {matchScore}%
                      </div>
                    )}
                    <div className="vacancy-title">{vacancy.title}</div>
                    <div className="vacancy-company">{vacancy.company}</div>
                    {vacancy.salary && vacancy.salary !== 'По договорённости' && (
                      <div className="vacancy-salary">{vacancy.salary}</div>
                    )}
                    {vacancy.location && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--dark-text-muted)' }}>📍 {vacancy.location}</div>
                    )}
                    {vacancy.description_snippet && (
                      <div style={{ marginTop: 8, fontSize: '0.85rem', color: 'var(--dark-text-muted)' }}>
                        {vacancy.description_snippet.substring(0, 200)}...
                      </div>
                    )}
                    {item.missing_skills && item.missing_skills.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--dark-text-muted)', marginBottom: 4 }}>Не хватает:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {item.missing_skills.slice(0, 5).map((skill, j) => (
                            <span key={j} style={{
                              background: 'var(--mts-red-bg)',
                              color: 'var(--primary)',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: '0.8rem',
                              fontWeight: 500,
                            }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop: 12, fontSize: '0.85rem', color: 'var(--primary)' }}>
                      Открыть на HH.ru →
                    </div>
                  </div>
                </a>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
