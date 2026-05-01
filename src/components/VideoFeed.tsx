import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share } from 'lucide-react';
import { SoundTok, soundTokApi } from '../api/soundtok';

interface VideoFeedProps {
  soundToks: SoundTok[];
  onLike: (id: string) => void;
}

export default function VideoFeed({ soundToks, onLike }: VideoFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleLike = async (id: string) => {
    try {
      await soundTokApi.likeSoundTok(id);
      onLike(id);
    } catch (error) {
      console.error('Failed to like:', error);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      style={{ scrollbarWidth: 'none' }}
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
              className="flex flex-col items-center text-white"
            >
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-2 hover:bg-white/30 transition">
                <Heart size={24} fill="currentColor" />
              </div>
              <span className="text-sm font-medium">{soundTok.likes}</span>
            </button>
            
            <button className="flex flex-col items-center text-white">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-2 hover:bg-white/30 transition">
                <MessageCircle size={24} />
              </div>
              <span className="text-sm font-medium">0</span>
            </button>
            
            <button className="flex flex-col items-center text-white">
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
  );
}
