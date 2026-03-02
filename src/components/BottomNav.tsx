import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, MessageSquare, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function BottomNav() {
  const { profile } = useAuth();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Search', path: '/search', icon: Search },
    { name: 'Messages', path: '/messages', icon: MessageSquare },
    { name: 'Profile', path: profile ? `/profile/${profile.username}` : '/profile', icon: User },
  ];

  return (
    <nav className="flex justify-around items-center h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
      {navItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full transition-colors ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`
          }
        >
          <item.icon size={24} />
          <span className="text-xs mt-1">{item.name}</span>
        </NavLink>
      ))}
    </nav>
  );
}
