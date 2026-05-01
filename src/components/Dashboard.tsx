import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
      <nav className="bg-gray-800/80 backdrop-blur-lg p-4 border-b border-gray-700">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-white text-2xl font-bold">BandLab</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition font-medium"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-gray-800/80 backdrop-blur-lg p-8 rounded-2xl border border-gray-700 shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-6">Welcome, @{user?.username}!</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Username</p>
              <p className="text-white text-lg font-semibold">@{user?.username}</p>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white text-lg font-semibold">{user?.email}</p>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Birth Date</p>
              <p className="text-white text-lg font-semibold">{user?.birthDate ? new Date(user.birthDate).toLocaleDateString() : 'N/A'}</p>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Member Since</p>
              <p className="text-white text-lg font-semibold">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
