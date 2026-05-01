import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi, SearchResult } from '../api/search';
import { chatsApi } from '../api/chats';
import { Search, X, Users, FileText, Video, MessageCircle } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'posts' | 'soundtoks'>('all');

  const startChat = async (userId: string) => {
    try {
      const chat = await chatsApi.createChat(userId);
      navigate(`/chats/${chat.id}`);
      onClose();
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  useEffect(() => {
    const handleSearch = async () => {
      if (query.trim().length < 2) {
        setResults(null);
        return;
      }

      setLoading(true);
      try {
        const searchResults = await searchApi.search(
          query, 
          activeTab === 'all' ? undefined : activeTab === 'soundtoks' ? 'soundtoks' : activeTab
        );
        setResults(searchResults);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [query, activeTab]);

  if (!isOpen) return null;

  const getTabCount = (type: 'users' | 'posts' | 'soundToks') => {
    return results ? results[type].length : 0;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <div className="bg-gray-800/95 backdrop-blur-lg rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Search input */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Search size={20} className="text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск пользователей, постов, видео..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none"
              autoFocus
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {query && (
          <div className="flex border-b border-gray-700">
            {[
              { key: 'all', label: 'Все', count: results ? results.users.length + results.posts.length + results.soundToks.length : 0 },
              { key: 'users', label: 'Пользователи', count: getTabCount('users'), icon: Users },
              { key: 'posts', label: 'Посты', count: getTabCount('posts'), icon: FileText },
              { key: 'soundtoks', label: 'SoundTok', count: getTabCount('soundToks'), icon: Video }
            ].map(({ key, label, count, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm transition ${
                  activeTab === key
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {Icon && <Icon size={16} />}
                <span>{label}</span>
                {count > 0 && <span className="text-xs">({count})</span>}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="overflow-y-auto max-h-[400px] p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Поиск...</div>
          ) : !query ? (
            <div className="text-center text-gray-400 py-8">
              <Search size={48} className="mx-auto mb-4 opacity-50" />
              <p>Начните вводить для поиска</p>
            </div>
          ) : results && (
            <div className="space-y-4">
              {/* Users */}
              {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
                <div>
                  <h3 className="text-gray-400 text-sm font-medium mb-2">Пользователи</h3>
                  <div className="space-y-2">
                    {results.users.map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition"
                      >
                        <div 
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => {
                            navigate(`/profile/${user.username}`);
                            onClose();
                          }}
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {user.username[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">@{user.username}</p>
                            <p className="text-gray-400 text-sm">{user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startChat(user.id);
                          }}
                          className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white"
                        >
                          <MessageCircle size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts */}
              {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
                <div>
                  <h3 className="text-gray-400 text-sm font-medium mb-2">Посты</h3>
                  <div className="space-y-2">
                    {results.posts.map((post) => (
                      <div key={post.id} className="p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition cursor-pointer">
                        <p className="text-white mb-2">{post.content}</p>
                        <p className="text-gray-400 text-sm">от @{post.author.username}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SoundToks */}
              {(activeTab === 'all' || activeTab === 'soundtoks') && results.soundToks.length > 0 && (
                <div>
                  <h3 className="text-gray-400 text-sm font-medium mb-2">SoundTok</h3>
                  <div className="space-y-2">
                    {results.soundToks.map((soundTok) => (
                      <div key={soundTok.id} className="p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition cursor-pointer">
                        <p className="text-white mb-2">{soundTok.description}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-gray-400 text-sm">от @{soundTok.author.username}</p>
                          <p className="text-gray-400 text-sm">❤️ {soundTok.likes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results */}
              {results.users.length === 0 && results.posts.length === 0 && results.soundToks.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <p>Ничего не найдено</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
