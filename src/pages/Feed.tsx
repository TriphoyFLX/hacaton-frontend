import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatePost from '../components/CreatePost';
import { postsApi, Post } from '../api/posts';
import {
  Video, Music, Heart, MessageCircle, Share2,
  MoreHorizontal, TrendingUp, Clock, Bookmark, Send,
  Play, Eye, ChevronDown, Bell, Search, Flame, Zap, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Feed.module.css';

// Types
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

// Constants
const AVATAR_PALETTES = [
  { bg: '#1a1a2e', accent: '#e94560' },
  { bg: '#0f3460', accent: '#533483' },
  { bg: '#16213e', accent: '#0f3460' },
  { bg: '#1b1b2f', accent: '#e43f5a' },
  { bg: '#162447', accent: '#1f4068' },
];

const STORY_USERS = ['wave', 'nova', 'axel', 'lyra', 'rook', 'zen', 'miro'];

// Utils
function getAvatarPalette(seed: string) {
  const idx = (seed?.charCodeAt(0) ?? 0) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx];
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
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

// Sub-components
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
        boxShadow: `0 0 0 2px rgba(255,255,255,0.08), 0 8px 24px ${palette.accent}22`,
        letterSpacing: '-0.02em',
      }}
    >
      {letter}
    </div>
  );
}

function StoriesBar() {
  return (
    <div className={styles.stories}>
      <div className={styles.storyItem}>
        <div className={styles.storyAdd}>+</div>
        <span className={styles.storyUsername}>Ваша</span>
      </div>
      {STORY_USERS.map((u) => {
        const palette = getAvatarPalette(u);
        return (
          <div key={u} className={styles.storyItem}>
            <div
              className={styles.storyRing}
              style={{ background: `linear-gradient(135deg, ${palette.accent}, #a855f7)` }}
            >
              <div className={styles.storyAvatar}>
                <Avatar username={u} size={52} />
              </div>
            </div>
            <span className={styles.storyUsername}>@{u}</span>
          </div>
        );
      })}
    </div>
  );
}

function ImageMedia({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  
  return (
    <div className={styles.imageWrapper}>
      {!loaded && (
        <div className={styles.imageLoader}>
          <div className={styles.spinner} style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#a855f7', borderRadius: '50%' }} />
        </div>
      )}
      <motion.img
        src={url}
        alt="Post media"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      />
      <div className={styles.imageOverlay}>
        <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 6 }}>
          <button style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
            <Heart size={14} />
          </button>
          <button style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: '#fff', display: 'flex' }}>
            <Bookmark size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoMedia({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) {
      ref.current.pause();
      setPlaying(false);
    } else {
      ref.current.play();
      setPlaying(true);
    }
  };

  return (
    <div className={styles.videoWrapper} onClick={toggle}>
      <video ref={ref} src={url} onEnded={() => setPlaying(false)} />
      <AnimatePresence>
        {!playing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.videoPlayBtn}
          >
            <div className={styles.videoPlayIcon}>
              <Play size={24} color="#111" style={{ marginLeft: 3 }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={styles.videoBadge}>
        <Video size={11} />
        <span>Видео</span>
      </div>
    </div>
  );
}

function AudioMedia({ url }: { url: string }) {
  return (
    <div className={styles.audioWrapper}>
      <div className={styles.audioHeader}>
        <div className={styles.audioIcon}>
          <Music size={22} color="#fff" />
        </div>
        <div className={styles.audioVisualizer}>
          <div className={styles.audioBars}>
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className={styles.audioBar}
                style={{ animationDelay: `${i * 0.08}s` }}
              />
            ))}
          </div>
          <div className={styles.audioLabel}>Аудио трек</div>
        </div>
      </div>
      <div className={styles.audioControls}>
        <audio src={url} controls />
      </div>
    </div>
  );
}

