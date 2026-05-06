import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { profileApi, UserProfile, ValidationError } from '../api/profile';

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');`;

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
  --success: #27ae60;
  font-family: 'Syne', sans-serif;
  background: var(--bg);
  min-height: 100vh;
  color: var(--text-primary);
}

.profile-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 28px 80px;
}

/* ── HEADER BAR ── */
.profile-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 48px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}
.topbar-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-secondary);
}
.topbar-actions {
  display: flex;
  gap: 8px;
}
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  color: var(--text-secondary);
}
.btn-icon:hover {
  border-color: var(--border-hover);
  background: var(--bg-surface);
  color: var(--text-primary);
}
.btn-icon.danger:hover {
  border-color: var(--red);
  background: var(--red-dim);
  color: var(--red);
}
.btn-icon svg {
  width: 15px;
  height: 15px;
  stroke-width: 1.5;
}

/* ── HERO ── */
.profile-hero {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  margin-bottom: 40px;
}
.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}
.avatar {
  width: 80px;
  height: 80px;
  border: 1px solid var(--border-mid);
  border-radius: 14px;
  background: var(--bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: -0.01em;
  overflow: hidden;
  position: relative;
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-edit-btn {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.15s;
}
.avatar-edit-btn:hover {
  background: var(--text-primary);
  color: var(--bg);
  border-color: var(--text-primary);
}
.avatar-edit-btn svg {
  width: 14px;
  height: 14px;
}
.avatar-input {
  display: none;
}
.hero-info {
  flex: 1;
  padding-top: 4px;
}
.hero-handle {
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  letter-spacing: 0.02em;
}
.hero-name {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin: 0 0 6px;
}
.hero-email {
  font-family: 'DM Mono', monospace;
  font-size: 11.5px;
  color: var(--text-secondary);
  letter-spacing: 0.01em;
}

/* ── BIO ── */
.bio-section {
  margin-bottom: 40px;
}
.bio-text {
  font-size: 15px;
  color: var(--accent-dim);
  line-height: 1.65;
  font-weight: 400;
}
.bio-empty {
  font-size: 15px;
  color: var(--text-muted);
  font-style: italic;
}

/* ── EDIT FORM ── */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 40px;
  padding: 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.form-input,
.form-textarea {
  background: var(--bg);
  border: 1px solid var(--border-mid);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}
.form-input:focus,
.form-textarea:focus {
  border-color: var(--border-hover);
}
.form-input::placeholder,
.form-textarea::placeholder {
  color: var(--text-muted);
}
.form-textarea {
  resize: vertical;
  min-height: 80px;
}
.form-error {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: var(--red);
  letter-spacing: 0.02em;
}
.bio-edit-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bio-textarea {
  width: 100%;
  box-sizing: border-box;
  background: var(--bg-surface);
  border: 1px solid var(--border-mid);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  line-height: 1.65;
  padding: 14px 16px;
  resize: none;
  outline: none;
  transition: border-color 0.15s;
}
.bio-textarea:focus {
  border-color: var(--border-hover);
}
.bio-actions {
  display: flex;
  gap: 8px;
}
.btn {
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
}
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
}
.btn-ghost:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}
.btn-primary {
  background: var(--text-primary);
  border: 1px solid var(--text-primary);
  color: #0b0b0b;
  font-weight: 500;
}
.btn-primary:hover {
  background: var(--accent-dim);
  border-color: var(--accent-dim);
}

/* ── STATS ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 40px;
}
.stat-cell {
  padding: 20px 24px;
  position: relative;
}
.stat-cell + .stat-cell {
  border-left: 1px solid var(--border);
}
.stat-num {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.04em;
  line-height: 1;
  margin-bottom: 5px;
}
.stat-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* ── DETAILS ── */
.details-section {
  margin-bottom: 48px;
}
.section-heading {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 16px;
}
.detail-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.detail-row:first-of-type {
  border-top: 1px solid var(--border);
}
.detail-icon {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.detail-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  min-width: 88px;
}
.detail-value {
  font-size: 13.5px;
  color: var(--accent-dim);
}
.detail-link {
  font-size: 13.5px;
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--border-mid);
  transition: border-color 0.15s;
}
.detail-link:hover {
  border-color: var(--accent);
}

/* ── POSTS ── */
.posts-section {}
.posts-empty {
  border: 1px dashed var(--border-mid);
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
}
.posts-empty-label {
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  text-transform: uppercase;
}

