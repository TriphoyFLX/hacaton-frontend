import { useState } from 'react';
import { Search, Bell } from 'lucide-react';
import SearchModal from './SearchModal';

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <header className="bg-gray-800/80 backdrop-blur-lg border-b border-gray-700 px-6 py-4">
        <div className="flex justify-end items-center space-x-4">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-700 transition text-gray-300 hover:text-white"
          >
            <Search size={20} />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-700 transition text-gray-300 hover:text-white relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </header>
      
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
