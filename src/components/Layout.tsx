import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Sidebar from './Sidebar';

import Header from './Header';

function isImmersiveRoute(pathname: string): boolean {

  if (pathname === '/soundtok') return true;

  if (pathname.startsWith('/chats/') && pathname !== '/chats') return true;

  if (pathname === '/studio' || pathname === '/midi') return true;

  return false;

}



export default function Layout() {

  const { pathname } = useLocation();

  const immersive = isImmersiveRoute(pathname);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, left: 0 });
  }, [pathname]);


  return (

    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-[#0a0a0a]">

      <Sidebar />

      <div className="flex h-full flex-1 flex-col ml-0 pb-[var(--app-bottom-nav)] md:ml-[200px] lg:ml-[220px] md:pb-0 min-h-0 min-w-0 overflow-hidden">

        <Header />

        <main
          ref={contentRef}

          className={`flex-1 min-h-0 ${

            immersive

              ? 'overflow-hidden h-[calc(100dvh-59px-var(--app-bottom-nav))] md:h-[calc(100dvh-59px)]'

              : 'overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-gutter:stable]'

          }`}

        >

          <Outlet />

        </main>

      </div>

    </div>

  );

}

