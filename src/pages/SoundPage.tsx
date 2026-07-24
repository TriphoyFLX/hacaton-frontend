import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, BookmarkCheck, Camera, Music2, Play } from 'lucide-react';
import { soundsApi, type Sound } from '../api/sounds';
import type { SoundTok } from '../api/soundtok';
import { resolveMediaUrl } from '../lib/mediaUrl';
import { formatCount } from '../lib/format';

const FONT_IMPORT = '';

const css = `
${FONT_IMPORT}

.snd-root {
  --bg: #0a0a0a;
  --surface: #121212;
  --elevated: #1a1a1a;
  --border: #242424;
  --text: #f0ede8;
  --muted: #8a8680;
  --accent: #e8b4d8;
  font-family: 'Syne', sans-serif;
  min-height: 100vh;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(155, 127, 212, 0.18), transparent 55%),
    radial-gradient(900px 500px at 90% 0%, rgba(232, 180, 216, 0.12), transparent 50%),
    var(--bg);
  color: var(--text);
}

.snd-wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 96px;
}

.snd-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.snd-back {
  appearance: none;
  border: 1px solid var(--border);
  background: rgba(18,18,18,0.8);
  color: var(--text);
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.snd-back:hover { border-color: #3a3a3a; background: #181818; }

.snd-hero {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 20px;
  align-items: center;
  margin-bottom: 28px;
}

@media (max-width: 560px) {
  .snd-hero {
    grid-template-columns: 1fr;
    justify-items: start;
  }
}

.snd-cover {
  width: 120px;
  height: 120px;
  border-radius: 22px;
  background:
    conic-gradient(from 210deg, #9b7fd4, #e8b4d8, #4a8c8c, #9b7fd4);
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 18px 40px rgba(0,0,0,0.45);
}
.snd-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.snd-cover::after {
  content: '';
  position: absolute;
  inset: 18px;
  border-radius: 50%;
  background: #0d0d0d;
  border: 1px solid rgba(255,255,255,0.08);
  pointer-events: none;
}
.snd-cover.has-avatar::after {
  display: none;
}
.snd-cover svg {
  position: relative;
  z-index: 1;
  color: #f0ede8;
}

.snd-meta h1 {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
  margin: 0 0 8px;
}

.snd-author {
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 10px;
}
.snd-author a {
  color: var(--text);
  text-decoration: none;
}
.snd-author a:hover { color: var(--accent); }

.snd-stats {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.snd-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 22px;
}

.snd-btn {
  appearance: none;
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform 0.15s, opacity 0.15s, background 0.15s;
}
.snd-btn:active { transform: scale(0.98); }
.snd-btn-primary {
  background: linear-gradient(135deg, #f0ede8, #d9d2c8);
  color: #111;
}
.snd-btn-primary:hover { opacity: 0.92; }
.snd-btn-ghost {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border);
  color: var(--text);
}
.snd-btn-ghost:hover { background: rgba(255,255,255,0.07); }
.snd-btn-ghost.active {
  border-color: #e8b4d8;
  color: #e8b4d8;
}

.snd-section-title {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 8px 0 14px;
}

.snd-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
@media (max-width: 560px) {
  .snd-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.snd-cell {
  appearance: none;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--elevated);
  aspect-ratio: 9 / 14;
  padding: 0;
  cursor: pointer;
  position: relative;
}
.snd-cell video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.snd-cell-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(transparent, rgba(0,0,0,0.75));
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: #f0ede8;
}

.snd-empty, .snd-error, .snd-loading {
  border: 1px dashed var(--border);
  border-radius: 14px;
  padding: 40px 20px;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}

.snd-more {
  margin-top: 14px;
  width: 100%;
  appearance: none;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--muted);
  cursor: pointer;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 12px;
}
.snd-more:hover { color: var(--text); border-color: #3a3a3a; }
.snd-more:disabled { opacity: 0.5; cursor: wait; }

.snd-audio {
  width: 100%;
  margin-top: 16px;
  border-radius: 12px;
}
`;

