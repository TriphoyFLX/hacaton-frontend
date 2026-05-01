import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatsApi, Chat } from '../api/chats';
import { Search, MessageCircle } from 'lucide-react';

export default function Chats() {
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const data = await chatsApi.getChats();
        setChats(data);
      } catch (error) {
        console.error('Failed to fetch chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  const getOtherUser = (chat: Chat) => {
    const currentUserId = localStorage.getItem('userId');
    return chat.users.find(cu => cu.user.id !== currentUserId)?.user;
  };

  const getLastMessage = (chat: Chat) => {
    if (chat.messages.length === 0) return null;
    return chat.messages[0];
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short'
      });
    }
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
        <h1 className="text-2xl font-bold text-white">Чаты</h1>
      </div>

      {/* Search */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск чатов..."
            className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle size={48} className="mb-4 opacity-50" />
            <p className="text-lg mb-2">Нет чатов</p>
            <p className="text-sm">Найдите пользователей через поиск и начните общение</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {chats.map((chat) => {
              const otherUser = getOtherUser(chat);
              const lastMessage = getLastMessage(chat);
              
              if (!otherUser) return null;

              return (
                <div
                  key={chat.id}
                  onClick={() => navigate(`/chats/${chat.id}`)}
                  className="p-4 hover:bg-gray-800 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {otherUser.username[0].toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-white font-medium truncate">@{otherUser.username}</p>
                        {lastMessage && (
                          <span className="text-gray-400 text-xs ml-2">
                            {formatTime(lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      
                      {lastMessage ? (
                        <p className="text-gray-400 text-sm truncate">
                          {lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-gray-500 text-sm">Нет сообщений</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
