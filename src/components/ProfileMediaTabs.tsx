import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Lock, Play, Video } from 'lucide-react';
import { profileApi } from '../api/profile';
import type { SoundTok } from '../api/soundtok';
import { resolveMediaUrl } from '../lib/mediaUrl';

type TabKey = 'soundtoks' | 'likes';

interface ProfileMediaTabsProps {
  identifier: string;
  isOwner?: boolean;
  soundToksCount?: number;
  likedSoundToksCount?: number;
  likedSoundToksPublic?: boolean;
  onPrivacyChange?: (value: boolean) => Promise<void> | void;
}

const styles = `
.pmt-root {
  position: relative;
  z-index: 10;
}
.pmt-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid #232323;
  margin-bottom: 18px;
}
.pmt-tab {
  appearance: none;
  background: transparent;
  border: none;
  color: #6b6b6b;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 12px 14px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}
.pmt-tab:hover { color: #c5c0b8; }
.pmt-tab.active {
  color: #f0ede8;
  border-bottom-color: #e8e4dc;
}
.pmt-tab svg { width: 14px; height: 14px; }
.pmt-count {
  opacity: 0.55;
  font-variant-numeric: tabular-nums;
}
.pmt-privacy {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px 0 12px;
}
.pmt-privacy-label {
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b6b6b;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.pmt-switch {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  border: 1px solid #2e2e2e;
  background: #181818;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}
.pmt-switch.on {
  background: #e8e4dc;
  border-color: #e8e4dc;
}
.pmt-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #f0ede8;
  transition: transform 0.15s, background 0.15s;
}
.pmt-switch.on .pmt-switch-knob {
  transform: translateX(16px);
  background: #111111;
}
.pmt-switch:disabled {
  opacity: 0.55;
  cursor: wait;
}
.pmt-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}
@media (max-width: 560px) {
  .pmt-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pmt-privacy-label span { display: none; }
}
.pmt-cell {
  position: relative;
  aspect-ratio: 9 / 14;
  overflow: hidden;
  background: #181818;
  border: 1px solid #232323;
  border-radius: 8px;
  cursor: pointer;
  padding: 0;
  appearance: none;
  color: inherit;
}
.pmt-cell video,
.pmt-cell .pmt-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #141414;
}
.pmt-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3a3a3a;
}
.pmt-cell-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(transparent, rgba(0,0,0,0.72));
  font-family: 'DM Mono', monospace;
  font-size: 10px;
  color: #f0ede8;
  letter-spacing: 0.04em;
}
.pmt-cell-overlay svg { width: 12px; height: 12px; }
.pmt-empty {
  border: 1px dashed #2e2e2e;
  border-radius: 12px;
  padding: 48px 24px;
  text-align: center;
}
.pmt-empty-label {
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #3a3a3a;
  text-transform: uppercase;
}
.pmt-empty-hint {
  margin-top: 8px;
  font-size: 13px;
  color: #6b6b6b;
  font-family: 'Syne', sans-serif;
}
.pmt-more {
  margin-top: 14px;
  width: 100%;
  appearance: none;
  background: transparent;
  border: 1px solid #2e2e2e;
  border-radius: 8px;
  color: #c5c0b8;
  cursor: pointer;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 12px;
  transition: border-color 0.15s, color 0.15s;
}
.pmt-more:hover {
  border-color: #3d3d3d;
  color: #f0ede8;
}
.pmt-more:disabled {
  opacity: 0.5;
  cursor: wait;
}
`;

function emptyCopy(tab: TabKey, isOwner: boolean, privateLikes: boolean) {
  if (tab === 'soundtoks') {
    return {
      label: 'Нет SoundTok',
      hint: isOwner ? 'Загрузите первое видео в SoundTok' : 'У пользователя пока нет видео',
    };
  }
  if (privateLikes && !isOwner) {
    return {
      label: 'Лайки скрыты',
      hint: 'Пользователь скрыл лайкнутые видео',
    };
  }
  return {
    label: 'Нет лайков',
    hint: isOwner ? 'Лайкайте видео в SoundTok — они появятся здесь' : 'Пока пусто',
  };
}

