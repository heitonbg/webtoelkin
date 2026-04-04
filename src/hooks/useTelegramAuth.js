import { useState, useEffect } from 'react'
import { api, isInsideTelegram, getTelegramId } from '../api/client'

/**
 * Хук для авторизации и инициализации пользователя через Telegram.
 * 
 * Использование:
 * const { profile, loading, error, isAuthenticated } = useTelegramAuth()
 * 
 * При монтировании:
 * 1. Отправляет initData на бэкенд для валидации
 * 2. Сохраняет/обновляет профиль пользователя в БД
 * 3. Возвращает данные профиля
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

      // Проверяем есть ли уже сохраненный telegram_id
      const savedId = localStorage.getItem('telegram_id')
      
      // Если уже есть сохраненный ID — загружаем профиль напрямую
      if (savedId) {
        try {
          const profileData = await api.getProfile()
          if (profileData.exists) {
            setProfile({
              telegram_id: savedId,
              username: profileData.telegram?.telegram_username,
              first_name: profileData.telegram?.telegram_first_name,
              last_name: profileData.telegram?.telegram_last_name,
              photo_url: profileData.telegram?.telegram_photo_url,
              language_code: profileData.telegram?.telegram_language_code,
              is_premium: false,
              is_new_user: false,
            })
            setIsAuthenticated(true)
            console.log('✅ Loaded saved profile:', savedId)
            setLoading(false)
            return
          }
        } catch (err) {
          console.warn('Saved profile not found, will create new one')
        }
      }

      // Пробуем авторизацию через Telegram
      let authResult
      try {
        authResult = await api.telegramAuth(true)
      } catch (strictErr) {
        // Если строгая не прошла — пробуем без строгой (для разработки)
        console.warn('Strict Telegram auth failed, trying non-strict:', strictErr.message)
        authResult = await api.telegramAuth(false)
      }

      setProfile(authResult)
      setIsAuthenticated(true)

      // Сохраняем telegram_id в localStorage для fallback
      if (authResult?.telegram_id) {
        localStorage.setItem('telegram_id', authResult.telegram_id)
      }

      console.log('✅ Telegram auth successful:', {
        id: authResult?.telegram_id,
        username: authResult?.username,
        isNew: authResult?.is_new_user,
      })

      return authResult
    } catch (err) {
      console.error('❌ Telegram auth error:', err)
      setError(err.message)

      // Fallback — используем demo_user или telegram_id из localStorage
      const fallbackId = localStorage.getItem('telegram_id') || getTelegramId()
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

/**
 * Хук для получения расширенного профиля пользователя из БД.
 * Включает данные онбординга, интересы, навыки и т.д.
 */
export function useUserProfile(telegramId) {
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!telegramId) return
    loadUserProfile()
  }, [telegramId])

  async function loadUserProfile() {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getProfile()
      setUserProfile(data)
    } catch (err) {
      console.error('Failed to load user profile:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { userProfile, loading, error, refresh: loadUserProfile }
}

/**
 * Хук для синхронизации данных Telegram (username, photo) при каждом входе.
 */
export function useTelegramSync(telegramId) {
  const [syncing, setSyncing] = useState(false)

  async function sync() {
    if (!telegramId || !isInsideTelegram()) return
    
    try {
      setSyncing(true)
      const result = await api.syncTelegramProfile()
      console.log('✅ Telegram profile synced:', result)
      return result
    } catch (err) {
      console.error('❌ Sync failed:', err)
      // Не блокируем приложение при ошибке синхронизации
    } finally {
      setSyncing(false)
    }
  }

  // Автосинхронизация при монтировании
  useEffect(() => {
    if (telegramId && isInsideTelegram()) {
      sync()
    }
  }, [telegramId])

  return { syncing, sync }
}
