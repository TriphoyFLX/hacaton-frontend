import { useState, useRef } from 'react';
import { Heart, MessageCircle, Share, X, Send } from 'lucide-react';
import { SoundTok, soundTokApi, Comment } from '../api/soundtok';

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');`;

// TikTok стиль VideoFeed - без скролла, чистое переключение видео
const css = `
${FONT_IMPORT}

.vf-root {
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
  background: #000;
}

.vf-video-container {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease-out;
}

.vf-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vf-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  color: white;
}

.vf-actions {
  position: absolute;
  right: 20px;
  bottom: 100px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.vf-action-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.vf-action-btn:hover {
  background: rgba(255,255,255,0.2);
  transform: scale(1.1);
}

.vf-action-btn.liked {
  background: #ff4444;
}

.vf-progress-indicator {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vf-progress-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.2s;
}

.vf-progress-dot.active {
  background: white;
  transform: scale(1.2);
}

.vf-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}
.vf-modal {
  background: #111111;
  border: 1px solid #232323;
  border-radius: 12px;
  width: 100%;
  max-width: 420px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.vf-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #1a1a1a;
}
.vf-modal-title {
  font-family: 'Syne', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #f0ede8;
  letter-spacing: -0.01em;
}
.vf-modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #1a1a1a;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  color: #c5c0b8;
}
.vf-modal-close:hover {
  border-color: #2e2e2e;
  background: #141414;
  color: #f0ede8;
}
.vf-modal-close svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.5;
}
.vf-comments-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}
.vf-comments-list::-webkit-scrollbar {
  width: 4px;
}
.vf-comments-list::-webkit-scrollbar-track {
  background: transparent;
}
.vf-comments-list::-webkit-scrollbar-thumb {
  background: #232323;
  border-radius: 2px;
}
.vf-comment-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #1a1a1a;
}
.vf-comment-item:last-child {
  border-bottom: none;
}
.vf-comment-avatar {
  width: 32px;
  height: 32px;
  background: #181818;
  border: 1px solid #232323;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #f0ede8;
  flex-shrink: 0;
}
.vf-comment-content {
  flex: 1;
  min-width: 0;
}
.vf-comment-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.vf-comment-username {
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #f0ede8;
}
.vf-comment-time {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: #5a5a5a;
  letter-spacing: 0.04em;
}
.vf-comment-text {
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  color: #c5c0b8;
  line-height: 1.5;
}
.vf-comment-input-wrapper {
  padding: 16px 20px;
  border-top: 1px solid #1a1a1a;
}
.vf-comment-input {
  width: 100%;
  box-sizing: border-box;
  background: #181818;
  border: 1px solid #232323;
  border-radius: 8px;
  color: #f0ede8;
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  padding: 12px 16px;
  resize: none;
  outline: none;
  transition: border-color 0.15s;
}
.vf-comment-input:focus {
  border-color: #2e2e2e;
}
.vf-comment-input::placeholder {
  color: #5a5a5a;
}
.vf-comment-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
.vf-btn {
  height: 34px;
  padding: 0 16px;
  border-radius: 8px;
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
}
.vf-btn-ghost {
  background: transparent;
  border: 1px solid #1a1a1a;
  color: #c5c0b8;
}
.vf-btn-ghost:hover {
  border-color: #2e2e2e;
  color: #f0ede8;
}
.vf-btn-primary {
  background: #f0ede8;
  border: 1px solid #f0ede8;
  color: #0a0a0a;
  font-weight: 500;
}
.vf-btn-primary:hover {
  background: #c5c0b8;
  border-color: #c5c0b8;
}
.vf-btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.vf-empty-comments {
  text-align: center;
  padding: 40px 20px;
}
.vf-empty-text {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  color: #5a5a5a;
  letter-spacing: 0.04em;
}
.vf-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
.vf-loading-text {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  color: #c5c0b8;
  letter-spacing: 0.04em;
}

/* Кастомный скроллбар для VideoFeed */
.vf-feed-container::-webkit-scrollbar {
  width: 6px;
}
.vf-feed-container::-webkit-scrollbar-track {
  background: transparent;
}
.vf-feed-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  transition: background 0.2s;
}
.vf-feed-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
.vf-feed-container::-webkit-scrollbar-corner {
  background: transparent;
}

/* Настройка snap-center для TikTok поведения */
.vf-feed-container {
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
}

.snap-center {
  scroll-snap-align: center;
  scroll-snap-stop: always;
}

/* Индикатор прогресса */
.vf-progress-indicator {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.vf-progress-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.2s;
}
.vf-progress-dot.active {
  background: white;
  transform: scale(1.2);
}
`;

