import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Sidebar from './Sidebar';

import Header from './Header';
import PushEnableBanner from './PushEnableBanner';
import { useAuthStore } from '../store/authStore';
import { ensureWebPushSubscription, getNotificationPermission } from '../lib/webPush';
import { warmAppRoutes, prefetchRoute } from '../lib/routePrefetch';
import { setCachedPageData, isPageDataFresh } from '../lib/pageDataCache';

function isImmersiveRoute(pathname: string): boolean {
  if (pathname === '/soundtok') return true;
  if (pathname.startsWith('/soundtok/sound/') && pathname.endsWith('/record')) return true;
  if (pathname.startsWith('/chats/') && pathname !== '/chats') return true;
  if (pathname === '/studio' || pathname === '/midi') return true;
  return false;
}

/** Quietly warm API payloads for the hottest tabs after chunks load. */
function warmHotApiData() {
  void import('../api/posts').then(({ postsApi }) => {
    if (isPageDataFresh('feed:trending:')) return;
    void postsApi
      .getPosts('trending', '', { limit: 12, offset: 0 })
      .then((data) => {
        setCachedPageData('feed:trending:', {
          items: data.items ?? [],
          hasMore: Boolean(data.hasMore),
        });
      })
      .catch(() => undefined);
  });

  void import('../api/chats').then(({ chatsApi }) => {
    if (isPageDataFresh('chats:list')) return;
    void chatsApi
      .getChats({ limit: 25, offset: 0 })
      .then((data) => {
        setCachedPageData('chats:list', {
          items: data.items ?? [],
          hasMore: Boolean(data.hasMore),
        });
      })
      .catch(() => undefined);
  });

  void import('../api/soundtok').then(({ soundTokApi }) => {
    if (isPageDataFresh('soundtok:feed')) return;
    void soundTokApi
      .getSoundToks({ limit: 8, offset: 0 })
      .then((data) => {
        setCachedPageData('soundtok:feed', {
          items: data.items ?? [],
          hasMore: Boolean(data.hasMore),
        });
      })
      .catch(() => undefined);
  });
}

export default function Layout() {
  const { pathname } = useLocation();
  const token = useAuthStore((s) => s.token);

  const immersive = isImmersiveRoute(pathname);
  const isSoundTokFeed = pathname === '/soundtok';
  const [mobileChrome, setMobileChrome] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches,
  );
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1024px)');
    const sync = () => setMobileChrome(mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const hideAppHeader = isSoundTokFeed && mobileChrome;

  useEffect(() => {
    const root = document.documentElement;
    if (hideAppHeader) root.classList.add('sl-soundtok-chrome');
    else root.classList.remove('sl-soundtok-chrome');
    return () => root.classList.remove('sl-soundtok-chrome');
  }, [hideAppHeader]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  // Prefetch the current route's siblings when navigating (e.g. open chats → warm ChatPage)
  useEffect(() => {
    prefetchRoute(pathname);
  }, [pathname]);

  // Warm all common route chunks + hot API data after login
  useEffect(() => {
    if (!token) return;
    const stopWarm = warmAppRoutes();
    const apiTimer = window.setTimeout(() => warmHotApiData(), 1800);
    return () => {
      stopWarm();
      window.clearTimeout(apiTimer);
    };
  }, [token]);

  // Re-sync push only if permission already granted (no auto prompt — mobile blocks that).
  useEffect(() => {
    if (!token) return;
    if (getNotificationPermission() !== 'granted') return;
    const timer = window.setTimeout(() => {
      void ensureWebPushSubscription();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [token]);

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-[#0a0a0a]">
      <Sidebar />

      <div className={`app-shell flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden ml-0 pb-[var(--app-bottom-nav)] md:ml-[200px] lg:ml-[220px] md:pb-0${isSoundTokFeed ? ' app-shell--soundtok' : ''}`}>
        {!hideAppHeader && <Header />}

        <main
          ref={contentRef}
          className={`app-main flex-1 min-h-0 min-w-0 max-w-full ${
            immersive
              ? 'app-main--immersive overflow-hidden'
              : 'overflow-y-auto overflow-x-clip overscroll-contain md:[scrollbar-gutter:stable]'
          }`}
        >
          <Outlet />
        </main>
      </div>

      {token ? <PushEnableBanner /> : null}
    </div>
  );
}