function renderMedia(media: Media) {
  if (!media?.url) return null;
  const url = `http://localhost:5002${media.url}`;
  
  switch (media.type) {
    case 'IMAGE': return <ImageMedia url={url} />;
    case 'VIDEO': return <VideoMedia url={url} />;
    case 'AUDIO': return <AudioMedia url={url} />;
    default: return null;
  }
}

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
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15, scale: 0.97 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className={styles.postCard}
    >
      {/* Header */}
      <div className={styles.postHeader}>
        <div className={styles.postHeaderContent}>
          <div
            className={styles.postAuthor}
            onClick={() => post?.author?.username && navigate(`/profile/${post.author.username}`)}
          >
            <div className={styles.avatarContainer}>
              <Avatar username={post?.author?.username ?? '?'} />
              <div className={styles.verifiedBadge}>✓</div>
            </div>
            <div className={styles.authorInfo}>
              <div className={styles.authorName}>
                <span className={styles.authorUsername}>
                  @{post?.author?.username ?? 'unknown'}
                </span>
                <div className={styles.authorVerified}>✓</div>
              </div>
              <div className={styles.postMeta}>
                <span className={styles.postTime}>
                  {post?.createdAt ? timeAgo(post.createdAt) : ''}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
                <div className={styles.postViews}>
                  <Eye size={11} />
                  <span>{formatCount(post.views)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.postActions}>
            <button className={styles.followBtn}>Follow</button>
            <button className={styles.moreBtn}>
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        {post?.content && (
          <div className={styles.postContent}>
            <p className={styles.postText}>{displayContent}</p>
            {contentTruncated && (
              <button
                className={styles.readMoreBtn}
                onClick={() => setShowMore(v => !v)}
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
        <div className={styles.mediaContainer}>
          {post.media.length === 1 ? (
            renderMedia(post.media[0] as Media)
          ) : (
            <div className={styles.mediaGrid}>
              {post.media.map((m: Media) => (
                <div key={m.id} className={styles.mediaItem}>
                  {renderMedia(m)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className={styles.postFooter}>
        <div className={styles.postDivider} />
        <div className={styles.postActionsRow}>
          <div className={styles.postActionsGroup}>
            <button
              className={`${styles.actionBtn} ${styles.actionBtnLike}`}
              onClick={() => setLiked(v => !v)}
            >
              <motion.div
                animate={liked ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Heart
                  size={18}
                  color={liked ? '#ef4444' : undefined}
                  fill={liked ? '#ef4444' : 'none'}
                  style={{ color: liked ? '#ef4444' : 'rgba(255,255,255,0.35)', transition: 'color 0.2s' }}
                />
              </motion.div>
              <span className={styles.actionBtnLabel} style={{ color: liked ? '#ef4444' : undefined }}>
                {formatCount(post.likes + (liked ? 1 : 0))}
              </span>
            </button>

            <button className={`${styles.actionBtn} ${styles.actionBtnComment}`}>
              <MessageCircle size={18} color="rgba(255,255,255,0.35)" />
              <span className={styles.actionBtnLabel}>{formatCount(post.comments)}</span>
            </button>

            <button className={`${styles.actionBtn} ${styles.actionBtnShare}`}>
              <Share2 size={18} color="rgba(255,255,255,0.35)" />
              <span className={styles.actionBtnLabel}>{formatCount(post.shares)}</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`${styles.actionBtn}`}
              onClick={() => setSaved(v => !v)}
              style={{ padding: '8px' }}
            >
              <Bookmark
                size={18}
                color={saved ? '#f59e0b' : 'rgba(255,255,255,0.35)'}
                fill={saved ? '#f59e0b' : 'none'}
              />
            </button>
            <button className={styles.sendBtn}>
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function TrendingTag({ label, count }: { label: string; count: string }) {
  return (
    <div className={styles.trendingTag}>
      <div>
        <div className={styles.trendingTagName}>#{label}</div>
        <div className={styles.trendingTagCount}>{count} постов</div>
      </div>
      <Flame size={14} color="#f97316" />
    </div>
  );
}

// Main Component
export default function Feed() {
  const [posts, setPosts] = useState<PostWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trending' | 'latest'>('trending');
  const [searchOpen, setSearchOpen] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await postsApi.getPosts();
      setPosts(
        (data ?? []).map((post: Post) => ({
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

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className={styles.feed}>
      {/* Ambient Background */}
      <div className={styles.bgAmbient}>
        <div className={styles.bgOrb1} />
        <div className={styles.bgOrb2} />
        <div className={styles.bgOrb3} />
      </div>
      <div className={styles.bgNoise} />
      <div className={styles.bgGrid} />

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <Zap size={18} color="#fff" />
            </div>
            <span className={styles.brandText}>лента</span>
          </div>

          <div className={styles.headerActions}>
            <button
              className={`${styles.headerBtn} ${searchOpen ? styles.headerBtnActive : ''}`}
              onClick={() => setSearchOpen(v => !v)}
            >
              <Search size={16} />
            </button>

            <button className={styles.headerBtn}>
              <Bell size={16} />
              <div className={styles.notificationDot} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 52, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={styles.searchBar}
            >
              <input
                autoFocus
                className={styles.searchInput}
                placeholder="Поиск постов, людей, тегов…"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent} ref={mainRef}>
        {/* Stories */}
        <section>
          <StoriesBar />
        </section>

        {/* Tabs */}
        <div className={styles.tabs}>
          {(['trending', 'latest'] as const).map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'trending' ? <TrendingUp size={14} /> : <Clock size={14} />}
              {tab === 'trending' ? 'Популярное' : 'Новое'}
            </button>
          ))}
        </div>

        {/* Create Post */}
        <div style={{ marginBottom: 24 }}>
          <CreatePost onPostCreated={fetchPosts} />
        </div>

        {/* Trending Tags */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.trendingBox}
        >
          <div className={styles.trendingHeader}>
            <Flame size={14} color="#f97316" />
            <span className={styles.trendingTitle}>Тренды</span>
          </div>
          <TrendingTag label="дизайн" count="12.4K" />
          <TrendingTag label="разработка" count="9.2K" />
          <TrendingTag label="искусственный интеллект" count="31K" />
          <button className={styles.trendingShowMore}>
            Показать ещё <ChevronRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
          </button>
        </motion.div>

        {/* Loading State */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {[0, 1, 2].map(i => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={styles.skeletonShimmer} />
                  <div className={styles.skeletonContent}>
                    <div className={styles.skeletonAvatar} />
                    <div className={styles.skeletonLines}>
                      <div className={styles.skeletonLine} style={{ width: '40%' }} />
                      <div className={styles.skeletonLine} style={{ width: '25%' }} />
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Posts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AnimatePresence mode="popLayout">
            {posts.map((post, idx) => (
              <PostCard key={post.id} post={post} index={idx} />
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {!loading && posts.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={styles.emptyState}
            >
              <div className={styles.emptyStateEmoji}>🌑</div>
              <div className={styles.emptyStateTitle}>Тишина…</div>
              <div className={styles.emptyStateText}>Станьте первым, кто что-то напишет</div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className={styles.bottomNav}>
        {[
          { icon: TrendingUp, label: 'Лента', active: true },
          { icon: Search, label: 'Поиск', active: false },
          { icon: Bell, label: 'Уведомл.', active: false },
          { icon: Bookmark, label: 'Сохр.', active: false },
        ].map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
          >
            <Icon
              size={20}
              color={active ? '#a855f7' : 'rgba(255,255,255,0.25)'}
            />
            <span className={styles.navItemLabel}>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}