/* ── SAVE STATUS ── */
.save-status {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 12px 20px;
  border-radius: 8px;
  font-family: 'DM Mono', monospace;
  font-size: 12px;
  letter-spacing: 0.04em;
  animation: slideIn 0.3s ease-out;
  z-index: 100;
}
.save-status.success {
  background: rgba(39, 174, 96, 0.15);
  color: var(--success);
  border: 1px solid rgba(39, 174, 96, 0.3);
}
.save-status.error {
  background: rgba(192, 57, 43, 0.15);
  color: var(--red);
  border: 1px solid rgba(192, 57, 43, 0.3);
}
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── MOBILE ── */
@media (max-width: 768px) {
  .profile-wrapper {
    padding: 24px 20px 80px !important;
    max-width: 100% !important;
  }
  
  .profile-hero {
    flex-direction: column;
    gap: 20px !important;
    margin-bottom: 32px !important;
  }
  
  .avatar {
    width: 60px !important;
    height: 60px !important;
  }
  
  .profile-topbar {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 16px !important;
    margin-bottom: 32px !important;
  }
  
  .stats-row {
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 12px !important;
  }
  
  .detail-row {
    flex-wrap: wrap !important;
    gap: 8px !important;
  }
  
  .detail-label {
    flex: 0 0 auto !important;
  }
  
  .detail-value {
    flex: 1 !important;
    text-align: right !important;
  }
}
`;

// ── SVG ICONS ──
const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconCamera = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

export default function Profile() {
  const { user, logout } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'success' | 'error' | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profileApi.getMyProfile();
        setProfile(data);
        setDisplayName(data.displayName || '');
        setBio(data.bio || '');
        setAvatar(data.avatar || null);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Clear save status after 3 seconds
  useEffect(() => {
    if (saveStatus) {
      const timeout = setTimeout(() => setSaveStatus(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [saveStatus]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrors([{ field: 'avatar', message: 'Файл слишком большой (макс. 5MB)' }]);
      setSaveStatus('error');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors([{ field: 'avatar', message: 'Неподдерживаемый формат (JPEG, PNG, GIF, WEBP)' }]);
      setSaveStatus('error');
      return;
    }

    try {
      const result = await profileApi.uploadAvatar(file);
      setAvatar(result.avatar);
      setSaveStatus('success');
      setErrors([]);
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setErrors([{ field: 'avatar', message: 'Ошибка загрузки аватара' }]);
      setSaveStatus('error');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrors([]);

    try {
      const result = await profileApi.updateProfile({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      });

      if (result.success && result.user) {
        setProfile(result.user);
        setSaveStatus('success');
        setIsEditing(false);
      } else {
        setErrors(result.errors || []);
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors([]);
    // Reset to current values
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
    }
  };

  const getFieldError = (field: string) => {
    return errors.find(e => e.field === field)?.message;
  };

  if (loading) {
    return (
      <div className="profile-root">
        <style>{css}</style>
        <div className="profile-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
            Загрузка...
          </span>
        </div>
      </div>
    );
  }

  if (!profile || !user) {
    return (
      <div className="profile-root">
        <style>{css}</style>
        <div className="profile-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '12px', color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
            Не удалось загрузить профиль
          </span>
        </div>
      </div>
    );
  }

  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="profile-root">
      <style>{css}</style>
      <div className="profile-wrapper">

        {/* Top bar */}
        <div className="profile-topbar">
          <span className="topbar-label">Профиль</span>
          <div className="topbar-actions">
            <button 
              className={`btn-icon ${isEditing ? 'active' : ''}`} 
              onClick={() => isEditing ? handleCancel() : setIsEditing(true)} 
              title={isEditing ? 'Отмена' : 'Редактировать'}
            >
              <IconEdit />
            </button>
            <button className="btn-icon danger" onClick={handleLogout} title="Выйти">
              <IconLogout />
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="profile-hero">
          <div className="avatar-wrapper">
            <div className="avatar">
              {avatar ? (
                <img src={avatar} alt={profile.username} />
              ) : (
                profile.username[0].toUpperCase()
              )}
            </div>
            <button className="avatar-edit-btn" onClick={handleAvatarClick} title="Изменить аватар">
              <IconCamera />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="avatar-input"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="hero-info">
            <div className="hero-handle">@{profile.username}</div>
            <h1 className="hero-name">{profile.displayName || profile.username}</h1>
            <div className="hero-email">{profile.email}</div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <div className="edit-form">
            <div className="form-group">
              <label className="form-label">Имя</label>
              <input
                type="text"
                className="form-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ваше отображаемое имя"
                maxLength={50}
              />
              {getFieldError('displayName') && (
                <span className="form-error">{getFieldError('displayName')}</span>
              )}
            </div>
            
            <div className="form-group">
              <label className="form-label">О себе</label>
              <textarea
                className="form-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Расскажите о себе..."
                rows={3}
                maxLength={500}
              />
              {getFieldError('bio') && (
                <span className="form-error">{getFieldError('bio')}</span>
              )}
            </div>
            
            <div className="bio-actions">
              <button className="btn btn-ghost" onClick={handleCancel} disabled={isSaving}>
                Отмена
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        )}

        {/* Bio */}
        {!isEditing && (
          <div className="bio-section">
            {bio ? (
              <p className="bio-text">{bio}</p>
            ) : (
              <p className="bio-empty">Нет описания. Нажмите редактировать, чтобы добавить.</p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-cell">
            <div className="stat-num">0</div>
            <div className="stat-label">Постов</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">0</div>
            <div className="stat-label">Подписчиков</div>
          </div>
          <div className="stat-cell">
            <div className="stat-num">0</div>
            <div className="stat-label">Подписок</div>
          </div>
        </div>

        {/* Details */}
        <div className="details-section">
          <div className="section-heading">Информация</div>

          <div className="detail-row">
            <span className="detail-icon"><IconCalendar /></span>
            <span className="detail-label">С нами с</span>
            <span className="detail-value">{joinDate}</span>
          </div>
          <div className="detail-row">
            <span className="detail-icon"><IconMail /></span>
            <span className="detail-label">Email</span>
            <span className="detail-value">{profile.email}</span>
          </div>
          <div className="detail-row">
            <span className="detail-icon"><IconPin /></span>
            <span className="detail-label">Локация</span>
            <span className="detail-value">Россия</span>
          </div>
          <div className="detail-row">
            <span className="detail-icon"><IconLink /></span>
            <span className="detail-label">Сайт</span>
            <a href="#" className="detail-link">mysite.com</a>
          </div>
        </div>

        {/* Posts */}
        <div className="posts-section">
          <div className="section-heading">Посты</div>
          <div className="posts-empty">
            <div className="posts-empty-label">Нет публикаций</div>
          </div>
        </div>

      </div>

      {/* Save Status Toast */}
      {saveStatus && (
        <div className={`save-status ${saveStatus}`}>
          {saveStatus === 'success' ? 'Сохранено' : 'Ошибка сохранения'}
        </div>
      )}
    </div>
  );
}