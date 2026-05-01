import { useState, useEffect } from 'react';
import { Wand2, Music, Play, Download, Loader2, History, Trash2 } from 'lucide-react';

interface GenerationResponse {
  request_id: number;
  status: string;
  input?: any;
  response_type?: string;
  output?: any;
}

interface GenerationResult {
  request_id: number;
  status: string;
  audio_url?: string;
  title?: string;
  tags?: string;
  prompt?: string;
  createdAt?: string;
  progress?: number;
}

const STORAGE_KEY = 'ai-generated-tracks';

export default function AI() {
  const [title, setTitle] = useState('Свобода');
  const [tags, setTags] = useState('Винтажный джаз-лаундж, классические стандарты, плавные соло на трубе, контрабас и знойный женский вокал');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [progress, setProgress] = useState(0);

  const API_KEY = 'sk-LFuPFOiVOBfSsq3LLStFZZAs6JYqXNqdfWdCKJBcTO1POn6qvSmePXOG3tAL';

  // Загрузка истории из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GenerationResult[];
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, []);

  // Сохранение трека в историю
  const saveToHistory = (track: GenerationResult) => {
    const updated = [track, ...history];
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  };

  // Удаление трека из истории
  const deleteFromHistory = (requestId: number) => {
    const updated = history.filter(t => t.request_id !== requestId);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to delete from history:', error);
    }
  };

  // Очистка истории
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const generateMusic = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedAudio(null);
    setProgress(0);

    try {
      const requestBody = {
        title: title,
        tags: tags,
        ...(prompt && { prompt: prompt }),
        translate_input: true,
        model: 'v5.5'
      };

      const response = await fetch('https://api.gen-api.ru/api/v1/networks/suno', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const data: GenerationResponse = await response.json();
      
      console.log('Generation response:', data);

      // Начинаем polling для проверки статуса
      setGeneratedAudio({
        request_id: data.request_id,
        status: 'starting',
        title: title,
        tags: tags,
        prompt: prompt,
        createdAt: new Date().toISOString(),
        progress: 0
      });
      
      // Запускаем polling с эмуляцией прогресса
      pollForResult(data.request_id);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка генерации');
      console.error('Generation error:', err);
      setIsGenerating(false);
      setProgress(0);
    }
  };

  const pollForResult = async (requestId: number) => {
    setIsPolling(true);
    const maxAttempts = 80; // Максимум 80 попыток (4 минуты при 3 сек)
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        
        // Более реалистичная эмуляция прогресса
        // Первые 20 попыток: быстрый рост 0-30%
        // Следующие 30: средний рост 30-70%
        // Последние: медленный рост 70-95%
        let newProgress;
        if (attempts <= 20) {
          newProgress = Math.min(30, Math.floor((attempts / 20) * 30));
        } else if (attempts <= 50) {
          newProgress = Math.min(70, 30 + Math.floor(((attempts - 20) / 30) * 40));
        } else {
          newProgress = Math.min(95, 70 + Math.floor(((attempts - 50) / 30) * 25));
        }
        
        setProgress(newProgress);
        setGeneratedAudio(prev => prev ? { ...prev, progress: newProgress } : null);
        
        // Пытаемся получить результат через API
        const response = await fetch(`https://api.gen-api.ru/api/v1/networks/suno/result/${requestId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Polling result:', result);

          if (result.status === 'success' && result.output) {
            // Генерация завершена успешно
            const audioUrl = result.output.audio_url || result.output;
            const completedTrack: GenerationResult = {
              request_id: requestId,
              status: 'success',
              audio_url: audioUrl,
              title: title,
              tags: tags,
              prompt: prompt,
              createdAt: new Date().toISOString(),
              progress: 100
            };
            
            setGeneratedAudio(completedTrack);
            setIsGenerating(false);
            setIsPolling(false);
            setProgress(100);
            
            // Сохраняем в историю
            saveToHistory(completedTrack);
            
            return;
          } else if (result.status === 'failed' || result.status === 'error') {
            // Ошибка генерации
            setError('Генерация не удалась. Попробуйте снова.');
            setIsGenerating(false);
            setIsPolling(false);
            setProgress(0);
            return;
          }
        }

        // Если ещё не готово и не превышен лимит попыток, продолжаем polling
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000); // Проверяем каждые 3 секунды (быстрее)
        } else {
          setError('Время ожидания истекло (4 минуты). Генерация может занять больше времени. Попробуйте позже.');
          setIsGenerating(false);
          setIsPolling(false);
          setProgress(0);
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Продолжаем polling даже при ошибках
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setError('Не удалось получить результат. Попробуйте позже.');
          setIsGenerating(false);
          setIsPolling(false);
          setProgress(0);
        }
      }
    };

    poll();
  };

  const presetStyles = [
    { name: 'Джаз', tags: 'Винтажный джаз-лаундж, классические стандарты, плавные соло на трубе, контрабас и знойный женский вокал' },
    { name: 'Поп', tags: 'Современный поп, танцевальный ритм, запоминающийся хук, синтезаторы и динамичный бас' },
    { name: 'Рок', tags: 'Альтернативный рок, мощные гитары, драйвовый ритм, энергичное соло и сильный вокал' },
    { name: 'Электроника', tags: 'Электронная музыка, синтвейв, ретро-синтезаторы, атмосферные пэды и ритмичный бит' },
    { name: 'Хип-хоп', tags: 'Хип-хоп, trap-ритм, глубокий бас, автотюн и динамичные ударные' },
    { name: 'Классика', tags: 'Классическая музыка, оркестр, скрипка, фортепиано и симфоническая аранжировка' },
  ];

  const applyPreset = (tags: string) => {
    setTags(tags);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 overflow-y-auto">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Wand2 size={32} className="text-purple-400" />
              AI Генерация музыки
            </h1>
            <p className="text-gray-400 mt-2">
              Генерируйте уникальные музыкальные композиции с помощью Suno AI
            </p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
          >
            <History size={20} />
            История ({history.length})
          </button>
        </div>
      </div>

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Параметры генерации */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Music size={20} />
              Параметры генерации
            </h2>

            {/* Название */}
            <div className="mb-4">
              <label className="block text-gray-300 mb-2 font-medium">Название трека</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                placeholder="Введите название трека"
              />
            </div>

            {/* Стили музыки */}
            <div className="mb-4">
              <label className="block text-gray-300 mb-2 font-medium">Музыкальные стили</label>
              <textarea
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                rows={3}
                placeholder="Опишите желаемый музыкальный стиль"
              />
            </div>

            {/* Пресеты стилей */}
            <div className="mb-4">
              <label className="block text-gray-300 mb-2 font-medium">Быстрые пресеты</label>
              <div className="flex flex-wrap gap-2">
                {presetStyles.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset.tags)}
                    className="px-3 py-2 bg-gray-700 hover:bg-purple-600 rounded-lg text-white text-sm transition"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Текст песни (опционально) */}
            <div className="mb-6">
              <label className="block text-gray-300 mb-2 font-medium">Текст песни (опционально)</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                rows={6}
                placeholder="Введите текст песни, если хотите добавить вокал"
              />
            </div>

            {/* Кнопка генерации */}
            <button
              onClick={generateMusic}
              disabled={isGenerating}
              className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  Сгенерировать музыку
                </>
              )}
            </button>
          </div>

          {/* Результат */}
          {generatedAudio && (
            <div className="bg-gray-800 border border-purple-600 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Music size={20} className="text-purple-400" />
                Результат генерации
              </h3>
              
              {generatedAudio.status === 'starting' && (
                <div>
                  {/* Прогресс бар */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 font-medium">Генерация музыки...</span>
                      <span className="text-purple-400 font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-600 to-purple-400 h-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-gray-300">
                    <Loader2 size={24} className="animate-spin text-purple-400" />
                    <div>
                      <p className="text-sm text-gray-400">Request ID: {generatedAudio.request_id}</p>
                      <p className="text-sm text-gray-400">Это может занять несколько минут</p>
                    </div>
                  </div>
                </div>
              )}

              {generatedAudio.status === 'success' && generatedAudio.audio_url && (
                <div>
                  <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                    <p className="text-white font-medium mb-1">{generatedAudio.title || 'Сгенерированный трек'}</p>
                    <p className="text-gray-400 text-sm mb-1">Request ID: {generatedAudio.request_id}</p>
                    {generatedAudio.tags && (
                      <p className="text-gray-500 text-xs">Стиль: {generatedAudio.tags}</p>
                    )}
                  </div>
                  
                  <audio controls className="w-full mb-4" autoPlay>
                    <source src={generatedAudio.audio_url} type="audio/mpeg" />
                    Ваш браузер не поддерживает аудио
                  </audio>

                  <div className="flex gap-2">
                    <a 
                      href={generatedAudio.audio_url}
                      download
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition"
                    >
                      <Download size={16} />
                      Скачать
                    </a>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition">
                      <Play size={16} />
                      Добавить в проект
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-gray-800 border border-red-600 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-2">Ошибка</h3>
              <p className="text-gray-300">{error}</p>
            </div>
          )}

          {/* История генераций */}
          {showHistory && (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <History size={20} className="text-purple-400" />
                  История генераций
                </h3>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="flex items-center gap-2 px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm transition"
                  >
                    <Trash2 size={14} />
                    Очистить историю
                  </button>
                )}
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <History size={48} className="mx-auto mb-4 text-gray-600" />
                  <p>История генераций пуста</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {history.map((track) => (
                    <div
                      key={track.request_id}
                      className="bg-gray-700/50 border border-gray-600 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-white font-medium">{track.title || 'Без названия'}</p>
                          <p className="text-gray-400 text-sm">
                            {track.createdAt && new Date(track.createdAt).toLocaleString('ru-RU')}
                          </p>
                          {track.tags && (
                            <p className="text-gray-500 text-xs mt-1">{track.tags}</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteFromHistory(track.request_id)}
                          className="ml-2 p-1 text-gray-400 hover:text-red-400 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      {track.audio_url && (
                        <div>
                          <audio controls className="w-full mb-2">
                            <source src={track.audio_url} type="audio/mpeg" />
                            Ваш браузер не поддерживает аудио
                          </audio>
                          <div className="flex gap-2">
                            <a
                              href={track.audio_url}
                              download
                              className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-white text-sm transition"
                            >
                              <Download size={14} />
                              Скачать
                            </a>
                            <button className="flex items-center gap-2 px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white text-sm transition">
                              <Play size={14} />
                              В проект
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Информация */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-3">О Suno AI</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Suno AI - это мощная нейросеть для генерации музыки. Она может создавать треки в различных стилях,
              от классической музыки до современного попа и электронной музыки. Просто опишите желаемый стиль
              и, при необходимости, добавьте текст песни для генерации вокала.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
