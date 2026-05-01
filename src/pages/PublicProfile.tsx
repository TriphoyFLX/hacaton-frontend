import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Mail, MapPin, Link as LinkIcon, Users } from 'lucide-react';

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!username) return;
      
      setLoading(true);
      try {
        // В реальном приложении здесь будет API для поиска пользователя по username
        // Пока используем моковые данные
        const mockUser = {
          id: '1',
          username: username,
          email: `${username}@example.com`,
          createdAt: new Date().toISOString(),
          bio: 'Музыкант и творец',
          followers: 0,
          following: 0,
          posts: 0
        };
        setUser(mockUser);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [username]);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    // TODO: API call для подписки
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-white text-center">
          <p className="mb-4">Пользователь не найден</p>
          <button
            onClick={() => navigate('/feed')}
            className="px-4 py-2 bg-purple-600 rounded-lg text-white"
          >
            Вернуться к ленте
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-48 rounded-t-2xl relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-white/20 backdrop-blur p-2 rounded-lg hover:bg-white/30 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
      </div>

      {/* Profile Info */}
      <div className="bg-gray-800/80 backdrop-blur-lg rounded-b-2xl p-6 -mt-8 relative">
        <div className="flex items-end gap-6 -mt-16 mb-6">
          <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-4xl font-bold border-4 border-gray-800 shadow-lg">
            {user.username[0].toUpperCase()}
          </div>
          <div className="flex-1 pb-2">
            <h1 className="text-3xl font-bold text-white">@{user.username}</h1>
            <p className="text-gray-400 mt-1">{user.email}</p>
          </div>
          <button
            onClick={handleFollow}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              isFollowing
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isFollowing ? 'Отписаться' : 'Подписаться'}
          </button>
        </div>

        <p className="text-white mb-6">{user.bio}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{user.posts}</p>
            <p className="text-gray-400 text-sm">Посты</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{user.followers}</p>
            <p className="text-gray-400 text-sm">Подписчики</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{user.following}</p>
            <p className="text-gray-400 text-sm">Подписки</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 border-t border-gray-700 pt-6">
          <div className="flex items-center gap-3 text-gray-300">
            <Calendar size={18} />
            <span>Присоединился: {new Date(user.createdAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300">
            <Mail size={18} />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300">
            <MapPin size={18} />
            <span>Россия</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300">
            <LinkIcon size={18} />
            <a href="#" className="text-purple-400 hover:text-purple-300">mysite.com</a>
          </div>
        </div>
      </div>

      {/* User's Posts */}
      <div className="mt-6">
        <h2 className="text-2xl font-bold text-white mb-4">Посты @{user.username}</h2>
        <div className="text-center text-gray-400 py-8 bg-gray-800/50 rounded-xl">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p>У пользователя пока нет постов</p>
        </div>
      </div>
    </div>
  );
}
