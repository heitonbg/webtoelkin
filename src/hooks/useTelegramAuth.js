import { useState, useEffect } from 'react'
import { api, getTelegramId, isInsideTelegram } from '../api/client'

/**
 * Хук для авторизации через Telegram.
 * Всегда обращается к бэкенду — НЕ использует localStorage.
 */
export function useTelegramAuth() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    authenticate()
  }, [])

  async function authenticate() {
    try {
      setLoading(true)
      setError(null)

      // Всегда обращаемся к бэкенду
      let authResult
      try {
        authResult = await api.telegramAuth(true)
      } catch (strictErr) {
        console.warn('Strict auth failed, trying non-strict:', strictErr.message)
        authResult = await api.telegramAuth(false)
      }

      setProfile(authResult)
      setIsAuthenticated(true)

      // Сохраняем ID только для fallback при ошибке сети
      if (authResult?.telegram_id) {
        sessionStorage.setItem('telegram_id', authResult.telegram_id)
      }

      console.log('✅ Auth successful:', authResult.telegram_id)
      return authResult
    } catch (err) {
      console.error('❌ Auth error:', err)
      setError(err.message)

      // Fallback только при полной потере связи
      const fallbackId = sessionStorage.getItem('telegram_id') || getTelegramId()
      setProfile({
        telegram_id: fallbackId,
        username: null,
        first_name: 'User',
        last_name: null,
        photo_url: null,
        language_code: null,
        is_premium: false,
        is_new_user: false,
      })
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  return { profile, loading, error, isAuthenticated, retry: authenticate }
}
