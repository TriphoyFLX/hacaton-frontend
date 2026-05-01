import { NavLink } from 'react-router-dom';
import { Home, Music, Video, MessageCircle, User, Shield, Wand2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { path: '/studio', label: 'Студия', icon: <Music /> },
  { path: '/feed', label: 'Лента', icon: <Home /> },
  { path: '/projects', label: 'Проекты', icon: <Video /> },
  { path: '/soundtok', label: 'SoundTok', icon: <Video /> },
  { path: '/ai', label: 'AI генерация', icon: <Wand2 /> },
  { path: '/chats', label: 'Чаты', icon: <MessageCircle /> },
  { path: '/profile', label: 'Профиль', icon: <User /> },
];

export default function Sidebar() {
  const { user } = useAuthStore();

  // Check if user is admin
  const isAdmin = user?.role === 'ADMIN';

  return (
    <aside className="w-64 bg-gray-800/80 backdrop-blur-lg border-r border-gray-700 min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-8">BandLab</h1>
        
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
          
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              <Shield size={20} />
              <span>Админ панель</span>
            </NavLink>
          )}
        </nav>
      </div>
    </aside>
  );
}