interface VideoFeedProps {
  soundToks: SoundTok[];
  onLike: (id: string) => void;
}

export default function VideoFeed({ soundToks, onLike }: VideoFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [currentSoundTokId, setCurrentSoundTokId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  const touchStartY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const lastWheelTime = useRef<number>(0);

  // Обработчики свайпов
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchStartY.current - touchEndY;
    const timeDiff = Date.now() - touchStartTime.current;
    
    // Условия для свайпа: расстояние > 50px, время < 500ms
    if (Math.abs(diffY) > 50 && timeDiff < 500) {
      if (diffY > 0) {
        // Свайп вверх - следующее видео
        nextVideo();
      } else {
        // Свайп вниз - предыдущее видео
        prevVideo();
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    const now = Date.now();
    if (now - lastWheelTime.current < 300) return;
    lastWheelTime.current = now;
    
    if (e.deltaY > 0) {
      nextVideo();
    } else {
      prevVideo();
    }
  };

  const nextVideo = () => {
    if (currentIndex < soundToks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevVideo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const scrollToVideo = (index: number) => {
    setCurrentIndex(index);
  };

  const handleLike = async (id: string) => {
    onLike(id);
  };

  const handleComments = async (id: string) => {
    setCurrentSoundTokId(id);
    setCommentsModalOpen(true);
    
    try {
      const commentsData = await soundTokApi.getComments(id);
      setComments(commentsData);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSoundTokId || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const currentSoundTok = soundToks[currentIndex];

      if (!currentSoundTok) {
        return (
          <div className="vf-root">
            <style>{css}</style>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'white' }}>
              Нет видео
            </div>
          </div>
        );
      }

      const comment = await soundTokApi.createComment(currentSoundTokId, newComment);
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="vf-root">
      <style>{css}</style>
      
      {/* Контейнер видео с TikTok поведением */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {soundToks.map((soundTok, index) => (
          <div
            key={soundTok.id}
            className="vf-video-container"
            style={{
              transform: `translateY(${(index - currentIndex) * 100}vh)`,
              opacity: index === currentIndex ? 1 : 0
            }}
          >
            <video
              src={`http://localhost:5002${soundTok.videoUrl}`}
              className="vf-video"
              autoPlay={index === currentIndex}
              muted={index !== currentIndex}
              loop
              playsInline
            />
            
            {/* Оверлей с информацией */}
            {index === currentIndex && (
              <div className="vf-overlay">
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                  {soundTok.description || 'Без описания'}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>
                  @{soundTok.author?.username || 'user'}
                </div>
              </div>
            )}
            
            {/* Кнопки действий */}
            {index === currentIndex && (
              <div className="vf-actions">
                <button 
                  className={`vf-action-btn ${soundTok.isLiked ? 'liked' : ''}`}
                  onClick={() => handleLike(soundTok.id)}
                >
                  <Heart size={24} fill={soundTok.isLiked ? 'white' : 'none'} />
                </button>
                
                <button 
                  className="vf-action-btn"
                  onClick={() => handleComments(soundTok.id)}
                >
                  <MessageCircle size={24} />
                </button>
                
                <button className="vf-action-btn">
                  <Share size={24} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Индикатор прогресса */}
      <div className="vf-progress-indicator">
        {soundToks.map((_, index) => (
          <div
            key={index}
            className={`vf-progress-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => scrollToVideo(index)}
          />
        ))}
      </div>

      {/* Модальное окно комментариев */}
      {commentsModalOpen && (
        <div className="vf-modal-overlay" onClick={() => setCommentsModalOpen(false)}>
          <div className="vf-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="vf-modal-header">
              <h3>Комментарии</h3>
              <button onClick={() => setCommentsModalOpen(false)}>
                <X size={20} color="white" />
              </button>
            </div>
            
            <div>
              {comments.map(comment => (
                <div key={comment.id} className="vf-comment">
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    @{comment.author?.username || 'user'}
                  </div>
                  <div>{comment.text}</div>
                </div>
              ))}
            </div>
            
            <form onSubmit={handleSubmitComment} className="vf-comment-input">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Добавить комментарий..."
              />
              <button type="submit" disabled={submittingComment}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
