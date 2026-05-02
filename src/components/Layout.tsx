import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-[220px]">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
