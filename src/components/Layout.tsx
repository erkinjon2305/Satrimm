import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun, WifiOff } from 'lucide-react';

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-200">
      {!isOnline && (
        <div className="bg-red-500 text-white text-center py-2 px-4 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff size={18} />
          <span>You are offline. Please connect to the internet to continue.</span>
        </div>
      )}
      <div className="max-w-7xl mx-auto flex">
        {/* Desktop Sidebar */}
        <div className="hidden sm:block w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 min-h-screen sticky top-0">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0 pb-16 sm:pb-0">
          <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 flex justify-between items-center sm:hidden">
            <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Satrim</h1>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
          <Outlet />
        </main>

        {/* Desktop Right Sidebar (Trends/Suggestions) - Optional */}
        <div className="hidden lg:block w-80 shrink-0 border-l border-gray-200 dark:border-gray-800 min-h-screen sticky top-0 p-4">
          <div className="flex justify-end mb-6">
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
            <h2 className="font-bold text-lg mb-4">Who to follow</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Suggestions will appear here.</p>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <BottomNav />
      </div>
    </div>
  );
}
