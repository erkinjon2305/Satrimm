import React, { useState } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', searchQuery.toLowerCase()),
        where('username', '<=', searchQuery.toLowerCase() + '\uf8ff'),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => doc.data() as UserProfile);
      setResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full border-x border-gray-200 dark:border-gray-800 min-h-screen">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon className="absolute left-3 top-2.5 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
          />
        </form>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
          </div>
        ) : results.length > 0 ? (
          results.map(user => (
            <Link
              key={user.uid}
              to={`/profile/${user.username}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <img
                src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`}
                alt={user.displayName}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">{user.displayName}</h3>
                <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>
                {user.bio && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-1">{user.bio}</p>}
              </div>
            </Link>
          ))
        ) : searchQuery && !loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No users found matching "{searchQuery}"
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Search for users to see their profiles
          </div>
        )}
      </div>
    </div>
  );
}
