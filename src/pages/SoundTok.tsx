import { useState, useEffect } from 'react';
import VideoFeed from '../components/VideoFeed';
import { SoundTok, soundTokApi } from '../api/soundtok';

export default function SoundTok() {
  const [soundToks, setSoundToks] = useState<SoundTok[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchSoundToks = async () => {
    try {
      const data = await soundTokApi.getSoundToks();
      setSoundToks(data);
    } catch (error) {
      console.error('Failed to fetch SoundToks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSoundToks();
  }, []);

  const handleLike = (id: string) => {
    setSoundToks(prev =>
      prev.map(tok =>
        tok.id === id ? { ...tok, likes: tok.likes + 1 } : tok
      )
    );
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;

    setUploading(true);
    try {
      await soundTokApi.createSoundTok(description, videoFile);
      setDescription('');
      setVideoFile(null);
      setShowUpload(false);
      fetchSoundToks();
    } catch (error) {
      console.error('Failed to upload:', error);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    );
  }

  if (soundToks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-white mb-4">SoundTok</h1>
        <p className="text-gray-400 mb-6">Пока нет коротких видео</p>
        <button
          onClick={() => setShowUpload(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg text-white font-medium"
        >
          Загрузить видео
        </button>
        
        {showUpload && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md">
              <h2 className="text-xl font-bold text-white mb-4">Загрузить видео</h2>
              <form onSubmit={handleUpload} className="space-y-4">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Описание..."
                  className="w-full bg-gray-700 text-white rounded-lg p-3 resize-none border border-gray-600 focus:border-purple-500 focus:outline-none"
                  rows={3}
                />
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="w-full text-white"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUpload(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 rounded-lg text-white"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 px-4 py-2 bg-purple-600 rounded-lg text-white disabled:opacity-50"
                  >
                    {uploading ? 'Загрузка...' : 'Опубликовать'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <VideoFeed soundToks={soundToks} onLike={handleLike} />
      
      {/* Upload button */}
      <button
        onClick={() => setShowUpload(true)}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Загрузить видео</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание..."
                className="w-full bg-gray-700 text-white rounded-lg p-3 resize-none border border-gray-600 focus:border-purple-500 focus:outline-none"
                rows={3}
              />
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                className="w-full text-white"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-purple-600 rounded-lg text-white disabled:opacity-50"
                >
                  {uploading ? 'Загрузка...' : 'Опубликовать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
