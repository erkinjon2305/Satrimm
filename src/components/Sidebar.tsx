import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, MessageSquare, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Sidebar() {
  const { profile } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Profile', path: profile ? `/profile/${profile.username}` : '/profile', icon: User },
  ];

  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-8 px-4">
        <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">Satrim</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-full text-lg font-medium transition-colors ${
                isActive
                  ? 'bg-gray-200 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`
            }
          >
            <item.icon size={24} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-4 py-3 w-full rounded-full text-lg font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={24} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}
