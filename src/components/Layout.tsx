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



  return (

    <div className="flex min-h-screen bg-[#0a0a0a]">

      <Sidebar />

      <div className="flex flex-1 flex-col ml-0 pb-[var(--app-bottom-nav)] md:ml-[200px] lg:ml-[220px] md:pb-0 min-h-0 min-w-0">

        <Header />

        <main

          className={`flex-1 min-h-0 ${

            immersive

              ? 'overflow-hidden h-[calc(100dvh-59px-var(--app-bottom-nav))] md:h-[calc(100dvh-59px)]'

              : 'overflow-auto'

          }`}

        >

          <Outlet />

        </main>

      </div>

    </div>

  );

}

