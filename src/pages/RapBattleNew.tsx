import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Play, Pause, Upload, Users, Trophy, Send, Volume2, Disc, UserCheck, Clock, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { getAvailableUsers, createBattle, getUserBattles, getBattleInvitations, respondToBattle, updateBattleBeat, saveBattleRecording, judgeBattle, User, Battle, BattleRecording } from '../api/battles';

// Компонент для воспроизведения голоса + бита с микшированием и контролем
const MixedTrackPlayer = ({ voiceUrl, beatUrl, label }: { voiceUrl: string; beatUrl: string; label: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string>('');
  const [showControls, setShowControls] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(0.8);
  const [beatVolume, setBeatVolume] = useState(0.4);
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [reverbAmount, setReverbAmount] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(1);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const voiceGainRef = useRef<GainNode | null>(null);
  const beatGainRef = useRef<GainNode | null>(null);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const audioBuffersRef = useRef<{ voice?: AudioBuffer; beat?: AudioBuffer }>({});
  const convolverRef = useRef<ConvolverNode | null>(null);
  const loadingRef = useRef(false);

  // Загрузка и подготовка аудио
  const prepareAudio = async () => {
    if (loadingRef.current || !voiceUrl || !beatUrl) return;
    
    loadingRef.current = true;
    setError('');
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      // Создаем gain node для контроля громкости
      const masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      masterGain.gain.value = masterVolume;
      gainNodeRef.current = masterGain;
      
      // Создаем individual gain nodes
      const voiceGainNode = audioContext.createGain();
      const beatGainNode = audioContext.createGain();
      voiceGainRef.current = voiceGainNode;
      beatGainRef.current = beatGainNode;
      
      // Создаем convolver для реверберации
      const convolver = audioContext.createConvolver();
      const convolverGain = audioContext.createGain();
      convolverGain.gain.value = 0;
      convolverRef.current = convolver;
      
      // Создаем импульсную характеристику для реверберации
      const impulseLength = audioContext.sampleRate * 2; // 2 секунды реверберации
      const impulse = audioContext.createBuffer(2, impulseLength, audioContext.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < impulseLength; i++) {
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
        }
      }
      convolver.buffer = impulse;
      
      // Подключаем реверберацию
      convolver.connect(convolverGain);
      convolverGain.connect(masterGain);
      
      // Загружаем оба аудио файла параллельно
      const [voiceResponse, beatResponse] = await Promise.all([
        fetch(voiceUrl),
        fetch(beatUrl)
      ]);
      
      const [voiceArrayBuffer, beatArrayBuffer] = await Promise.all([
        voiceResponse.arrayBuffer(),
        beatResponse.arrayBuffer()
      ]);
      
      const [voiceBuffer, beatBuffer] = await Promise.all([
        audioContext.decodeAudioData(voiceArrayBuffer),
        audioContext.decodeAudioData(beatArrayBuffer)
      ]);
      
      audioBuffersRef.current = { voice: voiceBuffer, beat: beatBuffer };
      setIsLoaded(true);
      console.log('Audio prepared successfully', { 
        voiceDuration: voiceBuffer.duration, 
        beatDuration: beatBuffer.duration 
      });
    } catch (err) {
      console.error('Error loading audio:', err);
      setError('Ошибка загрузки аудио');
    } finally {
      loadingRef.current = false;
    }
  };

  // Загружаем аудио при изменении URL
  useEffect(() => {
    if (voiceUrl && beatUrl) {
      prepareAudio();
    }
    return () => {
      stopPlayback();
    };
  }, [voiceUrl, beatUrl]);

  const stopPlayback = () => {
    sourceNodesRef.current.forEach(source => {
      try {
        source.stop();
      } catch (e) {
        // Игнорируем ошибки остановки
      }
    });
    sourceNodesRef.current = [];
    setIsPlaying(false);
  };

  const togglePlayback = async () => {
    if (!audioContextRef.current || !audioBuffersRef.current.voice || !audioBuffersRef.current.beat) {
      setError('Аудио не загружено');
      return;
    }

    try {
      const ctx = audioContextRef.current;
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (isPlaying) {
        stopPlayback();
        return;
      }

      // Останавливаем предыдущее воспроизведение
      stopPlayback();

      // Создаем новые source nodes
      const voiceSource = ctx.createBufferSource();
      const beatSource = ctx.createBufferSource();
      
      voiceSource.buffer = audioBuffersRef.current.voice;
      beatSource.buffer = audioBuffersRef.current.beat;

      // Используем существующие gain nodes
      if (voiceGainRef.current && beatGainRef.current) {
        voiceGainRef.current.gain.value = voiceVolume;
        beatGainRef.current.gain.value = beatVolume;
        
        // Подключаем: source -> gain -> master
        voiceSource.connect(voiceGainRef.current);
        beatSource.connect(beatGainRef.current);
        
        // Подключаем к основному выходу и реверберации
        voiceGainRef.current.connect(gainNodeRef.current!);
        beatGainRef.current.connect(gainNodeRef.current!);
        
        // Добавляем реверберацию для голоса
        if (convolverRef.current && reverbAmount > 0) {
          const convolverGain = ctx.createGain();
          convolverGain.gain.value = reverbAmount;
          voiceGainRef.current.connect(convolverRef.current);
          convolverRef.current.connect(convolverGain);
          convolverGain.connect(gainNodeRef.current!);
        }
      }

      // Применяем обрезку для голоса
      const voiceBuffer = audioBuffersRef.current.voice!;
      const voiceDuration = voiceBuffer.duration * (trimEnd - trimStart);
      const voiceStartTime = voiceBuffer.duration * trimStart;
      
      // Запускаем синхронно с учетом обрезки
      const startTime = ctx.currentTime;
      voiceSource.start(startTime, voiceStartTime, voiceDuration);
      beatSource.start(startTime);

      // Зацикливаем бит, если он короче голоса
      if (audioBuffersRef.current.beat.duration < audioBuffersRef.current.voice.duration) {
        beatSource.loop = true;
        beatSource.loopEnd = audioBuffersRef.current.beat.duration;
        
        // Останавливаем бит когда голос заканчивается
        voiceSource.onended = () => {
          beatSource.stop();
          setIsPlaying(false);
        };
      } else {
        // Если бит длиннее, останавливаем оба когда голос заканчивается
        voiceSource.onended = () => {
          beatSource.stop();
          setIsPlaying(false);
        };
      }

      sourceNodesRef.current = [voiceSource, beatSource];
      setIsPlaying(true);

    } catch (err) {
      console.error('Error playing mixed audio:', err);
      setError('Ошибка воспроизведения');
      setIsPlaying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Основные элементы управления */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlayback}
          disabled={!isLoaded}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all ${
            isPlaying 
              ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30' 
              : isLoaded 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-600/30' 
                : 'bg-gray-600 cursor-not-allowed'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause size={14} />
              Пауза
            </>
          ) : (
            <>
              <Play size={14} />
              {isLoaded ? 'Слушать трек' : 'Загрузка...'}
            </>
          )}
        </button>
        
        <button
          onClick={() => setShowControls(!showControls)}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          <Volume2 size={14} />
          Настройки
        </button>
        
        <div className="flex items-center gap-2 text-sm">
          <Disc className={`w-4 h-4 ${isPlaying ? 'text-green-400 animate-spin' : 'text-gray-400'}`} />
          <span className="text-gray-300">{label}</span>
        </div>
        
        {error && (
          <span className="text-red-400 text-xs">{error}</span>
        )}
      </div>

      {/* Расширенные контролы */}
      {showControls && (
        <div className="bg-white/5 rounded-lg p-4 space-y-4 border border-white/10">
          {/* Громкость */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-300">Громкость</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-16">Голос</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={voiceVolume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVoiceVolume(newVolume);
                    if (voiceGainRef.current) {
                      voiceGainRef.current.gain.value = newVolume;
                    }
                  }}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-xs text-gray-400 w-12">{Math.round(voiceVolume * 100)}%</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-16">Бит</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={beatVolume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setBeatVolume(newVolume);
                    if (beatGainRef.current) {
                      beatGainRef.current.gain.value = newVolume;
                    }
                  }}
                  className="flex-1 accent-pink-500"
                />
                <span className="text-xs text-gray-400 w-12">{Math.round(beatVolume * 100)}%</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-16">Общая</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={masterVolume}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setMasterVolume(newVolume);
                    if (gainNodeRef.current) {
                      gainNodeRef.current.gain.value = newVolume;
                    }
                  }}
                  className="flex-1 accent-green-500"
                />
                <span className="text-xs text-gray-400 w-12">{Math.round(masterVolume * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Эффекты */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-300">Эффекты</h4>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-16">Реверб.</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={reverbAmount}
                onChange={(e) => setReverbAmount(parseFloat(e.target.value))}
                className="flex-1 accent-blue-500"
              />
              <span className="text-xs text-gray-400 w-12">{Math.round(reverbAmount * 100)}%</span>
            </div>
          </div>

          {/* Обрезка */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-300">Обрезка трека</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400">Начало</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={trimStart}
                  onChange={(e) => setTrimStart(parseFloat(e.target.value))}
                  className="w-full accent-yellow-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">Конец</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Math.max(trimStart + 0.1, parseFloat(e.target.value)))}
                  className="w-full accent-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Быстрые пресеты */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Быстрые пресеты</h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setVoiceVolume(0.9);
                  setBeatVolume(0.3);
                  setReverbAmount(0.1);
                }}
                className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded text-xs transition-colors"
              >
                🎤 Вокал
              </button>
              <button
                onClick={() => {
                  setVoiceVolume(0.6);
                  setBeatVolume(0.6);
                  setReverbAmount(0);
                }}
                className="px-2 py-1 bg-pink-600/30 hover:bg-pink-600/50 rounded text-xs transition-colors"
              >
                🎵 Баланс
              </button>
              <button
                onClick={() => {
                  setVoiceVolume(0.4);
                  setBeatVolume(0.8);
                  setReverbAmount(0.2);
                }}
                className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 rounded text-xs transition-colors"
              >
                🎧 Клуб
              </button>
            </div>
          </div>
        </div>
      )}
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
  // Основные состояния
  const [currentPhase, setCurrentPhase] = useState<'waiting' | 'creating' | 'selecting_beat_creation' | 'selecting_opponent' | 'inviting' | 'waiting_for_opponent' | 'selecting_beat' | 'waiting_for_beat' | 'user1_turn' | 'user2_turn' | 'judging' | 'finished' | 'history'>('waiting');
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
  
  // Записи текущего баттла
  const [user1Recording, setUser1Recording] = useState<BattleRecording | null>(null);
  const [user2Recording, setUser2Recording] = useState<BattleRecording | null>(null);
  
  // Настройки качества записи
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
        const currentUserId = localStorage.getItem('userId');
        const isCreator = String(updatedBattle.creator.id) === currentUserId;
        
        console.log('Debug: currentUserId:', currentUserId, 'type:', typeof currentUserId);
        console.log('Debug: creator.id:', updatedBattle.creator.id, 'type:', typeof updatedBattle.creator.id);
        console.log('Debug: IDs equal?', currentUserId === updatedBattle.creator.id);
        console.log('Debug: User is creator?', isCreator);
        
        if (updatedBattle.status === 'USER1_TURN') {
          setCurrentPhase('user1_turn');
        } else if (updatedBattle.status === 'USER2_TURN') {
          setCurrentPhase('user2_turn');
        } else if (updatedBattle.status === 'JUDGING') {
          setCurrentPhase('judging');
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
    if (!currentBattle) return null;
    
    const currentUserId = localStorage.getItem('userId');
    const isCreator = String(currentBattle.creator.id) === currentUserId;
    
    if (isCreator) return 'CREATOR';
    
    const opponent = currentBattle.participants.find(p => p.role === 'OPPONENT');
    if (opponent && String(opponent.user.id) === currentUserId) return 'OPPONENT';
    
    return null;
  };

  const canCurrentUserRecord = () => {
    const userRole = getCurrentUserRole();
    console.log('Debug: userRole:', userRole);
    console.log('Debug: currentTurn:', currentTurn);
    
    if (!userRole) return false;
    
    // user1 - это всегда создатель, user2 - оппонент
    const isUser1Turn = currentTurn === 'user1';
    console.log('Debug: isUser1Turn:', isUser1Turn);
    
    if (userRole === 'CREATOR') {
      const canRecord = isUser1Turn;
      console.log('Debug: CREATOR can record:', canRecord);
      return canRecord;
    } else if (userRole === 'OPPONENT') {
      const canRecord = !isUser1Turn;
      console.log('Debug: OPPONENT can record:', canRecord);
      return canRecord;
    }
    
    return false;
  };

  // ==================== ОБРАБОТЧИКИ ====================
  
  const createNewBattle = async () => {
    if (!selectedOpponent || !battleTitle || !beatFile || !beatUrl) {
      setError('Выберите оппонента, введите название баттла и загрузите бит');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const battle = await createBattle(battleTitle, battleDescription, selectedOpponent.id);
      setCurrentBattle(battle);
      
      // Сразу сохраняем бит в баттл
      await updateBattleBeat(battle.id, beatUrl, beatFile.name);
      
      // Обновляем баттл с битом
      const updatedBattle = { ...battle, beatUrl, beatName: beatFile.name, status: 'INVITING' as const };
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
        const currentUserId = localStorage.getItem('userId');
        const isCreator = String(updatedBattle.creator.id) === currentUserId;
        
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
    if (!beatAudioRef.current || !beatUrl) return;
    
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
    } catch (error) {
      console.error('Error playing beat:', error);
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
      if (beatAudioRef.current && beatUrl) {
        beatAudioRef.current.currentTime = 0;
        beatAudioRef.current.loop = true;
        await beatAudioRef.current.play();
        setIsPlayingBeat(true);
      }
      
      // Выбираем кодек в зависимости от качества
      const mimeType = recordingQuality === 'high' ? 'audio/webm;codecs=opus' : 'audio/webm';
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
            // Преобразуем Blob в File
            const voiceFile = new File([voiceBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
            const recording = await saveBattleRecording(
              currentBattle.id,
              voiceFile,
              beatUrl,
              recordingTime,
              recordingQuality
            );
            
            if (currentTurn === 'user1') {
              setUser1Recording(recording);
              setCurrentTurn('user2');
              setCurrentPhase('user2_turn');
            } else {
              setUser2Recording(recording);
              setCurrentPhase('judging');
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
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const performAIGudgment = async () => {
    if (!currentBattle) return;
    
    setLoading(true);
    try {
      const result = await judgeBattle(currentBattle.id);
      setJudgeResult(result);
      setCurrentPhase('finished');
      loadUserBattles();
    } catch (err: any) {
      setError(err.message || 'Не удалось выполнить судейство');
    } finally {
      setLoading(false);
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
    }
  }, [currentPhase]);

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
              {currentTurn === 'user1' ? creator?.username : opponent?.username}
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
        {beatUrl && (
          <div className="mb-6 p-4 bg-white/10 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Disc className={`w-5 h-5 ${isPlayingBeat ? 'text-green-400 animate-spin' : 'text-purple-400'}`} />
                <span className="font-medium">{beatFile?.name || 'Бит'}</span>
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
              src={beatUrl}
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
            disabled={!beatUrl || !canRecord}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
              isRecording 
                ? 'bg-red-600 animate-pulse shadow-lg shadow-red-600/50 scale-110' 
                : beatUrl && canRecord
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
            ) : beatUrl && canRecord ? (
              <span className="text-green-400">Нажми для начала записи</span>
            ) : beatUrl ? (
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

  const renderJudgingPhase = () => (
    <div className="text-center py-12">
      <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
      <h2 className="text-2xl font-bold mb-4">🔥 Судейство AI</h2>
      <p className="text-gray-400 mb-8">Искусственный интеллект оценивает выступления</p>
      
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <div className="w-16 h-16 mx-auto border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-400">Анализ выступлений...</p>
        </div>
        
        <button
          onClick={performAIGudgment}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Судейство...' : 'Оценить баттл'}
        </button>
      </div>
    </div>
  );

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
        {currentPhase === 'judging' && renderJudgingPhase()}
        {currentPhase === 'finished' && renderFinishedPhase()}
        {currentPhase === 'history' && renderHistory()}
      </div>
    </div>
  );
}
