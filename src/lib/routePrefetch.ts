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
];

const warmed = new Set<string>();

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
  return {
    onMouseEnter: run,
    onFocus: run,
    onTouchStart: run,
  };
}

function schedule(cb: () => void, timeout: number): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(() => cb(), { timeout }) as unknown as number;
  }
  return window.setTimeout(cb, Math.min(timeout, 800));
}

/**
 * After login / first paint: warm common tabs in priority order without
 * blocking the UI. Heavy pages (MIDI / RapBattle) come last.
 */
export function warmAppRoutes(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const priority = [
    '/feed',
    '/soundtok',
    '/chats',
    '/projects',
    '/profile',
    '/ai',
    '/presets',
    '/pricing',
    '/rap-battle',
    '/midi',
  ];

  let cancelled = false;
  let idx = 0;
  let timer: number | undefined;

  const step = () => {
    if (cancelled) return;
    if (idx < priority.length) {
      prefetchRoute(priority[idx]);
      idx += 1;
      timer = schedule(step, 1200);
      return;
    }
    // Nested heavy chunks after main tabs
    for (const loader of EXTRA_LOADERS) {
      void loader().catch(() => undefined);
    }
  };

  timer = schedule(step, 400);

  return () => {
    cancelled = true;
    if (timer !== undefined) {
      if ('cancelIdleCallback' in window) {
        window.cancelIdleCallback(timer);
      } else {
        window.clearTimeout(timer);
      }
    }
  };
}
