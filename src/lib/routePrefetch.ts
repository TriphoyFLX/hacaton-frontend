/** Prefetch lazy route chunks so tab switches feel instant. */

type Loader = () => Promise<unknown>;

const ROUTE_LOADERS: Record<string, Loader> = {
  '/feed': () => import('../pages/Feed'),
  '/projects': () => import('../pages/Projects'),
  '/soundtok': () => import('../pages/SoundTok'),
  '/rap-battle': () => import('../pages/RapBattleNew'),
  '/midi': () => import('../pages/MIDI'),
  '/studio': () => import('../pages/Studio'),
  '/presets': () => import('../pages/PresetsMarketplace'),
  '/chats': () => import('../pages/Chats'),
  '/ai': () => import('../pages/AI'),
  '/pricing': () => import('../pages/Pricing'),
  '/profile': () => import('../pages/Profile'),
  '/dashboard': () => import('../components/Dashboard'),
  '/admin': () => import('../pages/AdminPanel'),
};

/** Heavy nested routes warmed after their parent. */
const EXTRA_LOADERS: Loader[] = [
  () => import('../pages/ChatPage'),
  () => import('../pages/PublicProfile'),
  () => import('../pages/SoundPage'),
  () => import('../pages/SoundRecordPage'),
];

const warmed = new Set<string>();

function isStandalonePwa(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

function keepStartupLight(): boolean {
  if (isStandalonePwa() || isCoarsePointer()) return true;
  if (typeof navigator === 'undefined') return false;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === 'number' && memory <= 4;
}

function shouldWarmRoutes(): boolean {
  if (typeof navigator === 'undefined') return true;
  const conn = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (conn?.saveData) return false;
  if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return false;
  return true;
}

function normalizePath(path: string): string {
  if (!path) return '';
  const bare = path.split('?')[0].split('#')[0];
  if (bare.length > 1 && bare.endsWith('/')) return bare.slice(0, -1);
  return bare;
}

export function prefetchRoute(path: string): void {
  const normalized = normalizePath(path);
  if (!normalized || warmed.has(normalized)) return;

  const loader = ROUTE_LOADERS[normalized];
  if (!loader) {
    // Dynamic segments: /chats/:id, /profile/:user
    if (normalized.startsWith('/chats/')) {
      if (!warmed.has('__chatpage')) {
        warmed.add('__chatpage');
        void import('../pages/ChatPage').catch(() => undefined);
      }
      return;
    }
    if (normalized.startsWith('/profile/')) {
      if (!warmed.has('__publicprofile')) {
        warmed.add('__publicprofile');
        void import('../pages/PublicProfile').catch(() => undefined);
      }
      return;
    }
    return;
  }

  warmed.add(normalized);
  void loader().catch(() => {
    warmed.delete(normalized);
  });

  if (normalized === '/chats' && !warmed.has('__chatpage')) {
    warmed.add('__chatpage');
    void import('../pages/ChatPage').catch(() => undefined);
  }
  if (normalized === '/studio' || normalized === '/midi') {
    const other = normalized === '/studio' ? '/midi' : '/studio';
    if (!warmed.has(other)) {
      warmed.add(other);
      void ROUTE_LOADERS[other]().catch(() => warmed.delete(other));
    }
  }
}

/** Prefetch handlers for NavLink — pointer/focus warm the chunk before click. */
export function routePrefetchHandlers(path: string) {
  const run = () => prefetchRoute(path);
  const handlers = {
    onMouseEnter: run,
    onFocus: run,
  };
  if (keepStartupLight()) return handlers;
  return { ...handlers, onTouchStart: run };
}

type WarmHandle = { kind: 'idle'; id: number } | { kind: 'timeout'; id: ReturnType<typeof setTimeout> };

function schedule(cb: () => void, timeout: number): WarmHandle {
  const ric = typeof window !== 'undefined'
    ? (window as Window & { requestIdleCallback?: typeof window.requestIdleCallback }).requestIdleCallback
    : undefined;
  if (typeof ric === 'function') {
    return {
      kind: 'idle',
      id: ric(() => cb(), { timeout }),
    };
  }
  return {
    kind: 'timeout',
    id: setTimeout(cb, Math.min(timeout, 800)),
  };
}

function cancelScheduled(handle: WarmHandle | undefined) {
  if (!handle) return;
  if (handle.kind === 'idle') {
    const cancel = typeof window !== 'undefined'
      ? (window as Window & { cancelIdleCallback?: typeof window.cancelIdleCallback }).cancelIdleCallback
      : undefined;
    if (typeof cancel === 'function') cancel(handle.id);
    return;
  }
  clearTimeout(handle.id);
}

/**
 * After login / first paint: warm common tabs in priority order without
 * blocking the UI. Heavy pages (MIDI / RapBattle) come last.
 */
export function warmAppRoutes(): () => void {
  if (typeof window === 'undefined' || !shouldWarmRoutes()) return () => undefined;

  const lightStartup = keepStartupLight();
  const priority = lightStartup
    ? ['/feed', '/soundtok', '/chats']
    : [
        '/feed',
        '/soundtok',
        '/chats',
        '/projects',
        '/profile',
        '/dashboard',
        '/ai',
        '/presets',
        '/pricing',
      ];

  let cancelled = false;
  let idx = 0;
  let handle: WarmHandle | undefined;

  const step = () => {
    if (cancelled) return;
    if (idx < priority.length) {
      prefetchRoute(priority[idx]);
      idx += 1;
      handle = schedule(step, lightStartup ? 3000 : 1200);
      return;
    }
    if (lightStartup) return;
    // Nested heavy chunks after main tabs
    for (const loader of EXTRA_LOADERS) {
      void loader().catch(() => undefined);
    }
  };

  handle = schedule(step, lightStartup ? 3500 : 400);

  return () => {
    cancelled = true;
    cancelScheduled(handle);
  };
}
