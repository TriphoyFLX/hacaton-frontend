import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const token = useAuthStore((state) => state.token);

  // Редирект если уже авторизован
  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('You must agree to the Terms of Service');
      return;
    }

    // Валидация возраста (минимум 13 лет)
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) ? age - 1 : age;

    if (actualAge < 13) {
      setError('You must be at least 13 years old to register');
      return;
    }

    setLoading(true);

    try {
      await register(username, email, password, birthDate);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
      <div className="bg-gray-800/80 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">BandLab</h1>
          <h2 className="text-xl text-gray-300">Create Account</h2>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-300 mb-2 font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700/50 text-white border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition"
              required
              minLength={3}
              maxLength={30}
              placeholder="Choose a username"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700/50 text-white border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition"
              required
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700/50 text-white border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition"
              required
              minLength={8}
              placeholder="Min 8 characters"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 font-medium">Date of Birth</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700/50 text-white border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 focus:outline-none transition"
              required
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-gray-500 text-xs mt-1">You must be at least 13 years old</p>
          </div>

          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-5 h-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-800"
              required
            />
            <label htmlFor="terms" className="text-gray-300 text-sm leading-relaxed">
              I agree to the{' '}
              <a href="#" className="text-purple-400 hover:text-purple-300 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-purple-400 hover:text-purple-300 underline">
                Privacy Policy
              </a>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-gray-400 mt-6 text-center">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-purple-400 hover:text-purple-300 font-semibold"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
