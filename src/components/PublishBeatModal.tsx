import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Upload, X } from 'lucide-react';
import { postsApi } from '../api/posts';
import { BEAT_POST_TAG } from '../lib/audioExport';

type Props = {
  open: boolean;
  projectName: string;
  busy: boolean;
  progress: string;
  error: string;
  onClose: () => void;
  onPublish: (opts: { title: string; cover: File | null }) => Promise<void>;
};

export default function PublishBeatModal({
  open,
  projectName,
  busy,
  progress,
  error,
  onClose,
  onPublish,
}: Props) {
  const [title, setTitle] = useState(projectName);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle(projectName || 'Untitled beat');
      setCover(null);
      setCoverPreview(null);
    }
  }, [open, projectName]);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  if (!open) return null;

  const pickCover = (file: File | null) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    if (!file) {
      setCover(null);
      setCoverPreview(null);
      return;
    }
    if (!file.type.startsWith('image/')) return;
    setCover(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="РћРїСѓР±Р»РёРєРѕРІР°С‚СЊ Р±РёС‚"
      onClick={() => !busy && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(8,7,6,0.78)',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          background: '#12100e',
          border: '1px solid rgba(243,239,232,0.12)',
          borderRadius: 16,
          color: '#f3efe8',
          fontFamily: "'Syne', system-ui, sans-serif",
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(243,239,232,0.1)',
          }}
        >
          <div>
            <div style={{ fontWeight: 650, letterSpacing: '-0.03em' }}>РћРїСѓР±Р»РёРєРѕРІР°С‚СЊ Р±РёС‚</div>
            <div style={{ fontSize: 12, color: '#9a948c', marginTop: 2 }}>
              Р РµРЅРґРµСЂ РІ Р°СѓРґРёРѕ в†’ Projects В· #{BEAT_POST_TAG}
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="st-chip ghost"
            style={{ width: 34, height: 34, padding: 0, placeContent: 'center' }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: 16, display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: '#9a948c' }}>
            РќР°Р·РІР°РЅРёРµ
            <input
              value={title}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              style={{
                height: 40,
                borderRadius: 10,
                border: '1px solid rgba(243,239,232,0.12)',
                background: 'rgba(255,255,255,0.03)',
                color: '#f3efe8',
                padding: '0 12px',
                fontSize: 14,
                outline: 'none',
              }}
            />
          </label>

          <div>
            <div style={{ fontSize: 12, color: '#9a948c', marginBottom: 6 }}>РћР±Р»РѕР¶РєР° (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)</div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => pickCover(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => coverInputRef.current?.click()}
              style={{
                width: '100%',
                minHeight: 140,
                borderRadius: 12,
                border: '1px dashed rgba(243,239,232,0.18)',
                background: 'rgba(255,255,255,0.02)',
                color: '#9a948c',
                cursor: 'pointer',
                overflow: 'hidden',
                padding: 0,
              }}
            >
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Cover"
                  style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <ImagePlus size={16} /> Р”РѕР±Р°РІРёС‚СЊ РѕР±Р»РѕР¶РєСѓ
                </span>
              )}
            </button>
            {cover && (
              <button
                type="button"
                disabled={busy}
                onClick={() => pickCover(null)}
                className="st-chip ghost"
                style={{ marginTop: 8 }}
              >
                РЈР±СЂР°С‚СЊ РѕР±Р»РѕР¶РєСѓ
              </button>
            )}
          </div>

          {progress && (
            <div style={{ fontSize: 12, color: '#e8a87c', display: 'flex', alignItems: 'center', gap: 8 }}>
              {busy && <Loader2 size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />}
              {progress}
            </div>
          )}
          {error && <div style={{ fontSize: 13, color: '#ff8a8a' }}>{error}</div>}

          <button
            type="button"
            disabled={busy || !title.trim()}
            onClick={() => void onPublish({ title: title.trim(), cover })}
            className="st-chip on"
            style={{ height: 42, justifyContent: 'center', opacity: busy || !title.trim() ? 0.55 : 1 }}
          >
            <Upload size={14} /> {busy ? 'РџСѓР±Р»РёРєР°С†РёСЏвЂ¦' : 'Р РµРЅРґРµСЂ Рё РѕРїСѓР±Р»РёРєРѕРІР°С‚СЊ'}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

