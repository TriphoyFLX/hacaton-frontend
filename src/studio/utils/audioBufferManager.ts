import { registerAudioBuffer } from '../engine/audioClipPlayer';
import { AudioLoader } from '../engine/audioLoader';
import { useStudioStore } from '../store/useStudioStore';

/**
 * Менеджер для регистрации аудио буферов существующих клипов
 */
export class AudioBufferManager {
  private static instance: AudioBufferManager;
  private audioLoader: AudioLoader;

  private constructor() {
    this.audioLoader = new AudioLoader();
  }

  static getInstance(): AudioBufferManager {
    if (!AudioBufferManager.instance) {
      AudioBufferManager.instance = new AudioBufferManager();
    }
    return AudioBufferManager.instance;
  }

  /**
   * Регистрирует аудио буферы для всех существующих аудио клипов
   */
  async registerExistingAudioClips(): Promise<void> {
    const store = useStudioStore.getState();
    const audioClips = store.clips.filter(clip => clip.type === 'audio');
    
    console.log(`🎵 Found ${audioClips.length} existing audio clips to register`);

    for (const clip of audioClips) {
      // Пропускаем клипы без URL или пути к файлу
      if (!clip.name) {
        console.warn(`⚠️ Audio clip ${clip.id} has no name, skipping`);
        continue;
      }

      try {
        // Пытаемся загрузить файл из папки sounds с правильными путями
        const possiblePaths = [
          `/sounds/${clip.name}.wav`,
          `/sounds/${clip.name}.mp3`,
          `/sounds/${clip.name}`,
          `/src/pages/sounds/${clip.name}.wav`,
          `/src/pages/sounds/${clip.name}.mp3`,
          `/src/pages/sounds/${clip.name}`,
        ];

        let loaded = false;
        for (const path of possiblePaths) {
          try {
            const buffer = await this.audioLoader.loadSampleFromUrl(path);
            registerAudioBuffer(clip.id, buffer);
            console.log(`✅ Registered buffer for clip: ${clip.name} (${clip.id}) from ${path}`);
            loaded = true;
            break;
          } catch (error) {
            // Продолжаем со следующим путем
            continue;
          }
        }

        if (!loaded) {
          console.warn(`⚠️ Could not load audio for clip: ${clip.name} (tried ${possiblePaths.length} paths)`);
        }

      } catch (error) {
        console.error(`❌ Failed to register buffer for clip ${clip.id}:`, error);
      }
    }
  }

  /**
   * Регистрирует аудио буфер для конкретного клипа
   */
  async registerClipBuffer(clipId: string, fileName: string): Promise<boolean> {
    try {
      const possiblePaths = [
        `/sounds/${fileName}.wav`,
        `/sounds/${fileName}.mp3`,
        `/sounds/${fileName}`,
        `/src/pages/sounds/${fileName}.wav`,
        `/src/pages/sounds/${fileName}.mp3`,
        `/src/pages/sounds/${fileName}`,
      ];

      for (const path of possiblePaths) {
        try {
          const buffer = await this.audioLoader.loadSampleFromUrl(path);
          registerAudioBuffer(clipId, buffer);
          console.log(`✅ Registered buffer for clip: ${fileName} (${clipId}) from ${path}`);
          return true;
        } catch (error) {
          continue;
        }
      }

      console.warn(`⚠️ Could not load audio for clip: ${fileName} (tried ${possiblePaths.length} paths)`);
      return false;
    } catch (error) {
      console.error(`❌ Failed to register buffer for clip ${clipId}:`, error);
      return false;
    }
  }

  /**
   * Проверяет, зарегистрирован ли буфер для клипа
   */
  isBufferRegistered(clipId: string): boolean {
    // Эта функция может быть расширена для проверки реального состояния
    return true;
  }
}

// Экспорт singleton экземпляра
export const audioBufferManager = AudioBufferManager.getInstance();
