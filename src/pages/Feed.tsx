import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatePost from '../components/CreatePost';
import { postsApi, Post } from '../api/posts';
import {
  Image, Video, Music, Heart, MessageCircle, Share2,
  MoreHorizontal, Loader2, TrendingUp, Clock,
  Bookmark, Send, Play, Pause, Volume2, Eye,
  ChevronDown, Bell, Search, Flame, Zap
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

interface Media {
  id: string | number;
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'AUDIO';
}

interface PostWithStats extends Post {
  likes: number;
  comments: number;
  shares: number;
  views: number;
}

const AVATAR_PALETTES = [
  { bg: '#1a1a2e', accent: '#e94560' },
  { bg: '#0f3460', accent: '#533483' },
  { bg: '#16213e', accent: '#0f3460' },
  { bg: '#1b1b2f', accent: '#e43f5a' },
  { bg: '#162447', accent: '#1f4068' },
];

function getAvatarPalette(seed: string) {
  const idx = (seed?.charCodeAt(0) ?? 0) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m}м`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ч`;
  return `${Math.floor(h / 24)}д`;
}

// ────────────────────────────────────────────────────────────
// Avatar
// ────────────────────────────────────────────────────────────
function Avatar({ username, size = 44 }: { username: string; size?: number }) {
  const palette = getAvatarPalette(username);
  const letter = username?.[0]?.toUpperCase() ?? '?';
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${palette.accent}, ${palette.bg})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.38,
        color: '#fff',
        flexShrink: 0,
        boxShadow: `0 0 0 2px rgba(255,255,255,0.08), 0 4px 16px ${palette.accent}33`,
        letterSpacing: '-0.02em',
      }}
    >
      {letter}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Story Ring (decorative top bar)
// ────────────────────────────────────────────────────────────
const STORY_USERS = ['wave', 'nova', 'axel', 'lyra', 'rook', 'zen', 'miro'];

