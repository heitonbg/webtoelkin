import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'

export default function RoleSelection() {
  const navigate = useNavigate()

  const [roles, setRoles] = useState([])
  const [selectedRoles, setSelectedRoles] = useState({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredRoles, setFilteredRoles] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      api.searchRoles(searchQuery).then(res => {
        setFilteredRoles(res.roles || [])
      })
    } else {
      setFilteredRoles([])
    }
  }, [searchQuery])

  async function loadData() {
    setLoading(true)
    try {
      const profileData = await api.getProfile()
      if (!profileData.exists) {
        navigate('/onboarding')
        return
      }

      // Мгновенный rule-based матчинг (< 50ms)
      const result = await api.matchRoles()
      const matchedRoles = result.roles || []

      if (matchedRoles.length === 0) {
        // Fallback — все роли
        const allResult = await api.getAllRoles()
        setRoles((allResult.roles || []).slice(0, 20))
      } else {
        setRoles(matchedRoles)
      }

      // Авто-выбор топ-3
      const init = {}
      matchedRoles.slice(0, 3).forEach(r => init[r.role_id] = true)
      setSelectedRoles(init)

      setLoading(false)
    } catch (err) {
      console.error('RoleSelection error:', err)
      setLoading(false)
    }
  }

  const toggleRole = (roleId) => {
    setSelectedRoles(prev => ({ ...prev, [roleId]: !prev[roleId] }))
  }

  const handleContinue = () => {
    const selected = Object.entries(selectedRoles)
      .filter(([, v]) => v)
      .map(([roleId]) => roles.find(r => r.role_id === roleId))
      .filter(Boolean)

    if (selected.length === 0) {
      navigate('/dashboard')
      return
    }

    navigate('/scenario-runner', { state: { roles: selected } })
  }

  if (loading) {
    return (
      <div className="onboarding-container">
        <div className="loading">
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
        </div>
      </div>
    )
  }

  const selectedCount = Object.values(selectedRoles).filter(Boolean).length
  const displayRoles = filteredRoles.length > 0 ? filteredRoles : roles

  return (
    <div className="onboarding-container">
      <div className="onboarding-step">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎯</div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: 4, color: 'var(--dark-text)' }}>
            {roles.length} ролей подходят тебе
          </h2>
          <p style={{ color: 'var(--dark-text-muted)', fontSize: '0.85rem' }}>
            Выбери те, что интересуют — по каждой будет тест
          </p>
        </div>

        {/* Поиск */}
        <input
          type="text"
          className="onboarding-input"
          style={{ width: '100%', borderRadius: 12, marginBottom: 12 }}
          placeholder="🔍 Поиск профессии (например: дизайнер, уборщик, python...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Быстрый выбор */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => {
            const init = {}
            displayRoles.slice(0, 3).forEach(r => init[r.role_id] = true)
            setSelectedRoles(init)
          }} style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            background: 'rgba(227,6,17,0.15)', border: '1px solid rgba(227,6,17,0.3)',
            color: 'var(--primary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600,
          }}>✨ Топ-3</button>
          <button onClick={() => {
            const all = {}
            displayRoles.forEach(r => all[r.role_id] = true)
            setSelectedRoles(all)
          }} style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'var(--dark-text)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600,
          }}>Все</button>
        </div>

        {/* Список ролей */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16, maxHeight: '50vh', overflowY: 'auto', paddingRight: 4 }}>
          {displayRoles.map((role) => {
            const isSelected = selectedRoles[role.role_id]
            return (
              <button key={role.role_id} onClick={() => toggleRole(role.role_id)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 14px', borderRadius: 12,
                border: isSelected ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.12)',
                background: isSelected ? 'rgba(227,6,17,0.15)' : 'rgba(255,255,255,0.06)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--dark-text)' }}>{role.title}</div>
                  {role.category && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--dark-text-muted)', marginTop: 2 }}>{role.category}</div>
                  )}
                  {role.match_percent !== undefined && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 2, fontWeight: 600 }}>
                      Совпадение: {role.match_percent}%
                    </div>
                  )}
                </div>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  border: `2px solid ${isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isSelected ? 'var(--primary)' : 'transparent',
                  color: isSelected ? 'white' : 'transparent',
                  fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                }}>{isSelected && '✓'}</span>
              </button>
            )
          })}
        </div>

        {/* Кнопка */}
        <button
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={selectedCount === 0}
          style={{
            width: '100%',
            background: selectedCount > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
            color: selectedCount > 0 ? 'white' : 'var(--dark-text-muted)',
          }}
        >
          🚀 Пройти тест ({selectedCount} {selectedCount === 1 ? 'роль' : selectedCount < 5 ? 'роли' : 'ролей'})
        </button>

        {/* Пропустить */}
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--dark-text-muted)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              padding: '8px 16px',
            }}
          >
            Пропустить →
          </button>
        </div>
      </div>
    </div>
  )
}
