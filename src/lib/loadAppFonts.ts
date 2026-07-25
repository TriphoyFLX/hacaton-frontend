/** Defer secondary mono weights until the authenticated shell mounts. */
let loaded = false;

export function loadAppFonts(): void {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  void import('@fontsource/dm-mono/latin-300.css');
  void import('@fontsource/dm-mono/latin-500.css');
}
