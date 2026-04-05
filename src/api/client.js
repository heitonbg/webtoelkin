const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Получаем telegram_id из Telegram WebApp или sessionStorage
function getTelegramId() {
  // Сначала проверяем Telegram WebApp
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
    const userId = window.Telegram.WebApp.initDataUnsafe.user?.id;
    if (userId) return String(userId);
  }
  
  // Fallback из sessionStorage (текущая сессия)
  const savedId = sessionStorage.getItem('telegram_id');
  if (savedId) return savedId;
  
  return 'demo_user';
}

// Получаем полный initData от Telegram (для валидации на бэкенде)
function getTelegramInitData() {
  if (window.Telegram && window.Telegram.WebApp) {
    return window.Telegram.WebApp.initData || null;
  }
  return null;
}

// Проверяем, запущены ли мы внутри Telegram
function isInsideTelegram() {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
    return !!window.Telegram.WebApp.initDataUnsafe.user;
  }
  return false;
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export const api = {
  // === Telegram Auth ===
  
  /**
   * Авторизация через Telegram WebApp.
   * Отправляет initData на бэкенд для валидации и сохраняет профиль.
   */
  async telegramAuth(strict = true) {
    const initData = getTelegramInitData();
    if (!initData) {
      // Не в Telegram — возвращаем заглушку
      return {
        telegram_id: getTelegramId(),
        username: null,
        first_name: 'Demo User',
        last_name: null,
        photo_url: null,
        language_code: 'en',
        is_premium: false,
        is_new_user: false,
      };
    }
    
    return request('/telegram/auth', {
      method: 'POST',
      body: JSON.stringify({
        init_data: initData,
        strict_validation: strict,
      }),
    });
  },

  /**
   * Получить профиль пользователя из Telegram API
   */
  async getTelegramProfile() {
    return request(`/telegram/profile/${getTelegramId()}`);
  },

  /**
   * Синхронизировать актуальные данные из Telegram (username, photo)
   */
  async syncTelegramProfile() {
    const initData = getTelegramInitData();
    if (!initData) {
      return { status: 'ok', telegram_id: getTelegramId(), updated: false };
    }

    return request('/telegram/sync-profile', {
      method: 'POST',
      body: JSON.stringify({
        init_data: initData,
        strict_validation: true,
      }),
    });
  },

  /**
   * Получить аватар пользователя (base64 data URI).
   * Скачивает фото из Telegram через Bot API.
   */
  async getTelegramAvatar() {
    return request(`/telegram/avatar/${getTelegramId()}`);
  },

  // User
  async saveOnboarding(data) {
    return request('/user/onboarding', {
      method: 'POST',
      body: JSON.stringify({ ...data, telegram_id: getTelegramId() }),
    });
  },

  async getProfile() {
    return request(`/user/profile/${getTelegramId()}`);
  },

  async getStats() {
    return request(`/user/stats/${getTelegramId()}`);
  },

  // Career
  async analyzeCareer() {
    return request('/career/analyze', {
      method: 'POST',
      body: JSON.stringify({ telegram_id: getTelegramId() }),
    });
  },

  async getAnalysisResult() {
    return request(`/career/result/${getTelegramId()}`);
  },

  // Vacancies
  async searchVacancies(profession = '', location = '', limit = 20) {
    const params = new URLSearchParams({
      profession: profession,
      location: location,
      limit: String(limit),
    });
    return request(`/vacancies/search?${params}`);
  },

  async matchVacancies(profession = '', location = '') {
    return request('/vacancies/match', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: getTelegramId(),
        profession,
        location,
      }),
    });
  },

  // Quick Match (быстрый AI матчинг)
  async quickMatch() {
    return request('/career/quick-match', {
      method: 'POST',
      body: JSON.stringify({ telegram_id: getTelegramId() }),
    });
  },

  // AI Generate Roles (новая система)
  async generateRoles() {
    return request('/career/generate-roles', {
      method: 'POST',
      body: JSON.stringify({ telegram_id: getTelegramId() }),
    });
  },

  // AI Generate Scenario (новая система)
  async generateScenario(roleId, roleData = {}) {
    return request('/career/generate-scenario', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: getTelegramId(),
        role_id: roleId,
        role_data: roleData,
      }),
    });
  },

  // Skill Recommendations
  async getSkillRecommendations() {
    return request(`/career/recommendations/${getTelegramId()}`);
  },

  // Scenarios
  async getScenarios() {
    return request('/scenarios/scenarios');
  },

  async getScenarioByRole(roleId) {
    return request(`/scenarios/scenarios/${roleId}`);
  },

  async getHhScenarios() {
    return request('/scenarios/scenarios/hh');
  },

  async getAllRoles() {
    return request('/scenarios/all-roles');
  },

  async analyzeScenarioAnswers(roleId, answers) {
    return request('/scenarios/scenarios/analyze', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: getTelegramId(),
        role_id: roleId,
        answers,
      }),
    });
  },

  // Leaderboard
  async getLeaderboard(limit = 20) {
    return request(`/scenarios/leaderboard?limit=${limit}`);
  },

  async getMyScenarioStats() {
    return request(`/scenarios/my-scenarios/${getTelegramId()}`);
  },

  // Retest
  async getRetestStatus() {
    return request(`/scenarios/retest-status/${getTelegramId()}`);
  },

  async startRetest() {
    return request(`/scenarios/retest-start/${getTelegramId()}`, { method: 'POST' });
  },

  async completeRetest() {
    return request(`/scenarios/retest-complete/${getTelegramId()}`, { method: 'POST' });
  },

  // Save answers without analysis (for progressive loading)
  async saveScenarioAnswers(roleId, answers) {
    return request('/scenarios/scenarios/save-answers', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: getTelegramId(),
        role_id: roleId,
        answers,
      }),
    });
  },

  async analyzePendingAnswers() {
    return request(`/scenarios/scenarios/analyze-pending/${getTelegramId()}`, { method: 'POST' });
  },

  async getPendingCount() {
    return request(`/scenarios/scenarios/pending-count/${getTelegramId()}`);
  },

  // === Новые быстрые API (без AI) ===

  // Rule-based матчинг ролей — мгновенно
  async matchRoles() {
    return request('/roles/match', {
      method: 'POST',
      body: JSON.stringify({ telegram_id: getTelegramId() }),
    });
  },

  // Все роли
  async getAllRoles() {
    return request('/roles/all');
  },

  // Поиск ролей
  async searchRoles(query) {
    return request(`/roles/search?q=${encodeURIComponent(query)}`);
  },

  // Получить сценарий
  async getScenario(roleId, level = 'junior') {
    return request(`/roles/scenario/${roleId}?level=${level}`);
  },

  // Скоринг сценария (мгновенно, rule-based + фоновый AI)
  async scoreScenario(roleId, level, answers) {
    return request('/roles/score', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: getTelegramId(),
        role_id: roleId,
        level,
        answers,
      }),
    });
  },

  // Получить AI-анализ (если готов)
  async getAiAnalysis(roleId = null) {
    const url = roleId
      ? `/roles/ai-analysis/${getTelegramId()}?role_id=${roleId}`
      : `/roles/ai-analysis/${getTelegramId()}`;
    return request(url);
  },

  // Chat
  async sendMessage(message, context = null) {
    return request('/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: getTelegramId(),
        message,
        context,
      }),
    });
  },

  async getChatHistory(limit = 20) {
    return request(`/chat/history/${getTelegramId()}?limit=${limit}`);
  },

  // === Диагностика (онбординг) ===

  async getDiagnosticQuestions() {
    return request('/onboarding/questions');
  },

  async runDiagnostic(answers) {
    return request('/onboarding/diagnostic', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: getTelegramId(),
        answers,
      }),
    });
  },

  /**
   * Получить результаты диагностики из БД (не localStorage).
   * Работает даже после перезапуска Mini App.
   */
  async getDiagnosticResult() {
    return request(`/onboarding/diagnostic-result/${getTelegramId()}`);
  },

  async saveProfile(profileData) {
    return request('/onboarding/save-profile', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: getTelegramId(),
        ...profileData,
      }),
    });
  },

  // === Daily Challenge ===

  async getDailyChallenge(roleId = null) {
    const url = roleId
      ? `/daily/challenge?telegram_id=${getTelegramId()}&role_id=${roleId}`
      : `/daily/challenge?telegram_id=${getTelegramId()}`;
    return request(url);
  },

  async submitDailyAnswer(answer) {
    return request('/daily/answer', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: getTelegramId(),
        answer,
      }),
    });
  },

  async getDailyStreak() {
    return request(`/daily/streak?telegram_id=${getTelegramId()}`);
  },

  // === Achievements ===

  async getAchievements() {
    return request(`/achievements/list?telegram_id=${getTelegramId()}`);
  },
};

export { getTelegramId, getTelegramInitData, isInsideTelegram };
