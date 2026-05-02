import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { chatsApi, Chat, Message } from '../api/chats';
import { useAuthStore } from '../store/authStore';

// ── Styles ──
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');`;

const css = `
${FONT_IMPORT}

.chat-root {
  --bg: #0b0b0b;
  --bg-surface: #111111;
  --bg-elevated: #181818;
  --border: #232323;
  --border-mid: #2e2e2e;
  --border-hover: #3d3d3d;
  --text-primary: #f0ede8;
  --text-secondary: #6b6b6b;
  --text-muted: #3a3a3a;
  --accent: #e8e4dc;
  --accent-dim: #c5c0b8;
  --red: #c0392b;
  --red-dim: #1a0f0f;
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  position: relative;
  overflow: hidden;
}

/* ── AMBIENT ── */
.chat-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.08;
  animation: orb-float 24s ease-in-out infinite;
}
.ambient-orb-1 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(232, 228, 220, 0.15) 0%, transparent 70%);
  top: -150px;
  right: -100px;
  animation-delay: 0s;
}
.ambient-orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(197, 192, 184, 0.12) 0%, transparent 70%);
  bottom: -100px;
  left: -80px;
  animation-delay: -10s;
}
@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-25px, -35px) scale(1.06); }
  66% { transform: translate(15px, 25px) scale(0.94); }
}
.chat-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.02;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px;
}
.chat-grid-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.01;
  background-image: 
    linear-gradient(rgba(232, 228, 220, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 228, 220, 0.2) 1px, transparent 1px);
  background-size: 64px 64px;
}

/* ── HEADER ── */
.chat-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: rgba(11, 11, 11, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.header-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
  flex-shrink: 0;
}
.header-back:hover {
  border-color: var(--border-hover);
  background: var(--bg-surface);
  color: var(--text-primary);
}
.header-back svg {
  width: 18px;
  height: 18px;
  stroke-width: 1.5;
}
.header-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--accent);
}
.header-info {
  flex: 1;
  min-width: 0;
}
.header-username {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
  margin-bottom: 1px;
}
.header-status {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* ── MESSAGES AREA ── */
.chat-messages {
  position: relative;
  z-index: 10;
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chat-messages::-webkit-scrollbar {
  width: 3px;
}
.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: var(--border-mid);
  border-radius: 2px;
}

/* ── DATE DIVIDER ── */
.date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
}
.date-divider span {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
  background: var(--bg);
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
}

/* ── MESSAGE BUBBLE ── */
.message-row {
  display: flex;
  animation: messageIn 0.25s ease-out;
}
.message-row.own {
  justify-content: flex-end;
}
.message-row.other {
  justify-content: flex-start;
}
@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.message-bubble {
  max-width: 70%;
  padding: 10px 16px;
  border-radius: 16px;
  position: relative;
}
.message-bubble.own {
  background: var(--text-primary);
  color: var(--bg);
  border-bottom-right-radius: 6px;
}
.message-bubble.other {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-bottom-left-radius: 6px;
}
.message-text {
  font-size: 14px;
  line-height: 1.5;
  letter-spacing: 0.004em;
}
.message-time {
  font-family: 'DM Mono', monospace;
  font-size: 9px;
  letter-spacing: 0.04em;
  margin-top: 4px;
  text-align: right;
}
.message-bubble.own .message-time {
  color: rgba(11, 11, 11, 0.5);
}
.message-bubble.other .message-time {
  color: var(--text-muted);
}

/* ── TYPING INDICATOR ── */
.typing-dots {
  display: flex;
  gap: 3px;
  padding: 4px 0;
}
.typing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: typingBounce 1.4s ease-in-out infinite;
}
.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes typingBounce {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4px); }
}

/* ── EMPTY STATE ── */
.empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
}
.empty-icon {
  font-size: 36px;
  opacity: 0.3;
  margin-bottom: 8px;
}
.empty-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.empty-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ── INPUT AREA ── */
.chat-input-area {
  position: relative;
  z-index: 10;
  padding: 14px 20px;
  background: rgba(11, 11, 11, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.input-form {
  display: flex;
  gap: 8px;
}
.message-input {
  flex: 1;
  padding: 10px 16px;
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}
.message-input:focus {
  border-color: var(--border-hover);
}
.message-input::placeholder {
  color: var(--text-muted);
}
.message-input:disabled {
  opacity: 0.5;
}
.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--text-primary);
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--bg);
  flex-shrink: 0;
}
.send-btn:hover {
  background: var(--accent-dim);
}
.send-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.send-btn:disabled:hover {
  background: var(--text-primary);
}
.send-btn svg {
  width: 18px;
  height: 18px;
  stroke-width: 2;
}

/* ── LOADING ── */
.chat-loading {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.loading-text {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* ── NOT FOUND ── */
.chat-not-found {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 40px 20px;
}
.not-found-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.back-btn {
  height: 38px;
  padding: 0 20px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s;
}
.back-btn:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  background: var(--bg-surface);
}
`;

export default function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;

    const fetchChat = async () => {
      try {
        const [chatData, messagesData] = await Promise.all([
          chatsApi.getChats().then((chats: Chat[]) => chats.find((c: Chat) => c.id === chatId)),
          chatsApi.getMessages(chatId)
        ]);

        if (chatData) {
          setChat(chatData);
          setMessages(messagesData);
        }
      } catch (error) {
        console.error('Failed to fetch chat:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
  }, [chatId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || sending) return;

    setSending(true);
    try {
      const message = await chatsApi.sendMessage(chatId, newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = () => {
    if (!chat || !user) return null;
    return chat.users.find(cu => cu.user.id !== user.id)?.user;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const otherUser = getOtherUser();

  return (
    <div className="chat-root">
      <style>{css}</style>

      {/* Ambient Background */}
      <div className="chat-ambient">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>
      <div className="chat-noise" />
      <div className="chat-grid-bg" />

      {loading ? (
        <div className="chat-loading">
          <span className="loading-text">Загрузка...</span>
        </div>
      ) : !chat ? (
        <div className="chat-not-found">
          <span className="not-found-label">Чат не найден</span>
          <button onClick={() => navigate('/chats')} className="back-btn">
            Вернуться к чатам
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="chat-header">
            <button onClick={() => navigate('/chats')} className="header-back">
              <ArrowLeft size={18} />
            </button>

            {otherUser && (
              <>
                <div className="header-avatar">
                  {otherUser.username[0].toUpperCase()}
                </div>
                <div className="header-info">
                  <div className="header-username">@{otherUser.username}</div>
                  <div className="header-status">В сети</div>
                </div>
              </>
            )}
          </header>

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <div className="empty-icon">—</div>
                <div className="empty-label">Нет сообщений</div>
                <div className="empty-hint">Начните диалог</div>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.senderId === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`message-row ${isOwn ? 'own' : 'other'}`}
                  >
                    <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
                      <p className="message-text">{message.content}</p>
                      <p className="message-time">{formatTime(message.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <form onSubmit={sendMessage} className="input-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Введите сообщение..."
                className="message-input"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="send-btn"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}