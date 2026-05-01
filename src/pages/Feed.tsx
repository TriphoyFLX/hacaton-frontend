import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatePost from '../components/CreatePost';
import { postsApi, Post } from '../api/posts';
import { Image, Video, Music } from 'lucide-react';

export default function Feed() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const data = await postsApi.getPosts();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const renderMedia = (media: any) => {
    const fullUrl = `http://localhost:5002${media.url}`;
    
    switch (media.type) {
      case 'IMAGE':
        return <img src={fullUrl} alt="Post media" className="rounded-lg max-w-full max-h-[500px]" />;
      case 'VIDEO':
        return <video src={fullUrl} controls className="rounded-lg max-w-full max-h-[500px]" />;
      case 'AUDIO':
        return <audio src={fullUrl} controls className="w-full" />;
      default:
        return null;
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'IMAGE': return <Image size={16} />;
      case 'VIDEO': return <Video size={16} />;
      case 'AUDIO': return <Music size={16} />;
      default: return null;
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Лента</h1>
      
      <CreatePost onPostCreated={fetchPosts} />
      
      {loading ? (
        <div className="text-center text-gray-400 py-8">Загрузка...</div>
      ) : posts.length === 0 ? (
        <div className="text-center text-gray-400 py-8">Нет постов</div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-gray-800/80 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
              <div 
                className="flex items-center gap-3 mb-4 cursor-pointer"
                onClick={() => navigate(`/profile/${post.author.username}`)}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {post.author.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium hover:text-purple-400 transition">@{post.author.username}</p>
                  <p className="text-gray-400 text-sm">
                    {new Date(post.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              
              {post.content && (
                <p className="text-white mb-4">{post.content}</p>
              )}
              
              {post.media && post.media.length > 0 && (
                <div className="mb-4">
                  {post.media.length === 1 ? (
                    <div className="rounded-lg overflow-hidden">
                      {renderMedia(post.media[0])}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {post.media.map((media) => (
                        <div key={media.id} className="relative rounded-lg overflow-hidden">
                          <div className="absolute top-2 left-2 bg-black/50 p-1 rounded">
                            {getMediaIcon(media.type)}
                          </div>
                          {renderMedia(media)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
