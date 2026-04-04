import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function loadHistory() {
    try {
      const result = await api.getChatHistory(20)
      const historyMessages = []
      
      result.messages?.forEach(msg => {
        historyMessages.push({ role: 'user', content: msg.user_message })
        historyMessages.push({ role: 'ai', content: msg.ai_response })
      })
      
      if (historyMessages.length === 0) {
        historyMessages.push({
          role: 'ai',
          content: 'Привет! 👋 Я твой AI-карьерный наставник. Задай мне любой вопрос о профессии, навыках или развитии карьеры!'
        })
      }
      
      setMessages(historyMessages)
    } catch (err) {
      console.error('Chat history error:', err)
      setMessages([{
        role: 'ai',
        content: 'Привет! 👋 Я твой AI-карьерный наставник. Задай мне любой вопрос!'
      }])
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const result = await api.sendMessage(userMessage)
      setMessages(prev => [...prev, { role: 'ai', content: result.response }])
    } catch (err) {
      console.error('Chat send error:', err)
      setMessages(prev => [...prev, {
        role: 'ai',
        content: 'Извини, возникла ошибка. Попробуй ещё раз!'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>💬 AI Наставник</h1>
        <p>Спроси о карьере и развитии</p>
      </div>

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-message ${msg.role}`}>
              <div className="chat-bubble">
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-message ai">
              <div className="chat-bubble">
                <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-container" onSubmit={handleSend}>
          <input
            type="text"
            className="chat-input"
            placeholder="Задай вопрос..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="chat-send-btn" disabled={loading || !input.trim()}>
            ➤
          </button>
        </form>
      </div>
    </div>
  )
}
