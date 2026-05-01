import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/studio', label: 'Студия', icon: '🎵' },
  { path: '/feed', label: 'Лента', icon: '📰' },
  { path: '/projects', label: 'Проекты', icon: '📁' },
  { path: '/soundtok', label: 'SoundTok', icon: '🎬' },
  { path: '/profile', label: 'Профиль', icon: '👤' },
  { path: '/chats', label: 'Чаты', icon: '💬' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-800/80 backdrop-blur-lg border-r border-gray-700 min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-8">BandLab</h1>
        
        <nav className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