export default function SoundPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sound, setSound] = useState<Sound | null>(null);
  const [videos, setVideos] = useState<SoundTok[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favBusy, setFavBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [soundData, videoData] = await Promise.all([
        soundsApi.getSound(id),
        soundsApi.getVideos(id, { limit: 24, offset: 0 }),
      ]);
      setSound(soundData);
      setVideos(videoData.items);
      setHasMore(Boolean(videoData.hasMore));
    } catch {
      setError('Не удалось загрузить звук');
      setSound(null);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFavorite = async () => {
    if (!sound || favBusy) return;
    setFavBusy(true);
    const next = !sound.isFavorited;
    setSound({ ...sound, isFavorited: next });
    try {
      if (next) await soundsApi.favorite(sound.id);
      else await soundsApi.unfavorite(sound.id);
    } catch {
      setSound({ ...sound, isFavorited: !next });
    } finally {
      setFavBusy(false);
    }
  };

  const loadMore = async () => {
    if (!id || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await soundsApi.getVideos(id, { limit: 24, offset: videos.length });
      setVideos((prev) => [...prev, ...data.items]);
      setHasMore(Boolean(data.hasMore));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="snd-root">
      <style>{css}</style>
      <div className="snd-wrap">
        <div className="snd-top">
          <button type="button" className="snd-back" onClick={() => navigate(-1)} aria-label="Назад">
            <ArrowLeft size={18} />
          </button>
        </div>

        {loading ? (
          <div className="snd-loading">Загрузка звука…</div>
        ) : error || !sound ? (
          <div className="snd-error">{error || 'Звук не найден'}</div>
        ) : (
          <>
            <div className="snd-hero">
              <div className={`snd-cover${resolveMediaUrl(sound.author.avatar) ? ' has-avatar' : ''}`} aria-hidden>
                {resolveMediaUrl(sound.author.avatar) ? (
                  <img src={resolveMediaUrl(sound.author.avatar) || ''} alt="" />
                ) : (
                  <Music2 size={28} />
                )}
              </div>
              <div className="snd-meta">
                <h1>{sound.title}</h1>
                <div className="snd-author">
                  от{' '}
                  <Link to={`/profile/${sound.author.username}`}>@{sound.author.username}</Link>
                </div>
                <div className="snd-stats">
                  {formatCount(sound.useCount)} видео · {formatCount(videos.length)}
                  {hasMore ? '+' : ''} в ленте
                </div>
                <audio
                  className="snd-audio"
                  controls
                  preload="metadata"
                  src={resolveMediaUrl(sound.audioUrl) || undefined}
                />
                <div className="snd-actions">
                  <button
                    type="button"
                    className="snd-btn snd-btn-primary"
                    onClick={() => navigate(`/soundtok/sound/${sound.id}/record`)}
                  >
                    <Camera size={16} />
                    Снять под этот звук
                  </button>
                  <button
                    type="button"
                    className={`snd-btn snd-btn-ghost ${sound.isFavorited ? 'active' : ''}`}
                    onClick={() => void toggleFavorite()}
                    disabled={favBusy}
                  >
                    {sound.isFavorited ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    {sound.isFavorited ? 'В избранном' : 'В избранное'}
                  </button>
                </div>
              </div>
            </div>

            <div className="snd-section-title">Видео с этим звуком</div>
            {videos.length === 0 ? (
              <div className="snd-empty">Пока нет видео — будь первым</div>
            ) : (
              <>
                <div className="snd-grid">
                  {videos.map((item) => {
                    const src = resolveMediaUrl(item.videoUrl);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="snd-cell"
                        onClick={() => navigate(`/soundtok?v=${encodeURIComponent(item.id)}`)}
                        aria-label={item.description || 'Открыть видео'}
                      >
                        {src ? (
                          <video src={src} muted playsInline preload="metadata" />
                        ) : (
                          <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
                            <Play size={22} />
                          </div>
                        )}
                        <div className="snd-cell-overlay">♥ {item.likes}</div>
                      </button>
                    );
                  })}
                </div>
                {hasMore && (
                  <button
                    type="button"
                    className="snd-more"
                    disabled={loadingMore}
                    onClick={() => void loadMore()}
                  >
                    {loadingMore ? 'Загрузка…' : 'Ещё'}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
