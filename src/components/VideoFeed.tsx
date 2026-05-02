import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share, X, Send } from 'lucide-react';
import { SoundTok, soundTokApi, Comment } from '../api/soundtok';

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');`;

const css = `
${FONT_IMPORT}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [currentSoundTokId, setCurrentSoundTokId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const newIndex = Math.round(scrollTop / clientHeight);
    setCurrentIndex(newIndex);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleLike = (id: string) => {
    onLike(id);
  };

  const handleShare = async (soundTokId: string) => {
    const url = `${window.location.origin}/soundtok/${soundTokId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Ссылка скопирована!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const openComments = async (soundTokId: string) => {
    setCurrentSoundTokId(soundTokId);
    setCommentsModalOpen(true);
    setLoadingComments(true);
    try {
      const data = await soundTokApi.getComments(soundTokId);
      setComments(data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSoundTokId || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const comment = await soundTokApi.createComment(currentSoundTokId, newComment);
      setComments(prev => [...prev, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const scrollToVideo = (index: number) => {
    if (containerRef.current) {
      const videoHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTo({
        top: index * videoHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleSwipe = (direction: 'up' | 'down') => {
    const newIndex = direction === 'up' 
      ? Math.min(currentIndex + 1, soundToks.length - 1)
      : Math.max(currentIndex - 1, 0);
    
    if (newIndex !== currentIndex) {
      scrollToVideo(newIndex);
    }
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startY = touch.clientY;
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      const touch = moveEvent.touches[0];
      const currentY = touch.clientY;
      const diff = startY - currentY;
      
      // Prevent default scrolling behavior
      if (Math.abs(diff) > 50) {
        moveEvent.preventDefault();
      }
    };
    
    const handleTouchEnd = (endEvent: TouchEvent) => {
      const touch = endEvent.changedTouches[0];
      const endY = touch.clientY;
      const diff = startY - endY;
      
      // Swipe threshold
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          handleSwipe('up'); // Swipe up - next video
        } else {
          handleSwipe('down'); // Swipe down - previous video
        }
      }
      
      // Clean up
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  // Wheel handler for desktop
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.deltaY > 0) {
      handleSwipe('up'); // Scroll down - next video
    } else {
      handleSwipe('down'); // Scroll up - previous video
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins}м`;
    if (diffHours < 24) return `${diffHours}ч`;
    if (diffDays < 7) return `${diffDays}д`;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <>
      <style>{css}</style>
      <div 
        ref={containerRef}
        className="vf-feed-container h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        onTouchStart={handleTouchStart}
        onWheel={handleWheel}
      >
        {soundToks.map((soundTok, index) => (
          <div
            key={soundTok.id}
            className="h-full w-full snap-start relative flex items-center justify-center bg-black"
          >
            <video
              src={`http://localhost:5002${soundTok.videoUrl}`}
              className="h-full w-full object-cover"
              loop
              autoPlay={index === currentIndex}
              muted={index !== currentIndex}
              playsInline
            />
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
            
            {/* Right side actions */}
            <div className="absolute right-4 bottom-24 flex flex-col gap-6">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold mb-2">
                  {soundTok.author.username[0].toUpperCase()}
                </div>
              </div>
              
              <button
                onClick={() => handleLike(soundTok.id)}
                disabled={soundTok.isLiked}
                className={`flex flex-col items-center ${soundTok.isLiked ? 'text-red-500' : 'text-white'}`}
              >
                <div className={`w-12 h-12 backdrop-blur rounded-full flex items-center justify-center mb-2 transition ${
                  soundTok.isLiked 
                    ? 'bg-red-500/30' 
                    : 'bg-white/20 hover:bg-white/30'
                }`}>
                  <Heart size={24} fill={soundTok.isLiked ? "currentColor" : "none"} />
                </div>
                <span className="text-sm font-medium">{soundTok.likes}</span>
              </button>
              
              <button 
                onClick={() => openComments(soundTok.id)}
                className="flex flex-col items-center text-white"
              >
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-2 hover:bg-white/30 transition">
                  <MessageCircle size={24} />
                </div>
                <span className="text-sm font-medium">{soundTok.commentsCount || 0}</span>
              </button>
              
              <button 
                onClick={() => handleShare(soundTok.id)}
                className="flex flex-col items-center text-white"
              >
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-2 hover:bg-white/30 transition">
                  <Share size={24} />
                </div>
                <span className="text-sm font-medium">Поделиться</span>
              </button>
            </div>
            
            {/* Bottom info */}
            <div className="absolute left-4 bottom-8 right-20 text-white">
              <p className="font-bold text-lg mb-2">@{soundTok.author.username}</p>
              <p className="text-sm mb-2">{soundTok.description}</p>
              <div className="flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs">
                  🎵 Оригинальный звук
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress Indicator */}
      <div className="vf-progress-indicator">
        {soundToks.map((_, index) => (
          <div
            key={index}
            className={`vf-progress-dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => scrollToVideo(index)}
          />
        ))}
      </div>

      {/* Comments Modal */}
      {commentsModalOpen && (
        <div className="vf-modal-overlay" onClick={() => setCommentsModalOpen(false)}>
          <div className="vf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vf-modal-header">
              <div className="vf-modal-title">Комментарии</div>
              <button className="vf-modal-close" onClick={() => setCommentsModalOpen(false)}>
                <X />
              </button>
            </div>
            
            <div className="vf-comments-list">
              {loadingComments ? (
                <div className="vf-loading">
                  <span className="vf-loading-text">Загрузка...</span>
                </div>
              ) : comments.length === 0 ? (
                <div className="vf-empty-comments">
                  <div className="vf-empty-text">Нет комментариев</div>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="vf-comment-item">
                    <div className="vf-comment-avatar">
                      {comment.author.username[0].toUpperCase()}
                    </div>
                    <div className="vf-comment-content">
                      <div className="vf-comment-header">
                        <span className="vf-comment-username">@{comment.author.username}</span>
                        <span className="vf-comment-time">{formatTime(comment.createdAt)}</span>
                      </div>
                      <div className="vf-comment-text">{comment.text}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="vf-comment-input-wrapper">
              <form onSubmit={handleSubmitComment}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Напишите комментарий..."
                  className="vf-comment-input"
                  rows={2}
                />
                <div className="vf-comment-actions">
                  <button 
                    type="submit" 
                    className="vf-btn vf-btn-primary"
                    disabled={!newComment.trim() || submittingComment}
                  >
                    <Send size={14} />
                    {submittingComment ? 'Отправка...' : 'Отправить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