function StoriesBar() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 18,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
      className="hide-scrollbar"
    >
      {/* Add story */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px dashed rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>+</span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>Ваша</span>
      </div>
      {STORY_USERS.map((u) => {
        const palette = getAvatarPalette(u);
        return (
          <motion.div
            key={u}
            whileTap={{ scale: 0.93 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, cursor: 'pointer' }}
          >
            <div
              style={{
                padding: 2,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${palette.accent}, #a855f7)`,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#111118',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Avatar username={u} size={48} />
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>@{u}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Media Renderers
// ────────────────────────────────────────────────────────────
function ImageMedia({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#0d0d14' }}>
      {!loaded && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={24} color="rgba(255,255,255,0.2)" className="animate-spin" />
        </div>
      )}
      <img
        src={url}
        alt="media"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%',
          maxHeight: 520,
          objectFit: 'cover',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      />
      {/* Subtle bottom fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          background: 'linear-gradient(to top, rgba(10,10,18,0.6), transparent)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

function VideoMedia({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play(); setPlaying(true); }
  };

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', cursor: 'pointer' }} onClick={toggle}>
      <video ref={ref} src={url} style={{ width: '100%', maxHeight: 520, display: 'block' }} onEnded={() => setPlaying(false)} />
      <AnimatePresence>
        {!playing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.35)',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <Play size={24} color="#111" style={{ marginLeft: 3 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Duration badge */}
      <div style={{
        position: 'absolute', top: 12, right: 12,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
        borderRadius: 8, padding: '3px 8px',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <Video size={11} color="rgba(255,255,255,0.7)" />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Видео</span>
      </div>
    </div>
  );
}

function AudioMedia({ url }: { url: string }) {
  return (
    <div style={{
      borderRadius: 16,
      padding: '20px 20px 16px',
      background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.08))',
      border: '1px solid rgba(139,92,246,0.15)',
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(135deg, #7c3aed, #db2777)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
          flexShrink: 0,
        }}>
          <Music size={20} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                style={{ flex: 1, borderRadius: 2, background: 'linear-gradient(to top, #7c3aed, #ec4899)' }}
                animate={{ scaleY: [0.3, 1, 0.5, 0.8, 0.3] }}
                transition={{ duration: 1.2, delay: i * 0.07, repeat: Infinity, ease: 'easeInOut' }}
                initial={{ height: 24, transformOrigin: 'bottom' }}
              />
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500, letterSpacing: '0.04em' }}>АУДИО ТРЕК</span>
        </div>
      </div>
      <audio src={url} controls style={{ width: '100%', height: 36 }} />
    </div>
  );
}

function renderMedia(media: Media) {
  if (!media?.url) return null;
  const url = `http://localhost:5002${media.url}`;
  if (media.type === 'IMAGE') return <ImageMedia url={url} />;
  if (media.type === 'VIDEO') return <VideoMedia url={url} />;
  if (media.type === 'AUDIO') return <AudioMedia url={url} />;
  return null;
}

// ────────────────────────────────────────────────────────────
// Action Button
// ────────────────────────────────────────────────────────────
function ActionBtn({
  icon: Icon,
  count,
  active,
  activeColor,
  hoverColor,
  onClick,
}: {
  icon: React.ElementType;
  count?: number;
  active?: boolean;
  activeColor?: string;
  hoverColor?: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = active ? activeColor : hovered ? hoverColor : 'rgba(255,255,255,0.35)';

  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px 10px',
        borderRadius: 10,
        transition: 'background 0.18s',
        backgroundColor: hovered ? `${hoverColor}14` : 'transparent',
      }}
    >
      <motion.div animate={active ? { scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.25 }}>
        <Icon
          size={18}
          color={color}
          fill={active ? activeColor : 'none'}
          style={{ transition: 'color 0.18s, fill 0.18s' }}
        />
      </motion.div>
      {count !== undefined && (
        <span style={{ fontSize: 13, fontWeight: 500, color, transition: 'color 0.18s', fontVariantNumeric: 'tabular-nums' }}>
          {formatCount(count)}
        </span>
      )}
    </motion.button>
  );
}

// ────────────────────────────────────────────────────────────
// Post Card
// ────────────────────────────────────────────────────────────
function PostCard({ post, index }: { post: PostWithStats; index: number }) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const contentTruncated = (post.content?.length ?? 0) > 180;
  const displayContent = contentTruncated && !showMore
    ? post.content.slice(0, 180) + '…'
    : post.content;

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, scale: 0.97 }}
      transition={{ duration: 0.38, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      layout
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        overflow: 'hidden',
        transition: 'border-color 0.25s, box-shadow 0.25s',
      }}
      whileHover={{
        borderColor: 'rgba(255,255,255,0.13)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '18px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <motion.div
            style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => post?.author?.username && navigate(`/profile/${post.author.username}`)}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.18 }}
          >
            <Avatar username={post?.author?.username ?? '?'} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.01em' }}>
                  @{post?.author?.username ?? 'unknown'}
                </span>
                {/* Verified dot */}
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#a855f7' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
                  {post?.createdAt ? timeAgo(post.createdAt) : ''}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.1)' }}>·</span>
                <Eye size={11} color="rgba(255,255,255,0.2)" />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{formatCount(post.views)}</span>
              </div>
            </div>
          </motion.div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Follow chip */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#a855f7',
                background: 'rgba(168,85,247,0.1)',
                border: '1px solid rgba(168,85,247,0.2)',
                borderRadius: 8,
                padding: '4px 12px',
                cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              Follow
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9, rotate: 90 }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.25)', display: 'flex' }}
            >
              <MoreHorizontal size={18} />
            </motion.button>
          </div>
        </div>

        {/* Content */}
        {post?.content && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.75)', margin: 0, letterSpacing: '0.005em' }}>
              {displayContent}
            </p>
            {contentTruncated && (
              <button
                onClick={() => setShowMore(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#a855f7', padding: '4px 0 0', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                {showMore ? 'Свернуть' : 'Читать далее'}
                <ChevronDown size={13} style={{ transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Media */}
      {Array.isArray(post?.media) && post.media.length > 0 && (
        <div style={{ paddingInline: 14, paddingBottom: 0 }}>
          {post.media.length === 1 ? (
            renderMedia(post.media[0] as Media)
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {post.media.map((m: Media) => (
                <div key={m.id} style={{ borderRadius: 12, overflow: 'hidden' }}>
                  {renderMedia(m)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '14px 18px 0' }} />

      {/* Actions */}
      <div style={{ padding: '10px 10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ActionBtn
            icon={Heart}
            count={post.likes + (liked ? 1 : 0)}
            active={liked}
            activeColor="#ef4444"
            hoverColor="#ef4444"
            onClick={() => setLiked(v => !v)}
          />
          <ActionBtn
            icon={MessageCircle}
            count={post.comments}
            hoverColor="#3b82f6"
            activeColor="#3b82f6"
          />
          <ActionBtn
            icon={Share2}
            count={post.shares}
            hoverColor="#10b981"
            activeColor="#10b981"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ActionBtn
            icon={Bookmark}
            active={saved}
            activeColor="#f59e0b"
            hoverColor="#f59e0b"
            onClick={() => setSaved(v => !v)}
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              border: 'none',
              borderRadius: 10,
              padding: '7px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
            }}
          >
            <Send size={15} color="#fff" />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

// ────────────────────────────────────────────────────────────
// Trending Sidebar pill (decorative)
// ────────────────────────────────────────────────────────────
function TrendingTag({ label, count }: { label: string; count: string }) {
  return (
    <motion.div
      whileHover={{ x: 3 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
      }}
    >
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0 }}>#{label}</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '2px 0 0' }}>{count} постов</p>
      </div>
      <Flame size={14} color="#f97316" />
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Feed
// ────────────────────────────────────────────────────────────
export default function Feed() {
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'latest'>('trending');
  const [searchOpen, setSearchOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const headerBlur = useTransform(scrollY, [0, 60], [0, 1]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await postsApi.getPosts();
      setPosts(
        (data ?? []).map(post => ({
          ...post,
          likes: Math.floor(Math.random() * 3200) + 50,
          comments: Math.floor(Math.random() * 480) + 4,
          shares: Math.floor(Math.random() * 120) + 1,
          views: Math.floor(Math.random() * 24000) + 500,
        }))
      );
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#08080f',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Ambient background ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: -200, left: '10%', width: 700, height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -300, right: '5%', width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 65%)',
        }} />
        {/* Noise texture */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.025 }}>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

      {/* ── Sticky Topbar ── */}
      <motion.header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(8,8,15,0.75)',
          padding: '0 20px',
        }}
      >
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 58 }}>
          {/* Wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 9,
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
            }}>
              <Zap size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 19, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em' }}>
              лента
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSearchOpen(v => !v)}
              style={{
                background: searchOpen ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (searchOpen ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.07)'),
                borderRadius: 10,
                padding: '7px 9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: searchOpen ? '#a855f7' : 'rgba(255,255,255,0.45)',
                transition: 'all 0.2s',
              }}
            >
              <Search size={16} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                padding: '7px 9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'rgba(255,255,255,0.45)',
                position: 'relative',
              }}
            >
              <Bell size={16} />
              {/* Notification dot */}
              <div style={{
                position: 'absolute', top: 7, right: 7,
                width: 6, height: 6, borderRadius: '50%',
                background: '#ef4444',
                border: '1.5px solid #08080f',
              }} />
            </motion.button>
          </div>
        </div>

        {/* Search bar expand */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 52, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 10 }}>
                <input
                  autoFocus
                  placeholder="Поиск постов, людей, тегов…"
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    padding: '9px 14px',
                    color: '#fff',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── Page body ── */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto', padding: '24px 16px 80px' }}>

        {/* Stories */}
        <section style={{ marginBottom: 28 }}>
          <StoriesBar />
        </section>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['trending', 'latest'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                whileTap={{ scale: 0.95 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: isActive ? '1px solid rgba(168,85,247,0.35)' : '1px solid rgba(255,255,255,0.07)',
                  background: isActive ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.03)',
                  color: isActive ? '#a855f7' : 'rgba(255,255,255,0.35)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  letterSpacing: '0.01em',
                }}
              >
                {tab === 'trending' ? <TrendingUp size={14} /> : <Clock size={14} />}
                {tab === 'trending' ? 'Популярное' : 'Новое'}
              </motion.button>
            );
          })}
        </div>

        {/* Create Post */}
        <div style={{ marginBottom: 20 }}>
          <CreatePost onPostCreated={fetchPosts} />
        </div>

        {/* Trending tags mini strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            padding: '14px 16px',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Flame size={14} color="#f97316" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Тренды
            </span>
          </div>
          <TrendingTag label="дизайн" count="12.4K" />
          <TrendingTag label="разработка" count="9.2K" />
          <TrendingTag label="ии" count="31K" />
          <div style={{ paddingTop: 8 }}>
            <button style={{ fontSize: 12, color: '#a855f7', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Показать ещё →
            </button>
          </div>
        </motion.div>

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 16 }}
            >
              {/* Skeleton cards */}
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: '100%',
                    height: 160,
                    borderRadius: 20,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.4, delay: i * 0.15, repeat: Infinity, ease: 'linear' }}
                    style={{
                      position: 'absolute',
                      top: 0, bottom: 0, left: 0, width: '60%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
                    }}
                  />
                  <div style={{ padding: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 13, width: '40%', borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
                      <div style={{ height: 11, width: '25%', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
                    </div>
                  </div>
                  <div style={{ padding: '0 18px' }}>
                    <div style={{ height: 11, width: '90%', borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 7 }} />
                    <div style={{ height: 11, width: '70%', borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <AnimatePresence mode="popLayout">
            {posts.map((post, idx) => (
              <PostCard key={post.id} post={post} index={idx} />
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {!loading && posts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.2)' }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>🌑</div>
              <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px', color: 'rgba(255,255,255,0.35)' }}>Тишина…</p>
              <p style={{ fontSize: 13, margin: 0 }}>Станьте первым, кто что-то напишет</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Bottom Nav bar ── */}
      <nav style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        background: 'rgba(8,8,15,0.85)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: 62,
        zIndex: 50,
        padding: '0 8px',
      }}>
        {[
          { icon: TrendingUp, label: 'Лента', active: true },
          { icon: Search, label: 'Поиск', active: false },
          { icon: Bell, label: 'Уведомления', active: false },
          { icon: Bookmark, label: 'Сохранённые', active: false },
        ].map(({ icon: Icon, label, active }) => (
          <motion.button
            key={label}
            whileTap={{ scale: 0.88 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: 12,
            }}
          >
            <Icon size={20} color={active ? '#a855f7' : 'rgba(255,255,255,0.25)'} fill={active ? 'rgba(168,85,247,0.15)' : 'none'} />
            <span style={{ fontSize: 10, fontWeight: 500, color: active ? '#a855f7' : 'rgba(255,255,255,0.2)', letterSpacing: '0.02em' }}>{label}</span>
          </motion.button>
        ))}
      </nav>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        * { -webkit-font-smoothing: antialiased; }
      `}</style>
    </div>
  );
}