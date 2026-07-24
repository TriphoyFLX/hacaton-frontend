import {
  allStudioVocalPresets,
  clipFxFromPreset,
  findVocalPresetById,
  type ClipFx,
  type VocalFxPreset,
} from './vocalFx';

const SAVED_KEY = 'soundlab_studio_vocal_presets';
const PENDING_KEY = 'soundlab_pending_vocal_preset';

function readSaved(): VocalFxPreset[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
      .map((item) => ({
        id: String(item.id),
        name: String(item.name),
        ...clipFxFromPreset(item as VocalFxPreset),
      }));
  } catch {
    return [];
  }
}

function writeSaved(items: VocalFxPreset[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(items.slice(0, 40)));
}

export function listSavedStudioVocalPresets(): VocalFxPreset[] {
  return readSaved();
}

export function isVocalPresetSavedInStudio(id: string): boolean {
  return readSaved().some((p) => p.id === id);
}

/** Save a curated/builtin style into the user's Studio library */
export function saveVocalPresetToStudio(presetId: string): { ok: true; preset: VocalFxPreset } | { ok: false; error: string } {
  const preset = findVocalPresetById(presetId);
  if (!preset) return { ok: false, error: 'Пресет не найден' };
  const existing = readSaved().filter((p) => p.id !== preset.id);
  const next: VocalFxPreset = {
    id: preset.id,
    name: preset.name,
    ...clipFxFromPreset(preset),
  };
  writeSaved([next, ...existing]);
  return { ok: true, preset: next };
}

export function removeSavedStudioVocalPreset(id: string) {
  writeSaved(readSaved().filter((p) => p.id !== id));
}

/** Queue preset for Studio — applied on next open / vocal clip */
export function queueVocalPresetForStudio(presetId: string): { ok: true } | { ok: false; error: string } {
  const preset = findVocalPresetById(presetId);
  if (!preset) return { ok: false, error: 'Пресет не найден' };
  localStorage.setItem(
    PENDING_KEY,
    JSON.stringify({
      id: preset.id,
      name: preset.name,
      fx: clipFxFromPreset(preset),
      queuedAt: Date.now(),
    }),
  );
  return { ok: true };
}

export function consumePendingVocalPreset(): { id: string; name: string; fx: ClipFx } | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_KEY);
    const data = JSON.parse(raw);
    if (!data?.fx) return null;
    return {
      id: String(data.id || 'custom'),
      name: String(data.name || 'Preset'),
      fx: clipFxFromPreset(data.fx),
    };
  } catch {
    localStorage.removeItem(PENDING_KEY);
    return null;
  }
}

/** Presets shown in MIDI FX chips: built-in + curated + user-saved extras */
export function studioFxChipPresets(): VocalFxPreset[] {
  const base = allStudioVocalPresets();
  const saved = readSaved();
  const seen = new Set(base.map((p) => p.id));
  const extras = saved.filter((p) => !seen.has(p.id));
  return [...base, ...extras];
}
