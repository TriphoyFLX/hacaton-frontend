import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, Pause, Upload, Users, Trophy, Send, Volume2, Disc, Clock, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { getAvailableUsers, createBattle, getUserBattles, getBattleInvitations, respondToBattle, updateBattleBeat, uploadBeatFile, updateBattleStatus, saveBattleRecording, getBattleRecordings, judgeBattle, User, Battle, BattleRecording } from '../api/battles';
import { useAuthStore } from '../store/authStore';

// Простой компонент для воспроизведения голоса + бита
const MixedTrackPlayer = ({ voiceUrl, beatUrl, label }: { voiceUrl: string; beatUrl: string; label: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string>('');
  const [voiceLoaded, setVoiceLoaded] = useState(false);
  const [beatLoaded, setBeatLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const beatAudioRef = useRef<HTMLAudioElement | null>(null);

  // Track component mount state
  const isMountedRef = useRef(true);
  
  // Загрузка аудио - используем blob URLs из БД с защитой от race conditions
  useEffect(() => {
    const loadAudio = async (attempt: number = 0) => {
      console.log('Debug: MixedTrackPlayer - loadAudio called, voiceUrl:', voiceUrl);
      console.log('Debug: MixedTrackPlayer - voiceAudioRef.current:', voiceAudioRef.current);
      console.log('Debug: MixedTrackPlayer - isMountedRef.current:', isMountedRef.current);
      
      if (!voiceUrl || !isMountedRef.current) {
        console.log('Debug: MixedTrackPlayer - Skipping load: no voiceUrl or component unmounted');
        return;
      }
      
      if (!voiceAudioRef.current) {
        console.log('Debug: MixedTrackPlayer - Ref not ready, retrying...');
        if (attempt < 5) {
          const delay = Math.min(100 * Math.pow(2, attempt), 1000);
          setTimeout(() => {
            if (isMountedRef.current) {
              loadAudio(attempt + 1);
            }
          }, delay);
        } else {
          console.log('Debug: MixedTrackPlayer - Max retry attempts reached for ref');
        }
        return;
      }
      
      setLoading(true);
      setError('');
      
      console.log('Debug: MixedTrackPlayer - Loading voice from DB...');
      console.log('Debug: MixedTrackPlayer - voiceUrl:', voiceUrl);
      console.log('Debug: MixedTrackPlayer - voiceAudioRef.current:', voiceAudioRef.current);
      
      try {
        // Проверяем что ref все еще существует и компонент смонтирован
        if (!voiceAudioRef.current || !isMountedRef.current) {
          throw new Error('Audio ref is null or component unmounted');
        }
        
        console.log('Debug: MixedTrackPlayer - Creating blob URL...');
        
        // Создаем blob URL из файла
        const fullUrl = voiceUrl.startsWith('http') ? voiceUrl : `http://localhost:5002${voiceUrl}`;
        const response = await fetch(fullUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Финальная проверка что ref все еще существует и компонент смонтирован
        if (!voiceAudioRef.current || !isMountedRef.current) {
          throw new Error('Audio ref became null during load or component unmounted');
        }
        
        voiceAudioRef.current.src = blobUrl;
        voiceAudioRef.current.load();
        
        try {
          await new Promise<void>((resolve, reject) => {
            // Check if component is still mounted before setting up audio events
            if (!isMountedRef.current || !voiceAudioRef.current) {
              reject(new Error('Component unmounted during audio setup'));
              return;
            }
            
            const audio = voiceAudioRef.current;
            const timeout = setTimeout(() => {
              reject(new Error('Voice loading timeout (10s)'));
            }, 10000);
            
            const cleanup = () => {
              clearTimeout(timeout);
              if (audio) {
                audio.onloadeddata = null;
                audio.onerror = null;
              }
            };
            
            audio.onloadeddata = () => {
              if (isMountedRef.current) {
                cleanup();
                resolve();
              } else {
                cleanup();
                reject(new Error('Component unmounted during audio loading'));
              }
            };
            
            audio.onerror = (e) => {
              if (isMountedRef.current) {
                cleanup();
                reject(new Error('Voice loading error'));
              } else {
                cleanup();
              }
            };
          });
          
          // Only update state if component is still mounted
          if (isMountedRef.current) {
            setVoiceLoaded(true);
            setBeatLoaded(true); // Считаем что бит готов
            console.log('Debug: MixedTrackPlayer - Voice loaded successfully from blob');
          }
        } catch (voiceErr) {
          console.error('Debug: MixedTrackPlayer - Voice loading failed:', voiceErr);
          throw voiceErr;
        }
        
      } catch (err) {
        // Only update error state if component is still mounted
        if (isMountedRef.current) {
          console.error('Debug: MixedTrackPlayer - Error loading audio:', err);
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(`Ошибка загрузки аудио: ${errorMessage}`);
        }
      } finally {
        // Only update loading state if component is still mounted
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };
    
    // Начинаем загрузку с небольшой задержкой чтобы DOM успел отрисоваться
    setTimeout(() => {
      if (isMountedRef.current) {
        loadAudio();
      }
    }, 100);
    
    return () => {
      isMountedRef.current = false;
    };
  }, [voiceUrl]);

  // Устанавливаем URL бита напрямую без загрузки
  useEffect(() => {
    if (beatUrl && beatAudioRef.current) {
      const fullBeatUrl = beatUrl.startsWith('http') ? beatUrl : `http://localhost:5002${beatUrl}`;
      beatAudioRef.current.src = fullBeatUrl;
      console.log('Debug: MixedTrackPlayer - Beat URL set:', fullBeatUrl);
    }
  }, [beatUrl]);

  const playAudio = () => {
    if (!voiceAudioRef.current || !beatAudioRef.current || !voiceLoaded || !beatLoaded) {
      console.log('Debug: MixedTrackPlayer - Cannot play: audio not ready');
      return;
    }
    
    try {
      // Устанавливаем громкость
      voiceAudioRef.current.volume = 0.8;
      beatAudioRef.current.volume = 0.4;
      
      // Синхронизируем начало
      const currentTime = 0;
      voiceAudioRef.current.currentTime = currentTime;
      beatAudioRef.current.currentTime = currentTime;
      
      // Запускаем воспроизведение с обработкой AbortError
      const playPromise = Promise.all([
        voiceAudioRef.current.play(),
        beatAudioRef.current.play()
      ]);
      
      playPromise.then(() => {
        setIsPlaying(true);
        console.log('Debug: MixedTrackPlayer - Audio playing successfully');
      }).catch(err => {
        // Игнорируем AbortError - это нормально при перерисовках
        if (err.name === 'AbortError') {
          console.log('Debug: MixedTrackPlayer - Play aborted (normal during re-renders)');
        } else {
          console.error('Debug: MixedTrackPlayer - Error playing audio:', err);
          setError('Ошибка воспроизведения');
        }
      });
      
    } catch (err) {
      console.error('Debug: MixedTrackPlayer - Error playing audio:', err);
      setError('Ошибка воспроизведения');
    }
  };

  const stopAudio = () => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
    }
    if (beatAudioRef.current) {
      beatAudioRef.current.pause();
      beatAudioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  // Автоматическая остановка при окончании
  useEffect(() => {
    const handleEnded = () => {
      setIsPlaying(false);
    };
    
    const voiceAudio = voiceAudioRef.current;
    const beatAudio = beatAudioRef.current;
    
    if (voiceAudio) voiceAudio.addEventListener('ended', handleEnded);
    if (beatAudio) beatAudio.addEventListener('ended', handleEnded);
    
    return () => {
      if (voiceAudio) voiceAudio.removeEventListener('ended', handleEnded);
      if (beatAudio) beatAudio.removeEventListener('ended', handleEnded);
    };
  }, []);

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
        <p className="text-red-400 text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-xs text-red-300 hover:text-red-400 underline"
        >
          Обновить страницу
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 mx-auto border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mb-2"></div>
        <p className="text-gray-400 text-sm">Загрузка аудио...</p>
      </div>
    );
  }

              return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">{label}</h3>
        <div className="flex items-center gap-2">
          {voiceLoaded && <span className="text-green-400 text-xs">✓ Голос</span>}
          {beatLoaded && <span className="text-green-400 text-xs">✓ Бит</span>}
        </div>
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={isPlaying ? stopAudio : playAudio}
          disabled={!voiceLoaded || !beatLoaded}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            !voiceLoaded || !beatLoaded
              ? 'bg-gray-500 cursor-not-allowed text-gray-300'
              : isPlaying 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-purple-500 hover:bg-purple-600 text-white'
          }`}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        
        <div className="flex-1">
          <p className="text-gray-400 text-sm">
            {isPlaying ? 'Воспроизведение...' : 'Нажмите для воспроизведения'}
          </p>
        </div>
      </div>

      {/* Скрытые audio элементы */}
      <audio ref={voiceAudioRef} preload="auto" />
      <audio ref={beatAudioRef} preload="auto" loop />
    </div>
  );
};

// Компонент визуализации звука при воспроизведении
const AudioVisualizer = ({ isActive }: { isActive: boolean }) => {
  const bars = 8;
  
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full bg-gradient-to-t from-purple-500 to-pink-500 transition-all duration-300 ${
            isActive ? 'animate-pulse' : 'opacity-30'
          }`}
          style={{
            height: `${isActive ? Math.random() * 20 + 10 : 10}px`,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  );
};

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================
export default function RapBattleNew() {
  // Auth store
  const { user } = useAuthStore();
  
  // Основные состояния
  const [currentPhase, setCurrentPhase] = useState<'waiting' | 'creating' | 'selecting_beat_creation' | 'selecting_opponent' | 'inviting' | 'waiting_for_opponent' | 'selecting_beat' | 'waiting_for_beat' | 'user1_turn' | 'user2_turn' | 'mutual_judging' | 'waiting_for_opponent_rating' | 'finished' | 'history'>('waiting');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<User | null>(null);
  const [currentBattle, setCurrentBattle] = useState<Battle | null>(null);
  const [userBattles, setUserBattles] = useState<Battle[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Форма создания баттла
  const [battleTitle, setBattleTitle] = useState('');
  const [battleDescription, setBattleDescription] = useState('');
  
  // Аудио состояния
  const [beatFile, setBeatFile] = useState<File | null>(null);
  const [beatUrl, setBeatUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingBeat, setIsPlayingBeat] = useState(false);
  const [recordedVoice, setRecordedVoice] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<'user1' | 'user2'>('user1');
  
  // Записанные треки
  const [user1Recording, setUser1Recording] = useState<BattleRecording | null>(null);
  const [user2Recording, setUser2Recording] = useState<BattleRecording | null>(null);
  
  // Взаимная оценка
  const [user1Rating, setUser1Rating] = useState<number | null>(null);
  const [user2Rating, setUser2Rating] = useState<number | null>(null);
  const [hasRated, setHasRated] = useState(false);
  const [opponentHasRated, setOpponentHasRated] = useState(false);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);
  
  // Настройки качество записи
  const [recordingQuality, setRecordingQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [showRecordingSettings, setShowRecordingSettings] = useState(false);
  
  // Судейство
  const [judgeResult, setJudgeResult] = useState<any>(null);
  
  // Рефы
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const beatAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const RECORDING_TIME_LIMIT = 30; // 30 секунд на раунд

  // ==================== ЗАГРУЗКА ДАННЫХ ====================
  useEffect(() => {
    loadAvailableUsers();
    loadUserBattles();
    // Не загружаем приглашения автоматически - только при необходимости
  }, []);

  const loadAvailableUsers = async () => {
    try {
      const users = await getAvailableUsers();
      setAvailableUsers(users);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Не удалось загрузить список пользователей');
    }
  };

  const loadUserBattles = async () => {
    try {
      const battles = await getUserBattles();
      setUserBattles(battles);
    } catch (err) {
      console.error('Error loading battles:', err);
      setError('Не удалось загрузить баттлы');
    }
  };

  const loadPendingInvitations = async () => {
    try {
      // Не проверяем приглашения если есть активный баттл
      if (currentBattle) {
        return;
      }
      
      const invitations = await getBattleInvitations();
      setPendingInvitations(invitations);
      
      // Показываем приглашение только если нет активного баттла и есть приглашения
      // Backend уже фильтрует так, что возвращаются только приглашения где текущий пользователь - оппонент
      if (invitations.length > 0) {
        const invitation = invitations[0];
        setCurrentBattle(invitation);
        setCurrentPhase('inviting'); // Эта фаза теперь только для оппонентов
      }
    } catch (err) {
      console.error('Error loading invitations:', err);
      // Не показываем ошибку для приглашений, это не критично
    }
  };

  const checkBattleStatus = async () => {
    if (!currentBattle) return;
    
    try {
      // Получаем актуальный статус баттла
      const battles = await getUserBattles();
      const updatedBattle = battles.find(b => b.id === currentBattle.id);
      
      if (updatedBattle && updatedBattle.status !== currentBattle.status) {
        console.log('Debug: Battle status changed from', currentBattle.status, 'to', updatedBattle.status);
        setCurrentBattle(updatedBattle);
        
        // Обновляем фазу в зависимости от нового статуса
        const currentUserId = user?.id;
        const isCreator = currentUserId && String(updatedBattle.creator.id) === currentUserId;
        
        console.log('Debug: currentUserId:', currentUserId, 'type:', typeof currentUserId);
        console.log('Debug: creator.id:', updatedBattle.creator.id, 'type:', typeof updatedBattle.creator.id);
        console.log('Debug: IDs equal?', currentUserId === updatedBattle.creator.id);
        console.log('Debug: User is creator?', isCreator);
        
        if (updatedBattle.status === 'USER1_TURN') {
          setCurrentPhase('user1_turn');
        } else if (updatedBattle.status === 'USER2_TURN') {
          setCurrentPhase('user2_turn');
        } else if (updatedBattle.status === 'JUDGING') {
          setCurrentPhase('mutual_judging');
        } else if (updatedBattle.status === 'CANCELLED') {
          setCurrentPhase('waiting');
          setCurrentBattle(null);
        }
      }
    } catch (err) {
      console.error('Error checking battle status:', err);
    }
  };

  const getCurrentUserRole = () => {
    if (!currentBattle || !user) return null;
    
    const currentUserId = user.id;
    console.log('Debug: getCurrentUserRole - currentUserId:', currentUserId);
    console.log('Debug: getCurrentUserRole - user:', user);
    
    const isCreator = String(currentBattle.creator.id) === currentUserId;
    console.log('Debug: isCreator:', isCreator, 'creator.id:', currentBattle.creator.id);
    
    if (isCreator) return 'CREATOR';
    
    const opponent = currentBattle.participants.find(p => p.role === 'OPPONENT');
    if (opponent && String(opponent.user.id) === currentUserId) return 'OPPONENT';
    
    console.log('Debug: User is neither creator nor opponent');
    return null;
  };

  const canCurrentUserRecord = () => {
    const userRole = getCurrentUserRole();
    console.log('Debug: userRole:', userRole);
    console.log('Debug: currentPhase:', currentPhase);
    console.log('Debug: currentBattle status:', currentBattle?.status);
    
    if (!userRole) return false;
    
    // При USER1_TURN всегда записывает создатель
    // При USER2_TURN всегда записывает оппонент
    if (currentPhase === 'user1_turn') {
      const canRecord = userRole === 'CREATOR';
      console.log('Debug: user1_turn, CREATOR can record:', canRecord);
      return canRecord;
    } else if (currentPhase === 'user2_turn') {
      const canRecord = userRole === 'OPPONENT';
      console.log('Debug: user2_turn, OPPONENT can record:', canRecord);
      return canRecord;
    }
    
    return false;
  };

  // ==================== ОБРАБОТЧИКИ ====================
  
  const createNewBattle = async () => {
    if (!selectedOpponent || !battleTitle || !beatFile) {
      setError('Выберите оппонента, введите название баттла и загрузите бит');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Сначала загружаем бит на сервер
      console.log('Debug: Uploading beat file to server...');
      const { url: serverBeatUrl } = await uploadBeatFile(beatFile);
      console.log('Debug: Beat uploaded to server:', serverBeatUrl);
      
      // Создаем баттл
      const battle = await createBattle(battleTitle, battleDescription, selectedOpponent.id);
      setCurrentBattle(battle);
      
      // Сохраняем бит в баттл
      await updateBattleBeat(battle.id, serverBeatUrl, beatFile.name);
      
      // Обновляем баттл с битом
      const updatedBattle = { ...battle, beatUrl: serverBeatUrl, beatName: beatFile.name, status: 'INVITING' as const };
      setCurrentBattle(updatedBattle);
      
      // Для создателя показываем экран ожидания оппонента
      setCurrentPhase('waiting_for_opponent');
    } catch (err: any) {
      setError(err.message || 'Не удалось создать баттл');
    } finally {
      setLoading(false);
    }
  };

  const handleBattleInvitation = async (accept: boolean) => {
    if (!currentBattle) return;
    
    setLoading(true);
    try {
      await respondToBattle(currentBattle.id, accept);
      if (accept) {
        // Бит уже выбран при создании, сразу переходим к записи
        const updatedBattle = { ...currentBattle, status: 'USER1_TURN' as const };
        setCurrentBattle(updatedBattle);
        
        // Определяем правильную фазу в зависимости от роли пользователя
        const currentUserId = user?.id;
        const isCreator = currentUserId && String(updatedBattle.creator.id) === currentUserId;
        
        console.log('Debug: currentUserId:', currentUserId, 'type:', typeof currentUserId);
        console.log('Debug: creator.id:', updatedBattle.creator.id, 'type:', typeof updatedBattle.creator.id);
        console.log('Debug: IDs equal?', currentUserId === updatedBattle.creator.id);
        console.log('Debug: isCreator:', isCreator);
        
        // Создатель записывает первым, оппонент ждет
        setCurrentPhase('user1_turn');
        setCurrentTurn('user1');
      } else {
        setCurrentPhase('waiting');
        setCurrentBattle(null);
        // Перезагружаем приглашения чтобы убрать обработанное
        loadPendingInvitations();
      }
      loadUserBattles();
    } catch (err: any) {
      setError(err.message || 'Не удалось ответить на приглашение');
    } finally {
      setLoading(false);
    }
  };

  const handleBeatUpload = async (file: File) => {
    if (file.type.startsWith('audio/')) {
      setBeatFile(file);
      const url = URL.createObjectURL(file);
      setBeatUrl(url);
      
      if (beatAudioRef.current) {
        beatAudioRef.current.src = url;
      }
    }
  };

  const toggleBeatPlayback = async () => {
    const currentBeatUrl = beatUrl || currentBattle?.beatUrl;
    console.log('Debug: toggleBeatPlayback - currentBeatUrl:', currentBeatUrl);
    console.log('Debug: toggleBeatPlayback - beatUrl:', beatUrl);
    console.log('Debug: toggleBeatPlayback - currentBattle.beatUrl:', currentBattle?.beatUrl);
    
    if (!beatAudioRef.current || !currentBeatUrl) {
      console.log('Debug: No beat URL or audio element');
      return;
    }
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      if (isPlayingBeat) {
        beatAudioRef.current.pause();
        setIsPlayingBeat(false);
      } else {
        await beatAudioRef.current.play();
        setIsPlayingBeat(true);
        
        beatAudioRef.current.onended = () => {
          setIsPlayingBeat(false);
        };
      }
    } catch (err) {
      console.error('Error playing beat:', err);
    }
  };

  const startRecording = async () => {
    try {
      // Настраиваем аудио ограничения в зависимости от качества
      const audioConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: recordingQuality === 'high' ? 48000 : recordingQuality === 'medium' ? 44100 : 22050,
        channelCount: recordingQuality === 'high' ? 2 : 1
      };
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints
      });
      streamRef.current = stream;
      
      // Запускаем бит для записи
      const currentBeatUrl = beatUrl || currentBattle?.beatUrl;
      if (beatAudioRef.current && currentBeatUrl) {
        beatAudioRef.current.currentTime = 0;
        beatAudioRef.current.loop = true;
        await beatAudioRef.current.play();
        setIsPlayingBeat(true);
      }
      
      // Используем webm формат - лучше поддерживается HTML5 audio
      const mimeType = 'audio/webm;codecs=opus';
      const fileExtension = 'webm';
      
      console.log('Debug: Using mimeType:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: recordingQuality === 'high' ? 128000 : recordingQuality === 'medium' ? 96000 : 64000
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Останавливаем бит
        if (beatAudioRef.current) {
          beatAudioRef.current.pause();
          beatAudioRef.current.currentTime = 0;
          beatAudioRef.current.loop = false;
          setIsPlayingBeat(false);
        }
        
        const voiceBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const voiceUrl = URL.createObjectURL(voiceBlob);
        
        setRecordedVoice(voiceUrl);
        
        // Сохраняем запись на сервер
        if (currentBattle) {
          try {
            // Преобразуем Blob в File с правильным расширением
            const voiceFile = new File([voiceBlob], `recording-${Date.now()}.${fileExtension}`, { type: mimeType });
            const recording = await saveBattleRecording(
              currentBattle.id,
              voiceFile,
              currentBattle.beatUrl || '',
              recordingTime,
              recordingQuality
            );
            
            console.log('Debug: Recording saved:', recording);
            console.log('Debug: Recording voiceUrl:', recording.voiceUrl);
            console.log('Debug: Recording beatUrl:', recording.beatUrl);
            
            // Определяем чей был ход и передаем ход следующему
            const userRole = getCurrentUserRole();
            console.log('Debug: User role for recording:', userRole);
            
            if (userRole === 'CREATOR') {
              // Создатель записал, передаем ход оппоненту
              setUser1Recording(recording);
              console.log('Debug: Set user1Recording:', recording);
              setCurrentPhase('user2_turn');
              
              // Обновляем статус баттла на сервере
              await updateBattleStatus(currentBattle.id, 'USER2_TURN');
              
              // Принудительно обновляем данные баттла для мгновенного обновления
              setTimeout(() => {
                checkBattleStatus();
              }, 500);
            } else if (userRole === 'OPPONENT') {
              // Оппонент записал, переходим к взаимной оценке
              setUser2Recording(recording);
              console.log('Debug: Set user2Recording:', recording);
              setCurrentPhase('mutual_judging');
              
              // Обновляем статус баттла на сервере
              await updateBattleStatus(currentBattle.id, 'JUDGING');
              
              // Принудительно обновляем данные баттла для мгновенного обновления
              setTimeout(() => {
                checkBattleStatus();
              }, 500);
            }
          } catch (err: any) {
            setError(err.message || 'Не удалось сохранить запись');
          }
        }
      };
      
      mediaRecorder.start(100); // Собираем данные каждые 100мс
      setIsRecording(true);
      setRecordingTime(0);
      
      // Таймер записи
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= RECORDING_TIME_LIMIT) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Не удалось получить доступ к микрофону. Убедитесь, что вы разрешили доступ.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Debug: Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Останавливаем таймер
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        console.log('Debug: Timer stopped');
      }
      
      // Сбрасываем время записи
      setRecordingTime(0);
      console.log('Debug: Recording time reset');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const loadBattleRecordings = async () => {
    if (!currentBattle) return;
    
    setIsLoadingRecordings(true);
    try {
      console.log('Debug: Loading battle recordings...');
      const recordings = await getBattleRecordings(currentBattle.id);
      console.log('Debug: Loaded recordings:', recordings);
      
      // Определяем какая запись принадлежит какому пользователю
      recordings.forEach(recording => {
        if (recording.userId === currentBattle.creator.id) {
          setUser1Recording(recording);
          console.log('Debug: Set user1Recording from server:', recording);
        } else {
          setUser2Recording(recording);
          console.log('Debug: Set user2Recording from server:', recording);
        }
      });
    } catch (err: any) {
      console.error('Debug: Error loading recordings:', err);
      setError(err.message || 'Не удалось загрузить записи');
    } finally {
      setIsLoadingRecordings(false);
    }
  };

  const handleRatingSubmit = async (rating: number) => {
    const userRole = getCurrentUserRole();
    if (!userRole || !currentBattle) return;
    
    try {
      // Сохраняем оценку пользователя
      if (userRole === 'CREATOR') {
        setUser1Rating(rating);
      } else {
        setUser2Rating(rating);
      }
      
      setHasRated(true);
      
      // Обновляем статус баттла чтобы показать что оценка сделана
      // Здесь можно добавить API вызов для сохранения оценки на сервере
      console.log('Debug: User rated opponent:', rating);
      
      // Переключаемся на ожидание оценки оппонента
      setCurrentPhase('waiting_for_opponent_rating');
      
      // Имитируем получение оценки от оппонента (в реальном приложении это будет через WebSocket или polling)
      setTimeout(() => {
        setOpponentHasRated(true);
        setCurrentPhase('mutual_judging');
      }, 3000); // 3 секунды для демонстрации
      
    } catch (err: any) {
      setError(err.message || 'Не удалось сохранить оценку');
    }
  };

  const startNewBattle = () => {
    setCurrentPhase('waiting');
    setCurrentBattle(null);
    setSelectedOpponent(null);
    setBattleTitle('');
    setBattleDescription('');
    setBeatFile(null);
    setBeatUrl('');
    setUser1Recording(null);
    setUser2Recording(null);
    setRecordedVoice('');
    setCurrentTurn('user1');
    setRecordingTime(0);
    setJudgeResult(null);
    setError('');
  };

  // Периодическая проверка приглашений и статуса баттла
  useEffect(() => {
    if (currentPhase === 'waiting') {
      loadPendingInvitations();
      // Проверяем приглашения каждые 5 секунд
      const interval = setInterval(() => {
        loadPendingInvitations();
      }, 5000);
      
      return () => clearInterval(interval);
    } else if (currentPhase === 'waiting_for_opponent') {
      // Создатель ждет оппонента - проверяем статус каждые 1.5 секунды
      const interval = setInterval(() => {
        checkBattleStatus();
      }, 1500);
      
      return () => clearInterval(interval);
    } else if (currentPhase === 'user1_turn' || currentPhase === 'user2_turn') {
      // Во время записи - проверяем статус каждую секунду для мгновенных обновлений
      const interval = setInterval(() => {
        checkBattleStatus();
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [currentPhase]);

  // Обновляем audio элемент когда бит меняется
  useEffect(() => {
    if (beatAudioRef.current) {
      const currentBeatUrl = beatUrl || currentBattle?.beatUrl;
      console.log('Debug: Updating audio element with beat URL:', currentBeatUrl);
      beatAudioRef.current.src = currentBeatUrl || '';
      beatAudioRef.current.load(); // Перезагружаем элемент
    }
  }, [beatUrl, currentBattle?.beatUrl]);

  // Загружаем записи при входе в фазу оценки
  useEffect(() => {
    if (currentPhase === 'mutual_judging' && currentBattle) {
      loadBattleRecordings();
    }
  }, [currentPhase, currentBattle?.id]);

  // Очистка
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // ==================== UI РЕНДЕРЫ ====================
  
  const renderWaitingPhase = () => (
    <div className="text-center py-12">
      <Users className="w-16 h-16 mx-auto mb-4 text-purple-400" />
      <h2 className="text-2xl font-bold mb-4">Рэп Баттл</h2>
      <p className="text-gray-400 mb-8">Создай баттл с реальным пользователем</p>
      
      <div className="max-w-md mx-auto">
        <button
          onClick={() => setCurrentPhase('creating')}
          className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg flex items-center justify-center gap-2 text-white font-semibold transition-all"
        >
          <Sparkles className="w-5 h-5" />
          Создать новый баттл
        </button>
        
        <button
          onClick={() => setCurrentPhase('history')}
          className="w-full mt-3 p-4 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center gap-2 text-white font-semibold transition-all"
        >
          <Trophy className="w-5 h-5" />
          История баттлов
        </button>
      </div>
    </div>
  );

  const renderCreatingPhase = () => (
    <div className="text-center py-12">
      <Sparkles className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
      <h2 className="text-2xl font-bold mb-4">Создание баттла</h2>
      <p className="text-gray-400 mb-8">Сначала выбери бит, потом оппонента</p>
      
      <div className="max-w-md mx-auto space-y-6">
        {/* Название баттла */}
        <div>
          <label className="block text-left text-sm font-medium mb-2">Название баттла</label>
          <input
            type="text"
            value={battleTitle}
            onChange={(e) => setBattleTitle(e.target.value)}
            placeholder="Эпичный баттл..."
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
          />
        </div>
        
        {/* Описание */}
        <div>
          <label className="block text-left text-sm font-medium mb-2">Описание (необязательно)</label>
          <textarea
            value={battleDescription}
            onChange={(e) => setBattleDescription(e.target.value)}
            placeholder="Опиши условия баттла..."
            rows={3}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 resize-none"
          />
        </div>
        
        {/* Выбор бита */}
        <div>
          <label className="block text-left text-sm font-medium mb-2">Выбор бита</label>
          <label className="block">
            <div className="border-2 border-dashed border-white/30 rounded-xl p-6 hover:border-purple-400/50 transition-colors cursor-pointer">
              <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p className="text-sm text-center">Нажми для загрузки или перетащи файл</p>
              <p className="text-xs text-gray-500 mt-2 text-center">MP3, WAV до 10MB</p>
            </div>
            <input
              type="file"
              accept="audio/mp3,audio/wav,audio/mpeg"
              onChange={(e) => e.target.files?.[0] && handleBeatUpload(e.target.files[0])}
              className="hidden"
            />
          </label>
          
          {beatFile && (
            <div className="mt-3 p-3 bg-white/10 rounded-lg">
              <p className="font-medium text-sm mb-2">{beatFile.name}</p>
              <button
                onClick={toggleBeatPlayback}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center gap-2 mb-2 text-sm"
              >
                {isPlayingBeat ? <Pause size={14} /> : <Play size={14} />}
                {isPlayingBeat ? 'Пауза' : 'Прослушать бит'}
              </button>
            </div>
          )}
        </div>
        
        {/* Выбор оппонента */}
        <div>
          <label className="block text-left text-sm font-medium mb-2">Выбери оппонента</label>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {availableUsers.length === 0 ? (
              <p className="text-gray-400 text-center py-4">Доступные пользователи загружаются...</p>
            ) : (
              availableUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedOpponent(user)}
                  className={`w-full p-3 rounded-lg flex items-center justify-between transition-all ${
                    selectedOpponent?.id === user.id
                      ? 'bg-purple-600/30 border border-purple-500'
                      : 'bg-white/10 hover:bg-white/20 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="font-medium">{user.username}</span>
                      <div className="text-xs text-gray-400">
                        Баттлов: {user._count.createdBattles + user._count.battleParticipants}
                      </div>
                    </div>
                  </div>
                  {selectedOpponent?.id === user.id && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
        
        {error && (
          <div className="p-3 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {/* Кнопки действий */}
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentPhase('waiting')}
            className="flex-1 p-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={createNewBattle}
            disabled={!selectedOpponent || !battleTitle || !beatFile || loading}
            className="flex-1 p-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Создание...' : 'Создать баттл'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderInvitingPhase = () => {
    if (!currentBattle) return null;
    
    const opponent = currentBattle.participants.find(p => p.role === 'OPPONENT')?.user;
    
    // Эта функция теперь только для оппонентов - приглашение в баттл
    return (
      <div className="text-center py-12">
        <div className="animate-pulse">
          <Send className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-2xl font-bold mb-4">Приглашение в баттл!</h2>
          <p className="text-gray-400 mb-8">
            {currentBattle.creator.username} приглашает тебя на баттл!
          </p>
        </div>
      
        {/* Детали баттла */}
        <div className="max-w-md mx-auto mb-8 p-6 bg-white/10 rounded-xl border border-white/20">
          <h3 className="text-xl font-bold mb-2">{currentBattle.title}</h3>
          {currentBattle.description && (
            <p className="text-gray-400 mb-4">{currentBattle.description}</p>
          )}
          
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {currentBattle.creator.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span>{currentBattle.creator.username}</span>
            </div>
            <span className="text-gray-400">VS</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {opponent?.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span>{opponent?.username}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => handleBattleInvitation(false)}
            disabled={loading}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4 inline mr-2" />
            Отклонить
          </button>
          <button
            onClick={() => handleBattleInvitation(true)}
            disabled={loading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4 inline mr-2" />
            Принять
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  };

  const renderWaitingForOpponentPhase = () => {
    if (!currentBattle) return null;
    
    const opponent = currentBattle.participants.find(p => p.role === 'OPPONENT')?.user;
    
    // Экран для создателя - ожидание оппонента
    return (
      <div className="text-center py-12">
        <div className="animate-pulse">
          <Clock className="w-16 h-16 mx-auto mb-4 text-blue-400" />
          <h2 className="text-2xl font-bold mb-4">Ожидание оппонента</h2>
          <p className="text-gray-400 mb-8">
            Приглашение отправлено {opponent?.username}. Ожидаем ответа...
          </p>
        </div>
        
        {/* Детали баттла */}
        <div className="max-w-md mx-auto mb-8 p-6 bg-white/10 rounded-xl border border-white/20">
          <h3 className="text-xl font-bold mb-2">{currentBattle.title}</h3>
          {currentBattle.description && (
            <p className="text-gray-400 mb-4">{currentBattle.description}</p>
          )}
          
          <div className="flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {currentBattle.creator.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span>{currentBattle.creator.username}</span>
            </div>
            <span className="text-gray-400">VS</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {opponent?.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span>{opponent?.username}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            setCurrentBattle(null);
            setCurrentPhase('waiting');
            loadPendingInvitations();
          }}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium transition-colors"
        >
          Отменить приглашение
        </button>
      </div>
    );
  };

  const renderBattlePhase = () => {
    const canRecord = canCurrentUserRecord();
    const creator = currentBattle?.creator;
    const opponent = currentBattle?.participants.find(p => p.role === 'OPPONENT')?.user;
    
    return (
      <div className="py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">🎤 Баттл начался!</h2>
          <p className="text-gray-400 text-lg">
            Ход: <span className="text-purple-400 font-semibold">
              {currentPhase === 'user1_turn' ? creator?.username : opponent?.username}
            </span>
          </p>
          {canRecord ? (
            <p className="text-green-400 font-semibold mt-2">🎤 Ваша очередь записывать!</p>
          ) : (
            <p className="text-orange-400 font-semibold mt-2">⏳ Ожидайте хода оппонента...</p>
          )}
        </div>

      <div className="max-w-2xl mx-auto">
        {/* Информация о бите */}
        {(beatUrl || currentBattle?.beatUrl) && (
          <div className="mb-6 p-4 bg-white/10 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Disc className={`w-5 h-5 ${isPlayingBeat ? 'text-green-400 animate-spin' : 'text-purple-400'}`} />
                <span className="font-medium">{beatFile?.name || currentBattle?.beatName || 'Бит'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRecordingSettings(!showRecordingSettings)}
                  className="px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors text-sm"
                >
                  ⚙️ Настройки
                </button>
                <button
                  onClick={toggleBeatPlayback}
                  className="px-3 py-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  {isPlayingBeat ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
            </div>
            
            {/* Настройки записи */}
            {showRecordingSettings && (
              <div className="mt-3 p-3 bg-white/5 rounded-lg space-y-3">
                <h4 className="text-sm font-semibold text-gray-300">Качество записи</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setRecordingQuality('low')}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      recordingQuality === 'low' 
                        ? 'bg-red-600/50 border border-red-500' 
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    📱 Низкое
                    <div className="text-xs text-gray-400">22kHz, 64kbps</div>
                  </button>
                  <button
                    onClick={() => setRecordingQuality('medium')}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      recordingQuality === 'medium' 
                        ? 'bg-yellow-600/50 border border-yellow-500' 
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    🎵 Среднее
                    <div className="text-xs text-gray-400">44kHz, 96kbps</div>
                  </button>
                  <button
                    onClick={() => setRecordingQuality('high')}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      recordingQuality === 'high' 
                        ? 'bg-green-600/50 border border-green-500' 
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    🎧 Высокое
                    <div className="text-xs text-gray-400">48kHz, 128kbps</div>
                  </button>
                </div>
                
                <div className="text-xs text-gray-400 bg-white/5 p-2 rounded">
                  💡 Высокое качество использует больше памяти, но обеспечивает лучшее звучание
                </div>
              </div>
            )}
            
            <audio 
              ref={beatAudioRef} 
              src={beatUrl || currentBattle?.beatUrl}
              preload="auto"
              className="hidden"
            />
          </div>
        )}

        {/* Таймер и визуализация */}
        <div className="text-center mb-8">
          <div className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {Math.floor(RECORDING_TIME_LIMIT - recordingTime)}s
          </div>
          
          <div className="w-full bg-white/10 rounded-full h-3 mb-6 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-1000 ${
                recordingTime > RECORDING_TIME_LIMIT * 0.7 
                  ? 'bg-gradient-to-r from-red-500 to-red-600' 
                  : recordingTime > RECORDING_TIME_LIMIT * 0.4
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
              }`}
              style={{ width: `${(recordingTime / RECORDING_TIME_LIMIT) * 100}%` }}
            />
          </div>

          <AudioVisualizer isActive={isRecording} />
        </div>

        {/* Кнопка записи */}
        <div className="text-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={(!beatUrl && !currentBattle?.beatUrl) || !canRecord}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
              isRecording 
                ? 'bg-red-600 animate-pulse shadow-lg shadow-red-600/50 scale-110' 
                : (beatUrl || currentBattle?.beatUrl) && canRecord
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-600/30'
                  : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {isRecording ? (
              <MicOff size={36} className="animate-bounce" />
            ) : (
              <Mic size={36} />
            )}
          </button>

          <p className="mt-4 text-gray-400">
            {isRecording ? (
              <span className="text-red-400 font-semibold">🎵 Запись под бит...</span>
            ) : (beatUrl || currentBattle?.beatUrl) && canRecord ? (
              <span className="text-green-400">Нажми для начала записи</span>
            ) : (beatUrl || currentBattle?.beatUrl) ? (
              <span className="text-orange-400">⏳ Ожидайте вашей очереди...</span>
            ) : (
              <span className="text-yellow-400">Сначала загрузите бит</span>
            )}
          </p>
        </div>

        {/* Записанные треки */}
        {(user1Recording || user2Recording) && (
          <div className="mt-12 space-y-6">
            <h3 className="text-xl font-bold text-center mb-4">📼 Записанные треки</h3>
            
            {user1Recording && (
              <div className="p-5 bg-white/10 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                      🎤
                    </div>
                    <div>
                      <span className="font-bold text-lg">{user1Recording.user.username}</span>
                      <p className="text-xs text-green-400">Трек с битом</p>
                    </div>
                  </div>
                </div>
                <MixedTrackPlayer 
                  voiceUrl={user1Recording.voiceUrl} 
                  beatUrl={user1Recording.beatUrl} 
                  label={`${user1Recording.user.username} - баттл трек`}
                />
              </div>
            )}
            
            {user2Recording && (
              <div className="p-5 bg-white/10 rounded-xl border border-pink-500/20 hover:border-pink-500/40 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center">
                      🎤
                    </div>
                    <div>
                      <span className="font-bold text-lg">{user2Recording.user.username}</span>
                      <p className="text-xs text-green-400">Трек с битом</p>
                    </div>
                  </div>
                </div>
                <MixedTrackPlayer 
                  voiceUrl={user2Recording.voiceUrl} 
                  beatUrl={user2Recording.beatUrl} 
                  label={`${user2Recording.user.username} - баттл трек`}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    );
  };

  const renderMutualJudgingPhase = () => {
    const userRole = getCurrentUserRole();
    const opponentRecording = userRole === 'CREATOR' ? user2Recording : user1Recording;
    const myRecording = userRole === 'CREATOR' ? user1Recording : user2Recording;
    
    console.log('Debug: renderMutualJudgingPhase - userRole:', userRole);
    console.log('Debug: renderMutualJudgingPhase - opponentRecording:', opponentRecording);
    console.log('Debug: renderMutualJudgingPhase - myRecording:', myRecording);
    console.log('Debug: renderMutualJudgingPhase - hasRated:', hasRated);
    console.log('Debug: renderMutualJudgingPhase - user1Recording:', user1Recording);
    console.log('Debug: renderMutualJudgingPhase - user2Recording:', user2Recording);
    
    if (!hasRated && opponentRecording) {
      // Показываем интерфейс оценки
      return (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-2xl font-bold mb-4">Оцените трек оппонента</h2>
          <p className="text-gray-400 mb-8">Прослушайте трек и поставьте оценку</p>
          
          {/* Плеер с треком оппонента */}
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Трек оппонента</h3>
              <MixedTrackPlayer 
                voiceUrl={opponentRecording.voiceUrl} 
                beatUrl={opponentRecording.beatUrl} 
                label="Трек оппонента" 
              />
            </div>
          </div>
          
          {/* Система оценки */}
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold mb-4">Ваша оценка</h3>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleRatingSubmit(rating)}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-yellow-400/20 transition-colors flex items-center justify-center"
                >
                  <span className="text-2xl">⭐</span>
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-400">Нажмите на звезды для оценки</p>
          </div>
        </div>
      );
    } else if (hasRated && !opponentHasRated) {
      // Ждем оценки от оппонента
      return (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 mx-auto mb-4 text-orange-400 animate-pulse" />
          <h2 className="text-2xl font-bold mb-4">Ожидайте оценки оппонента</h2>
          <p className="text-gray-400 mb-8">Вы оценили трек, теперь ждем оценки от оппонента...</p>
          
          <div className="max-w-md mx-auto">
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Ваша оценка</h3>
              <div className="flex justify-center">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <span key={rating} className="text-2xl">
                    {rating <= (userRole === 'CREATOR' ? (user1Rating || 0) : (user2Rating || 0)) ? '⭐' : '☆'}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    } else if (hasRated && opponentHasRated) {
      // Показываем результаты
      return (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h2 className="text-2xl font-bold mb-4">Результаты баттла</h2>
          <p className="text-gray-400 mb-8">Оба участника оценили треки друг друга</p>
          
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Оценки</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ваша оценка оппоненту:</span>
                  <span>{userRole === 'CREATOR' ? (user1Rating || 0) : (user2Rating || 0)} ⭐</span>
                </div>
                <div className="flex justify-between">
                  <span>Оценка оппонента вам:</span>
                  <span>{userRole === 'CREATOR' ? (user2Rating || 0) : (user1Rating || 0)} ⭐</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Победитель</h3>
              <p className="text-xl font-bold">
                {((userRole === 'CREATOR' ? (user1Rating || 0) : (user2Rating || 0)) > (userRole === 'CREATOR' ? (user2Rating || 0) : (user1Rating || 0))) 
                  ? 'Вы победили! 🎉' 
                  : ((userRole === 'CREATOR' ? (user1Rating || 0) : (user2Rating || 0)) < (userRole === 'CREATOR' ? (user2Rating || 0) : (user1Rating || 0)))
                  ? 'Оппонент победил'
                  : 'Ничья! 🤝'
                }
              </p>
            </div>
            
            <button
              onClick={() => setCurrentPhase('finished')}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium transition-all"
            >
              Завершить баттл
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="text-center py-12">
        {isLoadingRecordings ? (
          <div>
            <div className="w-16 h-16 mx-auto border-4 border-purple-400 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 mb-2">Загрузка записей...</p>
            <div className="w-48 mx-auto bg-white/10 rounded-full h-2">
              <div className="bg-purple-400 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">60%</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-400">Загрузка...</p>
            <button 
              onClick={loadBattleRecordings}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm"
            >
              Загрузить записи
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderWaitingForOpponentRatingPhase = () => {
    const userRole = getCurrentUserRole();
    
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 mx-auto mb-4 text-orange-400 animate-pulse" />
        <h2 className="text-2xl font-bold mb-4">Ожидайте оценки оппонента</h2>
        <p className="text-gray-400 mb-8">Вы оценили трек, теперь ждем оценки от оппонента...</p>
        
        <div className="max-w-md mx-auto">
          <div className="bg-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Ваша оценка</h3>
            <div className="flex justify-center">
              {[1, 2, 3, 4, 5].map((rating) => (
                <span key={rating} className="text-2xl">
                  {rating <= (userRole === 'CREATOR' ? (user1Rating || 0) : (user2Rating || 0)) ? '⭐' : '☆'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFinishedPhase = () => {
    if (!judgeResult || !currentBattle) return null;

    const { winner, user1Total, user2Total } = judgeResult;
    const user1 = currentBattle.participants.find(p => p.role === 'CREATOR')?.user;
    const user2 = currentBattle.participants.find(p => p.role === 'OPPONENT')?.user;

    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
        <h2 className="text-3xl font-bold mb-4">Баттл окончен!</h2>
        
        <div className="max-w-md mx-auto mb-8">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${winner === 'USER1' ? 'bg-green-600/30' : 'bg-white/10'}`}>
              <h3 className="font-bold">{user1?.username}</h3>
              <p className="text-2xl font-bold">{user1Total}</p>
              <p className="text-sm text-gray-400">очков</p>
            </div>
            <div className={`p-4 rounded-lg ${winner === 'USER2' ? 'bg-green-600/30' : 'bg-white/10'}`}>
              <h3 className="font-bold">{user2?.username}</h3>
              <p className="text-2xl font-bold">{user2Total}</p>
              <p className="text-sm text-gray-400">очков</p>
            </div>
          </div>
          
          <div className="text-2xl font-bold mb-4">
            {winner === 'DRAW' ? 'Ничья!' : 
             winner === 'USER1' ? `${user1?.username} победил!` : 
             `${user2?.username} победил!`}
          </div>
          
          {judgeResult.judge?.feedback && (
            <div className="p-4 bg-white/5 rounded-lg text-left">
              <h4 className="font-semibold mb-2">🤖 AI Анализ:</h4>
              <p className="text-sm text-gray-300">{judgeResult.judge.feedback}</p>
              <div className="mt-2 text-xs text-gray-400">
                Уверенность: {Math.round((judgeResult.judge.confidence || 0) * 100)}%
              </div>
            </div>
          )}
        </div>

        <button
          onClick={startNewBattle}
          className="px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
        >
          Новый баттл
        </button>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">История баттлов</h2>
        <button
          onClick={() => setCurrentPhase('waiting')}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
        >
          Назад
        </button>
      </div>
      
      {userBattles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Пока нет завершенных баттлов</p>
        </div>
      ) : (
        <div className="space-y-4">
          {userBattles.map(battle => {
            const user1 = battle.participants.find(p => p.role === 'CREATOR')?.user;
            const user2 = battle.participants.find(p => p.role === 'OPPONENT')?.user;
            
            return (
              <div key={battle.id} className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{user1?.username}</span>
                    <span className="text-gray-400">vs</span>
                    <span className="font-semibold">{user2?.username}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(battle.createdAt).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="text-center mb-4">
                  <span className="text-lg font-bold">{battle.title}</span>
                  <div className="text-sm text-gray-400">
                    Статус: {battle.status === 'FINISHED' ? 'Завершен' : battle.status === 'JUDGING' ? 'На судействе' : 'В процессе'}
                  </div>
                </div>
                
                {battle.winner && (
                  <div className="text-center font-semibold mb-4">
                    {battle.winner === 'DRAW' ? 'Ничья' : 
                     battle.winner === 'USER1' ? user1?.username : user2?.username} победил
                  </div>
                )}
                
                {battle.recordings.length > 0 && (
                  <div className="flex gap-2 justify-center">
                    {battle.recordings.map(recording => (
                      <MixedTrackPlayer 
                        key={recording.id}
                        voiceUrl={recording.voiceUrl} 
                        beatUrl={recording.beatUrl} 
                        label={recording.user.username}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-gradient-to-br from-[#0a0a1a] to-[#1a1a3e] text-white flex flex-col">
      {/* Хедер */}
      <div className="bg-black/40 backdrop-blur-sm border-b border-white/10 px-6 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            🎤 Рэп Баттл
          </h1>
          <div className="flex items-center gap-2">
            {currentBattle && (
              <div className="px-3 py-1 bg-white/10 rounded-lg text-sm">
                {currentBattle.title}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="m-4 p-3 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        
        {currentPhase === 'waiting' && renderWaitingPhase()}
        {currentPhase === 'creating' && renderCreatingPhase()}
        {currentPhase === 'inviting' && renderInvitingPhase()}
        {currentPhase === 'waiting_for_opponent' && renderWaitingForOpponentPhase()}
        
        {/* Отладочная информация */}
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 text-xs">
          Debug: currentPhase = {currentPhase}
        </div>
        {(currentPhase === 'user1_turn' || currentPhase === 'user2_turn') && renderBattlePhase()}
        {currentPhase === 'mutual_judging' && renderMutualJudgingPhase()}
        {currentPhase === 'waiting_for_opponent_rating' && renderWaitingForOpponentRatingPhase()}
        {currentPhase === 'finished' && renderFinishedPhase()}
        {currentPhase === 'history' && renderHistory()}
      </div>
    </div>
  );
}
