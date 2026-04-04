import { useState, useEffect } from 'react'
import { api, isInsideTelegram } from '../api/client'

/**
 * Компонент профиля Telegram.
 * Отображает аватар, username, first_name, last_name пользователя из Telegram.
 * При первом запуске авторизует пользователя через initData.
 */
export default function TelegramProfile({ telegramId, onProfileLoaded }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)

  const insideTelegram = isInsideTelegram()

  useEffect(() => {
    loadProfile()
  }, [telegramId])

  async function loadProfile() {
    try {
      setLoading(true)
      setError(null)

      // Сначала пытаемся авторизоваться через Telegram (это также сохранит профиль)
      const authResult = await api.telegramAuth(true)
      setProfile(authResult)

      // Если есть callback — уведомляем родителя
      if (onProfileLoaded) {
        onProfileLoaded(authResult)
      }

      // Если это новый пользователь — можно показать онбординг
      if (authResult.is_new_user) {
        console.log('🆕 New user detected, redirect to onboarding')
      }
    } catch (err) {
      console.error('Telegram auth failed:', err)
      setError(err.message)
      
      // Fallback — пробуем загрузить профиль напрямую
      try {
        const profileData = await api.getTelegramProfile()
        setProfile(profileData)
        if (onProfileLoaded) {
          onProfileLoaded(profileData)
        }
      } catch (fallbackErr) {
        console.error('Fallback profile load failed:', fallbackErr)
        setError(fallbackErr.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    try {
      setSyncing(true)
      await api.syncTelegramProfile()
      // Перезагружаем профиль после синхронизации
      await loadProfile()
    } catch (err) {
      console.error('Sync failed:', err)
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="tg-profile-loading">
        <div className="tg-profile-spinner" />
        <p>Загрузка профиля...</p>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="tg-profile-error">
        <p>⚠️ Не удалось загрузить профиль</p>
        <p className="error-details">{error}</p>
        <button onClick={loadProfile} className="retry-btn">
          🔄 Повторить
        </button>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const displayName = profile.first_name 
    || profile.username 
    || `User ${profile.telegram_id}`

  const avatarUrl = profile.photo_url 
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=E30611&color=fff&size=128`

  return (
    <div className="tg-profile">
      <div className="tg-profile-header">
        <div className="tg-avatar-wrapper">
          <img 
            src={avatarUrl} 
            alt={displayName}
            className="tg-avatar"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=U&background=E30611&color=fff&size=128`
            }}
          />
          {profile.is_premium && (
            <span className="tg-premium-badge" title="Premium">⭐</span>
          )}
        </div>
        
        <div className="tg-user-info">
          <h3 className="tg-display-name">{displayName}</h3>
          
          {profile.username && (
            <p className="tg-username">@{profile.username}</p>
          )}
          
          {profile.last_name && profile.first_name && (
            <p className="tg-full-name">
              {profile.first_name} {profile.last_name}
            </p>
          )}
          
          <div className="tg-meta">
            <span className="tg-id">ID: {profile.telegram_id}</span>
            {profile.language_code && (
              <span className="tg-lang">🌐 {profile.language_code.toUpperCase()}</span>
            )}
          </div>
        </div>
      </div>

      {insideTelegram && (
        <button 
          onClick={handleSync} 
          disabled={syncing}
          className="tg-sync-btn"
          title="Синхронизировать актуальные данные из Telegram"
        >
          {syncing ? '⏳ Синхронизация...' : '🔄 Обновить данные'}
        </button>
      )}

      {!insideTelegram && (
        <p className="tg-not-inside-telegram">
          💡 Запустите приложение из Telegram для полной функциональности
        </p>
      )}
    </div>
  )
}
