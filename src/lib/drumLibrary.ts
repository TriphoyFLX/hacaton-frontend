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
  const data = (await res.json()) as DrumLibraryManifest;

  // Drop oneshots that are listed in the manifest but not yet on the CDN/server
  // (missing files fall through nginx SPA → HTML, which used to break upload).
  const oneshots = data.categories.find((c) => c.id === 'oneshots');
  if (oneshots?.samples?.length) {
    const checks = await Promise.all(
      oneshots.samples.map(async (sample) => {
        try {
          const head = await fetch(sample.url, { method: 'HEAD', cache: 'no-store' });
          const ct = (head.headers.get('content-type') || '').toLowerCase();
          if (!head.ok || ct.includes('text/html')) return null;
          return sample;
        } catch {
          return null;
        }
      }),
    );
    oneshots.samples = checks.filter((s): s is DrumLibrarySample => Boolean(s));
  }

  cached = {
    ...data,
    categories: data.categories.filter((c) => c.id !== 'oneshots' || c.samples.length > 0),
  };
  return cached;
}

export function formatSampleSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
