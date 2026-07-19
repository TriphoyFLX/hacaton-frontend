import { useState, useEffect } from 'react';
import { Users, FileText, Video, Trash2, Shield, Ban } from 'lucide-react';
import { API_ORIGIN } from '../api/client';
import { getAuthToken } from '../lib/authToken';

const ADMIN_API = `${API_ORIGIN}/api/admin`;

function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  };
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface Post {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
  };
  createdAt: string;
  media: Array<{
    id: string;
    type: string;
    url: string;
  }>;
}

interface SoundTok {
  id: string;
  description: string;
  videoUrl: string;
  author: {
    id: string;
    username: string;
  };
  createdAt: string;
  likes: number;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'soundtoks'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [soundToks, setSoundToks] = useState<SoundTok[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = authHeaders();
      switch (activeTab) {
        case 'users': {
          const usersResponse = await fetch(`${ADMIN_API}/users`, { headers });
          if (!usersResponse.ok) throw new Error(usersResponse.status === 403 ? 'Нужна роль ADMIN' : 'Не удалось загрузить пользователей');
          setUsers(await usersResponse.json());
          break;
        }
        case 'posts': {
          const postsResponse = await fetch(`${ADMIN_API}/posts`, { headers });
          if (!postsResponse.ok) throw new Error(postsResponse.status === 403 ? 'Нужна роль ADMIN' : 'Не удалось загрузить посты');
          setPosts(await postsResponse.json());
          break;
        }
        case 'soundtoks': {
          const soundToksResponse = await fetch(`${ADMIN_API}/soundtoks`, { headers });
          if (!soundToksResponse.ok) throw new Error(soundToksResponse.status === 403 ? 'Нужна роль ADMIN' : 'Не удалось загрузить видео');
          setSoundToks(await soundToksResponse.json());
          break;
        }
      }
    } catch (e: any) {
      console.error('Failed to fetch data:', e);
      setError(e?.message || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    try {
      const res = await fetch(`${ADMIN_API}/users/${userId}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Не удалось удалить');
      setUsers(users.filter(u => u.id !== userId));
    } catch (e) {
      console.error('Failed to delete user:', e);
      alert('Не удалось удалить пользователя');
    }
  };

  const banUser = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите забанить этого пользователя?')) return;
    try {
      const res = await fetch(`${ADMIN_API}/users/${userId}/ban`, { method: 'PATCH', headers: authHeaders() });
      if (!res.ok) throw new Error('Не удалось забанить');
      await fetchData();
    } catch (e) {
      console.error('Failed to ban user:', e);
      alert('Не удалось забанить пользователя');
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) return;
    try {
      const res = await fetch(`${ADMIN_API}/posts/${postId}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Не удалось удалить');
      setPosts(posts.filter(p => p.id !== postId));
    } catch (e) {
      console.error('Failed to delete post:', e);
      alert('Не удалось удалить пост');
    }
  };

  const deleteSoundTok = async (soundTokId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это видео?')) return;
    try {
      const res = await fetch(`${ADMIN_API}/soundtoks/${soundTokId}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Не удалось удалить');
      setSoundToks(soundToks.filter(s => s.id !== soundTokId));
    } catch (e) {
      console.error('Failed to delete soundtok:', e);
      alert('Не удалось удалить видео');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 min-h-0">
      <div className="bg-gray-800 border-b border-gray-700 p-3 sm:p-4">
        <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
          <Shield size={22} className="sm:w-6 sm:h-6" />
          Админ панель
        </h1>
      </div>

      {error && (
        <div className="mx-3 sm:mx-4 mt-3 p-3 rounded-lg bg-red-900/40 border border-red-700 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-800 border-b border-gray-700 overflow-x-auto">
        <div className="flex min-w-max sm:min-w-0">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition whitespace-nowrap ${
              activeTab === 'users'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users size={18} className="inline mr-2" />
            Пользователи ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-3 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition whitespace-nowrap ${
              activeTab === 'posts'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText size={18} className="inline mr-2" />
            Посты ({posts.length})
          </button>
          <button
            onClick={() => setActiveTab('soundtoks')}
            className={`px-3 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-medium transition whitespace-nowrap ${
              activeTab === 'soundtoks'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Video size={18} className="inline mr-2" />
            Видео ({soundToks.length})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {activeTab === 'users' && (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="bg-gray-800 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-medium">@{user.username}</p>
                    <p className="text-gray-400 text-sm">{user.email}</p>
                    <p className="text-gray-500 text-xs">{formatDate(user.createdAt)}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-600 text-gray-300'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => banUser(user.id)}
                      className="p-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-white"
                      title="Забанить"
                    >
                      <Ban size={16} />
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-gray-800 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-white mb-2">{post.content}</p>
                    <p className="text-gray-400 text-sm mb-2">
                      Автор: @{post.author.username}
                    </p>
                    <p className="text-gray-500 text-xs">{formatDate(post.createdAt)}</p>
                    {post.media && post.media.length > 0 && (
                      <div className="mt-2">
                        <span className="text-gray-400 text-xs">
                          Медиа: {post.media.map(m => m.type).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white ml-4"
                    title="Удалить пост"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'soundtoks' && (
          <div className="space-y-4">
            {soundToks.map((soundTok) => (
              <div key={soundTok.id} className="bg-gray-800 rounded-lg p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-white mb-2">{soundTok.description}</p>
                    <p className="text-gray-400 text-sm mb-2">
                      Автор: @{soundTok.author.username} | Лайки: {soundTok.likes}
                    </p>
                    <p className="text-gray-500 text-xs">{formatDate(soundTok.createdAt)}</p>
                    {soundTok.videoUrl && (
                      <div className="mt-2">
                        <span className="text-gray-400 text-xs">
                          Видео: {soundTok.videoUrl}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteSoundTok(soundTok.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-lg text-white ml-4"
                    title="Удалить видео"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
