import { getAudioBuffer, registerAudioBuffer } from '../engine/audioClipPlayer';
import { useStudioStore } from '../store/useStudioStore';

/**
 * Тестовая функция для проверки аудио буферов
 */
export function testAudioBuffers() {
  const store = useStudioStore.getState();
  const audioClips = store.clips.filter(clip => clip.type === 'audio');
  
  console.log(`🎵 Testing ${audioClips.length} audio clips:`);
  
  audioClips.forEach(clip => {
    const buffer = getAudioBuffer(clip.id);
    if (buffer) {
      console.log(`✅ Clip "${clip.name}" (${clip.id}): ${buffer.duration.toFixed(2)}s, ${buffer.sampleRate}Hz`);
    } else {
      console.log(`❌ Clip "${clip.name}" (${clip.id}): No buffer found`);
    }
  });
  
  const totalBuffers = audioClips.filter(clip => getAudioBuffer(clip.id)).length;
  console.log(`📊 Summary: ${totalBuffers}/${audioClips.length} clips have buffers`);
  
  return totalBuffers === audioClips.length;
}

/**
 * Создает тестовый аудио буфер для проверки
 */
export function createTestAudioBuffer(): AudioBuffer | null {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 1; // 1 секунда
    const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    
    // Создаем простой тон 440Hz
    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < channelData.length; i++) {
        channelData[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.3;
      }
    }
    
    console.log(`🎵 Created test audio buffer: ${duration}s, ${sampleRate}Hz`);
    return buffer;
  } catch (error) {
    console.error('Failed to create test audio buffer:', error);
    return null;
  }
}

/**
 * Регистрирует тестовый аудио буфер для клипа
 */
export function registerTestAudioBuffer(clipId: string): boolean {
  const buffer = createTestAudioBuffer();
  if (!buffer) return false;
  
  registerAudioBuffer(clipId, buffer);
  
  console.log(`✅ Registered test buffer for clip: ${clipId}`);
  return true;
}
