import { useStudioStore } from '../store/useStudioStore';
import { registerAudioBuffer } from '../engine/audioClipPlayer';
import { AudioLoader } from '../engine/audioLoader';
import { secondsToBeats } from '../engine/audioClipPlayer';

// Константы для расчета дорожек
export const TRACK_HEIGHT = 80;
export const HEADER_HEIGHT = 40;

/**
 * Определяет ID дорожки под курсором мыши
 */
export function getTrackAtY(y: number): string | undefined {
  const adjusted = y - HEADER_HEIGHT;
  if (adjusted < 0) return undefined;
  
  const index = Math.floor(adjusted / TRACK_HEIGHT);
  const tracks = useStudioStore.getState().tracks;
  return tracks[index]?.id;
}

/**
 * Определяет позицию в битах по координате X
 */
export function getBeatAtX(x: number, pixelsPerBeat: number): number {
  return x / pixelsPerBeat;
}

/**
 * Обрабатывает загруженный аудиофайл и создает клип
 */
export async function handleAudioFileDrop(
  file: File,
  clientX: number,
  clientY: number,
  timelineRef: HTMLElement | null,
  pixelsPerBeat: number
): Promise<void> {
  try {
    console.log(`🎵 Processing audio file: ${file.name}`);
    
    // Инициализируем загрузчик
    const loader = new AudioLoader();
    
    // Декодируем аудио
    const buffer = await loader.loadAudioFile(file);
    const durationSec = buffer.duration;
    
    console.log(`📊 Audio duration: ${durationSec.toFixed(2)}s`);
    
    // Получаем BPM и конвертируем длительность в биты
    const bpm = useStudioStore.getState().playback.bpm;
    const beats = secondsToBeats(durationSec, bpm);
    
    // Применяем snap к длительности
    const snapStrength = useStudioStore.getState().ui.snapStrength;
    const snappedBeats = Math.round(beats / snapStrength) * snapStrength;
    
    console.log(`🎵 Duration in beats: ${snappedBeats.toFixed(2)}`);
    
    // Определяем дорожку
    let targetTrackId: string | undefined;
    
    if (timelineRef) {
      const rect = timelineRef.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      targetTrackId = getTrackAtY(relativeY);
    }
    
    // Если дорожка не найдена, создаем новую
    if (!targetTrackId) {
      const store = useStudioStore.getState();
      const newTrack = {
        id: `track-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: 'audio' as const,
        color: '#14b8a6',
        muted: false,
        solo: false,
        volume: 0.8,
      };
      
      store.addTrack(newTrack);
      targetTrackId = newTrack.id;
      console.log(`🆕 Created new track: ${newTrack.name}`);
    }
    
    // Определяем стартовую позицию
    let startBeat = 0;
    if (timelineRef) {
      const rect = timelineRef.getBoundingClientRect();
      const relativeX = clientX - rect.left - 60; // Учитываем отступ для номеров тактов
      startBeat = getBeatAtX(relativeX, pixelsPerBeat);
      
      // Применяем snap к стартовой позиции
      startBeat = Math.round(startBeat / snapStrength) * snapStrength;
      startBeat = Math.max(0, startBeat); // Не отрицаем
    }
    
    console.log(`📍 Clip position: beat ${startBeat.toFixed(2)}`);
    
    // Создаем клип
    const store = useStudioStore.getState();
    const clipId = `clip-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const newClip = {
      id: clipId,
      trackId: targetTrackId,
      start: startBeat,
      duration: snappedBeats,
      type: 'audio' as const,
      name: file.name.replace(/\.[^/.]+$/, ''),
      color: '#f0b90b',
    };
    
    store.addClip(newClip);
    console.log(`✅ Created clip: ${newClip.name} on track ${targetTrackId}`);
    
    // Регистрируем аудио буфер для воспроизведения
    registerAudioBuffer(clipId, buffer);
    console.log(`🎵 Registered audio buffer for clip: ${clipId}`);
    
    console.log(`🎉 Successfully loaded and scheduled: ${file.name}`);
    
  } catch (error) {
    console.error('❌ Error processing audio file:', error);
    
    // Показываем ошибку пользователю (можно добавить в UI)
    if (error instanceof Error) {
      alert(`Failed to load audio file: ${error.message}`);
    } else {
      alert('Failed to load audio file: Unknown error');
    }
  }
}

/**
 * Проверяет, является ли файл аудио
 */
export function isAudioFile(file: File): boolean {
  return file.type.startsWith('audio/');
}

/**
 * Фильтрует массив файлов, оставляя только аудио
 */
export function filterAudioFiles(files: FileList): File[] {
  return Array.from(files).filter(isAudioFile);
}
