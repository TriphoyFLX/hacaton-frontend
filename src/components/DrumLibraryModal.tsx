import { useEffect, useMemo, useRef, useState } from 'react';
import { Library, Play, Square, X, Check } from 'lucide-react';
import {
  formatSampleSize,
  loadDrumLibrary,
  type DrumLibraryManifest,
  type DrumLibrarySample,
} from '../lib/drumLibrary';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (sample: DrumLibrarySample, file: File) => Promise<void> | void;
};

export default function DrumLibraryModal({ open, onClose, onPick }: Props) {
  const [manifest, setManifest] = useState<DrumLibraryManifest | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      setPreviewId(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    void loadDrumLibrary()
      .then((data) => {
        if (cancelled) return;
        setManifest(data);
        setCategoryId((prev) => prev || data.categories[0]?.id || '');
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Ошибка загрузки библиотеки');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const category = useMemo(
    () => manifest?.categories.find((c) => c.id === categoryId) || manifest?.categories[0],
    [manifest, categoryId],
  );

  const samples = useMemo(() => {
    const list = category?.samples || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => s.name.toLowerCase().includes(q) || s.file.toLowerCase().includes(q));
  }, [category, query]);

  const stopPreview = () => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setPreviewId(null);
  };

  const preview = async (sample: DrumLibrarySample) => {
    try {
      if (previewId === sample.id) {
        stopPreview();
        return;
      }
      stopPreview();
      const audio = new Audio(sample.url);
      audioRef.current = audio;
      setPreviewId(sample.id);
      audio.onended = () => setPreviewId(null);
      await audio.play();
    } catch (e) {
      console.warn('Preview failed', e);
      setPreviewId(null);
    }
  };

  const pick = async (sample: DrumLibrarySample) => {
    setBusyId(sample.id);
    setError('');
    try {
      stopPreview();
      const res = await fetch(sample.url);
      if (!res.ok) throw new Error('Не удалось скачать сэмпл');
      const blob = await res.blob();
      const type = blob.type || 'audio/wav';
      const ext = sample.file.includes('.') ? sample.file.slice(sample.file.lastIndexOf('.')) : '.wav';
      const safeName = sample.name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || sample.file;
      const file = new File([blob], `${safeName}${ext}`, { type });
      await onPick(sample, file);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось добавить сэмпл');
    } finally {
      setBusyId(null);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Библиотека звуков"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(8,7,6,0.72)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(920px, 100%)',
          maxHeight: 'min(84vh, 760px)',
          display: 'flex',
          flexDirection: 'column',
          background: '#12100e',
          border: '1px solid rgba(243,239,232,0.12)',
          borderRadius: 16,
          overflow: 'hidden',
          color: '#f3efe8',
          fontFamily: "'Instrument Sans', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 16px',
            borderBottom: '1px solid rgba(243,239,232,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Library size={16} />
            <div>
              <div style={{ fontWeight: 650, letterSpacing: '-0.03em' }}>
                {manifest?.name || 'Библиотека'} · готовые звуки
              </div>
              <div style={{ fontSize: 12, color: '#9a948c' }}>
                Послушайте и добавьте на трек
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="st-chip ghost"
            style={{ width: 34, height: 34, padding: 0, placeContent: 'center' }}
            aria-label="Закрыть"
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid rgba(243,239,232,0.08)' }}>
          {(manifest?.categories || []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`st-chip ${category?.id === c.id ? 'on' : 'ghost'}`}
            >
              {c.name} · {c.samples.length}
            </button>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск…"
            style={{
              marginLeft: 'auto',
              minWidth: 160,
              height: 32,
              borderRadius: 999,
              border: '1px solid rgba(243,239,232,0.12)',
              background: 'rgba(255,255,255,0.03)',
              color: '#f3efe8',
              padding: '0 12px',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {loading && <div style={{ color: '#9a948c', padding: 16 }}>Загрузка библиотеки…</div>}
          {error && (
            <div style={{ color: '#ff8a8a', padding: '8px 12px', marginBottom: 8, fontSize: 13 }}>
              {error}
            </div>
          )}
          {!loading && samples.length === 0 && (
            <div style={{ color: '#9a948c', padding: 16 }}>Ничего не найдено</div>
          )}
          <div style={{ display: 'grid', gap: 6 }}>
            {samples.map((sample) => {
              const isPreview = previewId === sample.id;
              const isBusy = busyId === sample.id;
              return (
                <div
                  key={sample.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 10,
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(243,239,232,0.08)',
                    background: isPreview ? 'rgba(232,168,124,0.08)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void preview(sample)}
                    className={`st-chip ${isPreview ? 'on' : 'ghost'}`}
                    style={{ width: 34, height: 34, padding: 0, placeContent: 'center' }}
                    title={isPreview ? 'Стоп' : 'Слушать'}
                  >
                    {isPreview ? <Square size={13} /> : <Play size={13} />}
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 560,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {sample.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#9a948c', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {category?.name} · {formatSampleSize(sample.bytes)}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!!busyId}
                    onClick={() => void pick(sample)}
                    className="st-chip on"
                    style={{ opacity: isBusy ? 0.6 : 1 }}
                  >
                    <Check size={13} /> {isBusy ? '…' : 'Выбрать'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
