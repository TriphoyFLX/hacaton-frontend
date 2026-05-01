import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Edit3, Calendar, Mail, MapPin, Link as LinkIcon, LogOut } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('Музыкант и творец');

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (!user) {
    return (
      <div className="p-8">
        <div className="text-white text-center">Загрузка профиля...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-48 rounded-t-2xl relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-white/20 backdrop-blur p-2 rounded-lg hover:bg-white/30 transition"
          >
            <Edit3 size={20} className="text-white" />
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600/80 backdrop-blur p-2 rounded-lg hover:bg-red-600 transition"
            title="Выйти из аккаунта"
          >
            <LogOut size={20} className="text-white" />
          </button>
        </div>
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
        </div>

        {isEditing ? (
          <div className="mb-6">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-gray-700/50 text-white rounded-lg p-4 resize-none border border-gray-600 focus:border-purple-500 focus:outline-none"
              rows={4}
              placeholder="Расскажите о себе..."
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600 transition"
              >
                Отмена
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-purple-600 rounded-lg text-white hover:bg-purple-700 transition"
              >
                Сохранить
              </button>
            </div>
          </div>
        ) : (
          <p className="text-white mb-6">{bio}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-gray-400 text-sm">Посты</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-gray-400 text-sm">Подписчики</p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">0</p>
            <p className="text-gray-400 text-sm">Подписки</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 border-t border-gray-700 pt-6">
          <div className="flex items-center gap-3 text-gray-300">
            <Calendar size={18} />
            <span>Присоединился: {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }) : 'N/A'}</span>
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
        <h2 className="text-2xl font-bold text-white mb-4">Мои посты</h2>
        <div className="text-center text-gray-400 py-8 bg-gray-800/50 rounded-xl">
          <p>У вас пока нет постов</p>
        </div>
      </div>
    </div>
  );
}
