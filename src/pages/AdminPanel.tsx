import { useState, useEffect } from 'react';
import { Users, FileText, Video, Trash2, Shield, Ban } from 'lucide-react';

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

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      switch (activeTab) {
        case 'users':
          const usersResponse = await fetch('http://localhost:5002/api/admin/users', { headers });
          const usersData = await usersResponse.json();
          setUsers(usersData);
          break;
        case 'posts':
          const postsResponse = await fetch('http://localhost:5002/api/admin/posts', { headers });
          const postsData = await postsResponse.json();
          setPosts(postsData);
          break;
        case 'soundtoks':
          const soundToksResponse = await fetch('http://localhost:5002/api/admin/soundtoks', { headers });
          const soundToksData = await soundToksResponse.json();
          setSoundToks(soundToksData);
          break;
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5002/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const banUser = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите забанить этого пользователя?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5002/api/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот пост?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5002/api/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const deleteSoundTok = async (soundTokId: string) => {
    if (!confirm('Вы уверены, что хотите удалить это видео?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5002/api/admin/soundtoks/${soundTokId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSoundToks(soundToks.filter(s => s.id !== soundTokId));
    } catch (error) {
      console.error('Failed to delete soundtok:', error);
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
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield size={24} />
          Админ панель
        </h1>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium transition ${
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
            className={`px-6 py-3 font-medium transition ${
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
            className={`px-6 py-3 font-medium transition ${
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'users' && (
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
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
              <div key={post.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
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
              <div key={soundTok.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between">
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
