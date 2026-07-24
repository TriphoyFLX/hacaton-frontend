import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Calendar, Swords, Flag } from 'lucide-react';
import { chatsApi } from '../api/chats';
import { profileApi, UserProfile } from '../api/profile';
import { followsApi } from '../api/follows';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { addRecentProfile } from '../lib/recentProfiles';
import { useAuthStore } from '../store/authStore';
import FollowListModal from '../components/FollowListModal';
import BattleRatingCard from '../components/BattleRatingCard';
import AdminBadge from '../components/AdminBadge';
import ReportUserModal from '../components/ReportUserModal';
import ProfileMediaTabs from '../components/ProfileMediaTabs';

// ── Styles ──
const FONT_IMPORT = '';

const css = `
${FONT_IMPORT}

.profile-root {
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
  min-height: 100vh;
  color: var(--text-primary);
}

.profile-wrapper {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}

/* ── AMBIENT ── */
.profile-ambient {
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
  opacity: 0.12;
  animation: orb-float 24s ease-in-out infinite;
}
.ambient-orb-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(232, 228, 220, 0.12) 0%, transparent 70%);
  top: -200px;
  left: -100px;
  animation-delay: 0s;
}
.ambient-orb-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(197, 192, 184, 0.1) 0%, transparent 70%);
  bottom: -150px;
  right: -100px;
  animation-delay: -8s;
}
@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -40px) scale(1.06); }
  66% { transform: translate(-20px, 25px) scale(0.94); }
}
.profile-noise {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px;
}
.profile-grid-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.012;
  background-image: 
    linear-gradient(rgba(232, 228, 220, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 228, 220, 0.2) 1px, transparent 1px);
  background-size: 64px 64px;
}

/* ── TOP BAR ── */
.profile-topbar {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 48px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}
.back-btn:hover {
  border-color: var(--border-hover);
  background: var(--bg-surface);
  color: var(--text-primary);
}
.back-btn svg {
  width: 16px;
  height: 16px;
  stroke-width: 1.5;
}
.topbar-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* ── PROFILE HEADER ── */
.profile-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 32px;
}
.profile-avatar {
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border: 1px solid var(--border-mid);
  border-radius: 14px;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-size: 30px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.01em;
  overflow: hidden;
}
.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.profile-info {
  flex: 1;
  padding-top: 4px;
}
.profile-handle {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  margin-bottom: 4px;
}
.profile-name {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  margin-bottom: 4px;
}
.profile-email {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}
.profile-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* ── BUTTONS ── */
.btn-primary {
  height: 36px;
  padding: 0 18px;
  border-radius: 8px;
  background: var(--text-primary);
  border: 1px solid var(--text-primary);
  color: var(--bg);
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 7px;
}
.btn-primary:hover {
  background: var(--accent-dim);
  border-color: var(--accent-dim);
}
.btn-primary.following {
  background: transparent;
  border-color: var(--border);
  color: var(--text-secondary);
}
.btn-primary.following:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  background: var(--bg-surface);
}
.btn-primary svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.5;
}

/* ── BIO ── */
.profile-bio {
  position: relative;
  z-index: 10;
  margin-bottom: 32px;
}
.bio-text {
  font-size: 14.5px;
  color: var(--accent-dim);
  line-height: 1.7;
}

/* ── STATS ── */
.profile-stats {
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 32px;
}
@media (min-width: 640px) {
  .profile-stats {
    grid-template-columns: repeat(4, 1fr);
  }
}
.stat-cell {
  padding: 18px 20px;
}
.stat-cell.clickable {
  cursor: pointer;
  transition: background 0.12s;
}
.stat-cell.clickable:hover {
  background: var(--bg-surface);
}
.stat-cell + .stat-cell {
  border-left: 1px solid var(--border);
}
.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.04em;
  margin-bottom: 4px;
}
.stat-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* ── DETAILS ── */
.profile-details {
  position: relative;
  z-index: 10;
  margin-bottom: 40px;
}
.details-heading {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 14px;
}
.detail-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.detail-row:first-of-type {
  border-top: 1px solid var(--border);
}
.detail-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}
.detail-icon svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.5;
}
.detail-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  min-width: 80px;
}
.detail-value {
  font-size: 13px;
  color: var(--accent-dim);
}
.detail-link {
  font-size: 13px;
  color: var(--text-primary);
  text-decoration: none;
  border-bottom: 1px solid var(--border-mid);
  transition: border-color 0.15s;
  padding-bottom: 1px;
}
.detail-link:hover {
  border-color: var(--text-primary);
}

/* ── POSTS SECTION ── */
.profile-posts {
  position: relative;
  z-index: 10;
}
.posts-heading {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 14px;
}
.posts-empty {
  border: 1px dashed var(--border-mid);
  border-radius: 14px;
  padding: 48px 24px;
  text-align: center;
}
.posts-empty-icon {
  font-size: 36px;
  opacity: 0.3;
  margin-bottom: 12px;
  color: var(--text-muted);
}
.posts-empty-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* ── LOADING ── */
.loading-state {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 12px;
}
.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-mid);
  border-top-color: var(--text-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* ── NOT FOUND ── */
.not-found-state {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
  text-align: center;
}
.not-found-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.not-found-btn {
  height: 36px;
  padding: 0 18px;
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
.not-found-btn:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
  background: var(--bg-surface);
}
`;

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [listModal, setListModal] = useState<'followers' | 'following' | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    const fetchUser = async () => {
      if (!username) return;

      setLoading(true);
      try {
        const data = await profileApi.getPublicProfile(username);
        setUser(data);
        if (currentUser?.id !== data.id) addRecentProfile(data);
        setIsFollowing(!!data.isFollowing);
        setFollowersCount(data.followersCount ?? 0);
        // Canonicalize URL after username rename / case differences
        if (data.username && data.username !== username) {
          navigate(`/profile/${data.username}`, { replace: true });
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [username, currentUser?.id, navigate]);

  const handleFollow = async () => {
    if (!user || followLoading || currentUser?.id === user.id) return;

    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowersCount((c) => (wasFollowing ? Math.max(0, c - 1) : c + 1));
    setFollowLoading(true);

    try {
      const result = wasFollowing
        ? await followsApi.unfollow(user.id)
        : await followsApi.follow(user.id);
      setIsFollowing(result.following);
      setFollowersCount(result.followersCount);
    } catch (error) {
      setIsFollowing(wasFollowing);
      setFollowersCount((c) => (wasFollowing ? c + 1 : Math.max(0, c - 1)));
      console.error('Failed to toggle follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const startChat = async () => {
    if (!user || chatLoading || currentUser?.id === user.id) return;
    setChatLoading(true);
    setChatError('');
    try {
      const chat = await chatsApi.createChat(user.id);
      navigate(`/chats/${chat.id}`);
    } catch (error) {
      setChatError('Не удалось создать чат. Возможно, пользователь ограничил сообщения.');
      console.error('Failed to create chat:', error);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-root">
        <style>{css}</style>
        <div className="profile-ambient">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
        </div>
        <div className="profile-noise" />
        <div className="profile-grid-bg" />
        <div className="loading-state">
          <div className="loading-spinner" />
          <span className="loading-label">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-root">
        <style>{css}</style>
        <div className="profile-ambient">
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
        </div>
        <div className="profile-noise" />
        <div className="profile-grid-bg" />
        <div className="not-found-state">
          <span className="not-found-label">Пользователь не найден</span>
          <button onClick={() => navigate('/feed')} className="not-found-btn">
            Вернуться к ленте
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-root">
      <style>{css}</style>

      {/* Ambient Background */}
      <div className="profile-ambient">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
      </div>
      <div className="profile-noise" />
      <div className="profile-grid-bg" />

      <div className="profile-wrapper">
        {/* Top Bar */}
        <div className="profile-topbar">
          <div className="topbar-left">
            <button onClick={() => navigate(-1)} className="back-btn">
              <ArrowLeft size={16} />
            </button>
            <span className="topbar-label">Профиль</span>
          </div>
        </div>

        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {user.avatar ? (
              <img src={resolveMediaUrl(user.avatar) ?? ''} alt={user.username} />
            ) : (
              user.username[0].toUpperCase()
            )}
          </div>
          <div className="profile-info">
            <div className="profile-handle">
              @{user.username}
              <AdminBadge role={user.role} />
            </div>
            <h1 className="profile-name">{user.displayName || user.username}</h1>
          </div>
          <div className="profile-actions">
            {currentUser?.id !== user.id && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`btn-primary ${isFollowing ? 'following' : ''}`}
              >
                {isFollowing ? 'Отписаться' : 'Подписаться'}
              </button>
            )}
            {currentUser?.id !== user.id && (
              <button onClick={startChat} disabled={chatLoading} className="btn-primary">
                <MessageCircle size={14} />
                {chatLoading ? 'Создаём...' : 'Чат'}
              </button>
            )}
            {currentUser?.id !== user.id && (
              <button
                onClick={() => navigate(`/rap-battle?challenge=${user.id}`)}
                className="btn-primary"
              >
                <Swords size={14} />
                Баттл
              </button>
            )}
            {currentUser && currentUser.id !== user.id && user.role !== 'ADMIN' && (
              <button
                onClick={() => setReportOpen(true)}
                className="btn-primary"
                title="Пожаловаться"
                style={{ background: 'transparent', border: '1px solid #3a3a3a', color: '#c5c0b8' }}
              >
                <Flag size={14} />
                Жалоба
              </button>
            )}
          </div>
        </div>
        {chatError && <div className="profile-bio"><p className="bio-text">{chatError}</p></div>}

        {reportOpen && (
          <ReportUserModal
            open={reportOpen}
            onClose={() => setReportOpen(false)}
            reportedUserId={user.id}
            reportedUsername={user.username}
          />
        )}

        {/* Bio */}
        {user.bio && (
          <div className="profile-bio">
            <p className="bio-text">{user.bio}</p>
          </div>
        )}

        {/* Stats */}
        <div className="profile-stats">
          <div className="stat-cell">
            <div className="stat-num">{user.postsCount ?? 0}</div>
            <div className="stat-label">Постов</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">{user.soundToksCount ?? 0}</div>
            <div className="stat-label">SoundTok</div>
          </div>
          <div
            className="stat-cell clickable"
            onClick={() => setListModal('followers')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setListModal('followers')}
          >
            <div className="stat-num">{followersCount}</div>
            <div className="stat-label">Подписчиков</div>
          </div>
          <div
            className="stat-cell clickable"
            onClick={() => setListModal('following')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setListModal('following')}
          >
            <div className="stat-num">{user.followingCount ?? 0}</div>
            <div className="stat-label">Подписок</div>
          </div>
        </div>

        <BattleRatingCard rating={user} />

        {/* Details */}
        <div className="profile-details">
          <div className="details-heading">Информация</div>

          <div className="detail-row">
            <span className="detail-icon"><Calendar size={15} /></span>
            <span className="detail-label">С нами с</span>
            <span className="detail-value">
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })
                : '—'}
            </span>
          </div>
        </div>

        {/* SoundTok / Likes */}
        <div className="profile-posts">
          <ProfileMediaTabs
            identifier={user.username || user.id}
            isOwner={currentUser?.id === user.id}
            soundToksCount={user.soundToksCount ?? 0}
            likedSoundToksCount={user.likedSoundToksCount}
            likedSoundToksPublic={Boolean(user.likedSoundToksPublic)}
            onPrivacyChange={
              currentUser?.id === user.id
                ? async (value) => {
                    const result = await profileApi.updateProfile({ likedSoundToksPublic: value });
                    if (result.success && result.user) {
                      setUser((prev) =>
                        prev
                          ? { ...prev, likedSoundToksPublic: result.user!.likedSoundToksPublic }
                          : prev
                      );
                    }
                  }
                : undefined
            }
          />
        </div>
      </div>

      {listModal && user && (
        <FollowListModal
          userId={user.id}
          type={listModal}
          title={listModal === 'followers' ? 'Подписчики' : 'Подписки'}
          onClose={() => setListModal(null)}
        />
      )}
    </div>
  );
}