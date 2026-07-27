export type AiTrackType = 'vocal' | 'instrumental';

export interface AiPromptEnhanceInput {
  genre: string;
  userTags: string;
  mood: string;
  energy: number;
  bpm: number;
  trackType: AiTrackType;
  voice: string;
  language: string;
  duration: string;
}

/** Core production directives — Suno understands English tags best. */
const LIVE_CORE =
  'studio master, live instruments, organic human performance, natural dynamics, warm analog mix, wide stereo depth, avoid robotic voice, avoid autotune, avoid TTS, avoid synthetic flat MIDI';

const VOCAL_LIVE =
  'expressive human singer, natural vocal timbre, emotional phrasing, subtle vibrato, breath control, no vocoder, no robot voice';

const INSTRUMENTAL_ORCHESTRA =
  'full symphony orchestra, live strings, brass section, woodwinds, timpani, concert hall reverb, cinematic orchestral arrangement, rich harmonic layers';

const GENRE_LAYERS: Record<string, string> = {
  'Джаз': 'live jazz ensemble, upright bass, real drum kit, acoustic piano, horn section, smoky club atmosphere, tape warmth',
  'Поп': 'live band pop, real drums, bass guitar, acoustic and electric layers, polished radio mix, catchy hook, humanized groove',
  'Рок': 'live rock band, amplified guitars, real drum kit, dynamic room sound, powerful human vocals, raw energy',
  'Хип-хоп': 'live drum breaks, deep sub bass, sampled vinyl texture, natural rap flow, human voice without heavy autotune',
  'Электроника': 'hybrid electronic, organic textures, live percussion layers, analog synth warmth, humanized rhythm, not sterile',
  'Ло-фай': 'lo-fi live feel, vinyl warmth, Rhodes piano, brushed drums, intimate room recording, soft tape saturation',
  'Акустика': 'intimate acoustic session, fingerpicked guitar, felt piano, close-mic recording, room ambience, singer-songwriter live',
  'Саундтрек': 'epic cinematic score, orchestral swells, emotional crescendo, film-quality production, live ensemble',
  'Классика': 'classical symphony, chamber orchestra, virtuoso soloists, concert hall acoustics, nuanced phrasing, live performance',
  'Симфония': 'grand symphony orchestra, symphonic poem, lush string tutti, heroic brass, woodwind countermelodies, timpani rolls, live hall recording',
};

const MOOD_LAYERS: Record<string, string> = {
  'Тёплое': 'warm and intimate',
  'Эйфоричное': 'uplifting and radiant',
  'Меланхоличное': 'melancholic and tender',
  'Эпичное': 'epic and triumphant',
  'Мрачное': 'dark and dramatic',
  'Романтичное': 'romantic and lyrical',
  'Уютное': 'cozy and soft',
};

const DURATION_HINT: Record<string, string> = {
  'Короткая': 'compact structure, strong opening hook',
  'Стандартная': 'balanced intro-verse-chorus arc',
  'Длинная': 'extended development, evolving arrangement, cinematic build',
};

const MAX_TAGS_LEN = 1000;

function compactJoin(parts: Array<string | false | undefined | null>, sep = ', '): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    const trimmed = part.trim().replace(/\s+/g, ' ');
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out.join(sep);
}

function truncateTags(text: string, maxLen = MAX_TAGS_LEN): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen - 1);
  const lastComma = cut.lastIndexOf(', ');
  if (lastComma > maxLen * 0.6) return `${cut.slice(0, lastComma)}…`;
  return `${cut}…`;
}

/** Build Suno style tags optimized for live, orchestral, non-robotic output. */
export function buildEnhancedAiTags(input: AiPromptEnhanceInput): string {
  const userTags = input.userTags.trim();
  const genreLayer = GENRE_LAYERS[input.genre] ?? GENRE_LAYERS['Саундтрек'];
  const moodLayer = MOOD_LAYERS[input.mood] ?? input.mood.toLowerCase();
  const durationHint = DURATION_HINT[input.duration] ?? `duration: ${input.duration.toLowerCase()}`;

  const vocalPart =
    input.trackType === 'instrumental'
      ? compactJoin([INSTRUMENTAL_ORCHESTRA, 'instrumental only, no vocals'])
      : compactJoin([
          input.voice,
          `vocals in ${input.language}`,
          VOCAL_LIVE,
        ]);

  const tags = compactJoin([
    input.genre,
    userTags,
    genreLayer,
    moodLayer,
    `energy ${input.energy}%`,
    `${input.bpm} BPM`,
    LIVE_CORE,
    vocalPart,
    durationHint,
  ]);

  return truncateTags(tags);
}

/** Optional lyric wrapper so vocal generations stay human and musical. */
export function enhanceAiLyricsPrompt(lyrics: string, trackType: AiTrackType): string {
  const text = lyrics.trim();
  if (!text || trackType === 'instrumental') return '';

  const prefix =
    '[Performance: sing with natural human emotion, clear diction, musical phrasing, no robotic delivery]\n';
  const combined = `${prefix}${text}`;
  return combined.length > 5000 ? text : combined;
}
