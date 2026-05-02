import { getAudioBuffer, registerAudioBuffer } from '../engine/audioClipPlayer';
import { useStudioStore } from '../store/useStudioStore';

/**
 * Отладочная функция для проверки аудио буферов
 */
export function debugAudioSystem() {
  console.log('🔍 === AUDIO SYSTEM DEBUG ===');
  
  const store = useStudioStore.getState();
  const audioClips = store.clips.filter(clip => clip.type === 'audio');
  
  console.log(`📊 Total clips: ${store.clips.length}`);
  console.log(`🎵 Audio clips: ${audioClips.length}`);
  
  audioClips.forEach((clip, index) => {
    const buffer = getAudioBuffer(clip.id);
    console.log(`${index + 1}. Clip "${clip.name}" (${clip.id})`);
    console.log(`   - Track: ${clip.trackId}`);
    console.log(`   - Start: ${clip.start} beats`);
    console.log(`   - Duration: ${clip.duration} beats`);
    console.log(`   - Pattern: ${clip.patternId || 'none'}`);
    console.log(`   - Buffer: ${buffer ? `✅ ${buffer.duration.toFixed(2)}s` : '❌ NONE'}`);
  });
  
  const clipsWithBuffers = audioClips.filter(clip => getAudioBuffer(clip.id));
  console.log(`📈 Clips with buffers: ${clipsWithBuffers.length}/${audioClips.length}`);
  
  if (clipsWithBuffers.length === 0 && audioClips.length > 0) {
    console.warn('⚠️ Audio clips exist but no buffers found!');
    console.log('💡 Try dragging audio files to timeline to create buffers');
  }
  
  console.log('🔍 === END DEBUG ===');
  
  return {
    totalClips: store.clips.length,
    audioClips: audioClips.length,
    clipsWithBuffers: clipsWithBuffers.length,
    isWorking: clipsWithBuffers.length === audioClips.length
  };
}

/**
 * Создает тестовый буфер для конкретного клипа
 */
export function createTestBufferForClip(clipId: string): boolean {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 2; // 2 секунды для теста
    const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    
    // Создаем простой тон 440Hz для левого канала и 880Hz для правого
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      const frequency = channel === 0 ? 440 : 880; // Left: 440Hz, Right: 880Hz
      
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
      }
    }
    
    // Регистрируем буфер
    registerAudioBuffer(clipId, buffer);
    
    console.log(`✅ Created test buffer for clip: ${clipId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create test buffer for ${clipId}:`, error);
    return false;
  }
}

/**
 * Глобальная функция для отладки (доступна в консоли)
 */
declare global {
  interface Window {
    debugAudio: () => any;
    createTestAudio: (clipId: string) => boolean;
  }
}

// Экспортируем функции для глобального доступа
if (typeof window !== 'undefined') {
  window.debugAudio = debugAudioSystem;
  window.createTestAudio = createTestBufferForClip;
  
  console.log('🔧 Audio debug functions available:');
  console.log('   - debugAudio() - Check audio system status');
  console.log('   - createTestAudio(clipId) - Create test buffer for clip');
}
