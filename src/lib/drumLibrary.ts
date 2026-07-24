export type DrumLibrarySample = {
  id: string;
  name: string;
  file: string;
  url: string;
  bytes: number;
};

export type DrumLibraryCategory = {
  id: string;
  name: string;
  samples: DrumLibrarySample[];
};

export type DrumLibraryManifest = {
  id: string;
  name: string;
  categories: DrumLibraryCategory[];
};

const MANIFEST_URL = '/drumkits/greentrip/manifest.json';

let cached: DrumLibraryManifest | null = null;

export async function loadDrumLibrary(): Promise<DrumLibraryManifest> {
  if (cached) return cached;
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error('Не удалось загрузить библиотеку звуков');
  cached = (await res.json()) as DrumLibraryManifest;
  return cached;
}

export function formatSampleSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
