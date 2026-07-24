import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Music2,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';
import { API_ORIGIN } from '../api/client';
import { postsApi, type Post, type PostComment } from '../api/posts';
import { BEAT_POST_TAG } from '../lib/audioExport';
import { useAuthStore } from '../store/authStore';
import AdminBadge from '../components/AdminBadge';

function mediaUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function beatTitle(content: string) {
  const line = content.split('\n').map((s) => s.trim()).find(Boolean) || 'Untitled beat';
  return line.replace(new RegExp(`#${BEAT_POST_TAG}\\b`, 'ig'), '').trim() || 'Untitled beat';
}

function pickCover(post: Post) {
  return post.media?.find((m) => m.type === 'IMAGE') || null;
}

function pickAudio(post: Post) {
  return post.media?.find((m) => m.type === 'AUDIO') || null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'С‚РѕР»СЊРєРѕ С‡С‚Рѕ';
  if (mins < 60) return `${mins} РјРёРЅ`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} С‡`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} Рґ`;
  return new Date(dateStr).toLocaleDateString('ru-RU');
}

export default function Projects() {
  const user = useAuthStore((s) => s.user);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, PostComment[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await postsApi.getPosts('latest', BEAT_POST_TAG, { limit: 60, offset: 0 });
      setPosts(data.items.filter((p) => pickAudio(p)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р±РёС‚С‹');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleLike = async (post: Post) => {
    if (busyId) return;
    setBusyId(post.id);
    const prev = post.isLiked;
    setPosts((list) =>
      list.map((p) =>
        p.id === post.id
          ? { ...p, isLiked: !prev, likes: Math.max(0, p.likes + (prev ? -1 : 1)) }
          : p,
      ),
    );
    try {
      const res = prev ? await postsApi.unlikePost(post.id) : await postsApi.likePost(post.id);
      setPosts((list) =>
        list.map((p) => (p.id === post.id ? { ...p, isLiked: res.isLiked, likes: res.likes } : p)),
      );
    } catch {
      setPosts((list) =>
        list.map((p) =>
          p.id === post.id
            ? { ...p, isLiked: prev, likes: Math.max(0, p.likes + (prev ? 1 : -1)) }
            : p,
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

  const openComments = async (postId: string) => {
    const next = expandedId === postId ? null : postId;
    setExpandedId(next);
    if (!next || comments[postId]) return;
    try {
      const list = await postsApi.getComments(postId);
      setComments((c) => ({ ...c, [postId]: list }));
    } catch {
      setComments((c) => ({ ...c, [postId]: [] }));
    }
  };

  const sendComment = async (postId: string) => {
    const text = (commentDraft[postId] || '').trim();
    if (!text || busyId) return;
    setBusyId(postId);
    try {
      const res = await postsApi.createComment(postId, text);
      setComments((c) => ({ ...c, [postId]: [...(c[postId] || []), res.comment] }));
      setCommentDraft((d) => ({ ...d, [postId]: '' }));
      setPosts((list) =>
        list.map((p) => (p.id === postId ? { ...p, commentsCount: res.commentsCount } : p)),
      );
    } catch {
      // keep draft
    } finally {
      setBusyId(null);
    }
  };

  const deletePost = async (post: Post) => {
    if (!confirm('РЈРґР°Р»РёС‚СЊ СЌС‚РѕС‚ Р±РёС‚?')) return;
    try {
      await postsApi.deletePost(post.id);
      setPosts((list) => list.filter((p) => p.id !== post.id));
    } catch {
      alert('РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ');
    }
  };

  const empty = useMemo(() => !loading && posts.length === 0, [loading, posts.length]);

  return (
    <div style={styles.root}>
      <div style={styles.wrap}>
        <header style={styles.head}>
          <div>
            <h1 style={styles.h1}>Projects</h1>
            <p style={styles.sub}>
              РћРїСѓР±Р»РёРєРѕРІР°РЅРЅС‹Рµ Р±РёС‚С‹ РёР· MIDI В· Р»Р°Р№РєРё Рё РєРѕРјРјРµРЅС‚Р°СЂРёРё
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => void load()} style={styles.chip}>
              <RefreshCw size={14} /> РћР±РЅРѕРІРёС‚СЊ
            </button>
            <Link to="/midi" style={{ ...styles.chip, ...styles.chipPrimary, textDecoration: 'none' }}>
              <Music2 size={14} /> РћС‚РєСЂС‹С‚СЊ MIDI
            </Link>
          </div>
        </header>

        {error && <div style={styles.err}>{error}</div>}
        {loading && <div style={styles.muted}>Р—Р°РіСЂСѓР·РєР°вЂ¦</div>}
        {empty && (
          <div style={styles.empty}>
            <Music2 size={28} style={{ opacity: 0.5 }} />
            <p style={{ margin: '12px 0 4px', fontSize: 18, fontWeight: 600 }}>РџРѕРєР° РЅРµС‚ Р±РёС‚РѕРІ</p>
            <p style={{ margin: 0, color: '#9a948c', fontSize: 14 }}>
              РЎРѕР±РµСЂРёС‚Рµ С‚СЂРµРє РІ MIDI Рё РЅР°Р¶РјРёС‚Рµ В«РћРїСѓР±Р»РёРєРѕРІР°С‚СЊВ»
            </p>
            <Link to="/midi" style={{ ...styles.chip, ...styles.chipPrimary, marginTop: 16, textDecoration: 'none' }}>
              РЎРѕР·РґР°С‚СЊ Р±РёС‚
            </Link>
          </div>
        )}

        <div style={styles.grid}>
          {posts.map((post) => {
            const cover = pickCover(post);
            const audio = pickAudio(post);
            const title = beatTitle(post.content);
            const open = expandedId === post.id;
            const mine = user?.id === post.authorId;
            return (
              <article key={post.id} style={styles.card}>
                <div style={styles.coverWrap}>
                  {cover ? (
                    <img src={mediaUrl(cover.url)} alt="" style={styles.cover} />
                  ) : (
                    <div style={styles.coverFallback}>
                      <Music2 size={36} />
                    </div>
                  )}
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.cardTop}>
                    <div style={{ minWidth: 0 }}>
                      <h2 style={styles.title}>{title}</h2>
                      <div style={styles.meta}>
                        <Link to={`/profile/${post.author.username}`} style={styles.author}>
                          @{post.author.username}
                        </Link>
                        {post.author.role === 'ADMIN' && <AdminBadge />}
                        <span>В· {timeAgo(post.createdAt)}</span>
                      </div>
                    </div>
                    {mine && (
                      <button type="button" onClick={() => void deletePost(post)} style={styles.iconBtn} title="РЈРґР°Р»РёС‚СЊ">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {audio && (
                    <audio
                      controls
                      preload="none"
                      src={mediaUrl(audio.url)}
                      style={{ width: '100%', marginTop: 12, height: 36 }}
                      onPlay={() => void postsApi.recordView(post.id).catch(() => undefined)}
                    />
                  )}

                  <div style={styles.actions}>
                    <button
                      type="button"
                      onClick={() => void toggleLike(post)}
                      style={{ ...styles.actionBtn, color: post.isLiked ? '#e8a87c' : '#c5c0b8' }}
                    >
                      <Heart size={15} fill={post.isLiked ? 'currentColor' : 'none'} />
                      {post.likes}
                    </button>
                    <button type="button" onClick={() => void openComments(post.id)} style={styles.actionBtn}>
                      <MessageCircle size={15} />
                      {post.commentsCount}
                    </button>
                    <span style={{ ...styles.actionBtn, cursor: 'default' }}>{post.views} РїСЂРѕСЃРј.</span>
                  </div>

                  {open && (
                    <div style={styles.comments}>
                      {(comments[post.id] || []).map((c) => (
                        <div key={c.id} style={styles.comment}>
                          <strong>@{c.author.username}</strong>
                          <span style={{ color: '#c5c0b8' }}> {c.text}</span>
                        </div>
                      ))}
                      <div style={styles.commentRow}>
                        <input
                          value={commentDraft[post.id] || ''}
                          onChange={(e) =>
                            setCommentDraft((d) => ({ ...d, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void sendComment(post.id);
                          }}
                          placeholder="РљРѕРјРјРµРЅС‚Р°СЂРёР№вЂ¦"
                          style={styles.commentInput}
                          maxLength={500}
                        />
                        <button type="button" onClick={() => void sendComment(post.id)} style={styles.iconBtn}>
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    minHeight: '100%',
    background: 'linear-gradient(180deg, #12100e 0%, #0c0b0a 50%, #0a0908 100%)',
    color: '#f3efe8',
    fontFamily: "'Syne', system-ui, sans-serif",
  },
  wrap: { maxWidth: 1100, margin: '0 auto', padding: '28px 20px 72px' },
  head: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    marginBottom: 28,
  },
  h1: { margin: 0, fontSize: 'clamp(28px, 4vw, 40px)', letterSpacing: '-0.04em' },
  sub: { margin: '8px 0 0', color: '#9a948c', fontSize: 14 },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    height: 36,
    padding: '0 14px',
    borderRadius: 999,
    border: '1px solid rgba(243,239,232,0.14)',
    background: 'transparent',
    color: '#f3efe8',
    fontSize: 13,
    cursor: 'pointer',
  },
  chipPrimary: { background: '#f3efe8', color: '#12100e', borderColor: '#f3efe8' },
  err: { color: '#ff8a8a', marginBottom: 16, fontSize: 14 },
  muted: { color: '#9a948c' },
  empty: {
    border: '1px solid rgba(243,239,232,0.1)',
    borderRadius: 16,
    padding: 40,
    textAlign: 'center',
    background: 'rgba(255,255,255,0.02)',
  },
  grid: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  },
  card: {
    border: '1px solid rgba(243,239,232,0.1)',
    borderRadius: 16,
    overflow: 'hidden',
    background: '#141210',
    display: 'flex',
    flexDirection: 'column',
  },
  coverWrap: { aspectRatio: '1 / 1', background: '#1a1816' },
  cover: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  coverFallback: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    color: 'rgba(243,239,232,0.25)',
    background:
      'radial-gradient(circle at 30% 20%, rgba(232,168,124,0.18), transparent 55%), #1a1816',
  },
  cardBody: { padding: 14, display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  cardTop: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  title: {
    margin: 0,
    fontSize: 16,
    letterSpacing: '-0.02em',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: '#9a948c', marginTop: 4 },
  author: { color: '#e8a87c', textDecoration: 'none' },
  actions: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 32,
    padding: '0 10px',
    borderRadius: 999,
    border: '1px solid rgba(243,239,232,0.1)',
    background: 'transparent',
    color: '#c5c0b8',
    fontSize: 12,
    cursor: 'pointer',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1px solid rgba(243,239,232,0.1)',
    background: 'transparent',
    color: '#9a948c',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
  },
  comments: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid rgba(243,239,232,0.08)',
    display: 'grid',
    gap: 8,
  },
  comment: { fontSize: 13, lineHeight: 1.4 },
  commentRow: { display: 'flex', gap: 8 },
  commentInput: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    border: '1px solid rgba(243,239,232,0.12)',
    background: 'rgba(255,255,255,0.03)',
    color: '#f3efe8',
    padding: '0 10px',
    fontSize: 13,
    outline: 'none',
  },
};