export default function ProfileMediaTabs({
  identifier,
  isOwner = false,
  soundToksCount = 0,
  likedSoundToksCount,
  likedSoundToksPublic = false,
  onPrivacyChange,
}: ProfileMediaTabsProps) {
  const navigate = useNavigate();
  const showLikesTab = isOwner || likedSoundToksPublic;
  const [tab, setTab] = useState<TabKey>('soundtoks');
  const [items, setItems] = useState<SoundTok[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [privateBlocked, setPrivateBlocked] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showLikesTab && tab === 'likes') {
      setTab('soundtoks');
    }
  }, [showLikesTab, tab]);

  const load = useCallback(
    async (nextTab: TabKey, offset = 0, append = false) => {
      if (nextTab === 'likes' && !showLikesTab) {
        setItems([]);
        setTotal(0);
        setHasMore(false);
        setPrivateBlocked(true);
        setLoading(false);
        return;
      }

      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(null);
        setPrivateBlocked(false);
      }

      try {
        const fetcher =
          nextTab === 'soundtoks'
            ? profileApi.getUserSoundToks
            : profileApi.getUserLikedSoundToks;
        const data = await fetcher(identifier, { limit: 24, offset });
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setHasMore(Boolean(data.hasMore));
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 403) {
          setPrivateBlocked(true);
          setItems([]);
          setTotal(0);
          setHasMore(false);
        } else {
          setError('Не удалось загрузить видео');
          if (!append) setItems([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [identifier, showLikesTab]
  );

  useEffect(() => {
    void load(tab, 0, false);
  }, [tab, load]);

  const handlePrivacyToggle = async () => {
    if (!isOwner || !onPrivacyChange || privacySaving) return;
    setPrivacySaving(true);
    try {
      await onPrivacyChange(!likedSoundToksPublic);
    } finally {
      setPrivacySaving(false);
    }
  };

  const openVideo = (id: string) => {
    navigate(`/soundtok?v=${encodeURIComponent(id)}`);
  };

  const copy = emptyCopy(tab, isOwner, privateBlocked || (!likedSoundToksPublic && !isOwner));
  const displayLikedCount =
    likedSoundToksCount ?? (tab === 'likes' && !privateBlocked ? total : undefined);

  return (
    <div className="pmt-root">
      <style>{styles}</style>
      <div className="pmt-tabs">
        <button
          type="button"
          className={`pmt-tab ${tab === 'soundtoks' ? 'active' : ''}`}
          onClick={() => setTab('soundtoks')}
        >
          <Video />
          SoundTok
          <span className="pmt-count">{soundToksCount}</span>
        </button>
        {showLikesTab && (
          <button
            type="button"
            className={`pmt-tab ${tab === 'likes' ? 'active' : ''}`}
            onClick={() => setTab('likes')}
          >
            <Heart />
            Лайки
            {displayLikedCount !== undefined && (
              <span className="pmt-count">{displayLikedCount}</span>
            )}
          </button>
        )}
        {isOwner && (
          <div className="pmt-privacy" title="Могут ли другие видеть ваши лайки">
            <span className="pmt-privacy-label">
              <Lock size={12} />
              <span>Лайки в профиле</span>
            </span>
            <button
              type="button"
              className={`pmt-switch ${likedSoundToksPublic ? 'on' : ''}`}
              aria-pressed={likedSoundToksPublic}
              aria-label={
                likedSoundToksPublic
                  ? 'Лайки видны всем — нажмите, чтобы скрыть'
                  : 'Лайки скрыты — нажмите, чтобы показать'
              }
              disabled={privacySaving}
              onClick={() => void handlePrivacyToggle()}
            >
              <span className="pmt-switch-knob" />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="pmt-empty">
          <div className="pmt-empty-label">Загрузка…</div>
        </div>
      ) : error ? (
        <div className="pmt-empty">
          <div className="pmt-empty-label">{error}</div>
        </div>
      ) : items.length === 0 ? (
        <div className="pmt-empty">
          <div className="pmt-empty-label">{copy.label}</div>
          <div className="pmt-empty-hint">{copy.hint}</div>
        </div>
      ) : (
        <>
          <div className="pmt-grid">
            {items.map((item) => {
              const src = resolveMediaUrl(item.videoUrl);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="pmt-cell"
                  onClick={() => openVideo(item.id)}
                  aria-label={item.description || 'Открыть SoundTok'}
                >
                  {src ? (
                    <video src={src} muted playsInline preload="metadata" />
                  ) : (
                    <div className="pmt-fallback">
                      <Play size={22} />
                    </div>
                  )}
                  <div className="pmt-cell-overlay">
                    <Heart size={12} />
                    {item.likes}
                  </div>
                </button>
              );
            })}
          </div>
          {hasMore && (
            <button
              type="button"
              className="pmt-more"
              disabled={loadingMore}
              onClick={() => void load(tab, items.length, true)}
            >
              {loadingMore ? 'Загрузка…' : 'Ещё'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
