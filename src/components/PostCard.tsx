import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share, MoreHorizontal } from 'lucide-react';
import { Post } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatDistanceToNow } from 'date-fns';

export default function PostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(user ? post.likes.includes(user.uid) : false);
  const [likeCount, setLikeCount] = useState(post.likes.length);

  const handleLike = async () => {
    if (!user) return;
    
    const postRef = doc(db, 'posts', post.id);
    try {
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        });
        setLikeCount(prev => prev - 1);
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        });
        setLikeCount(prev => prev + 1);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex gap-4">
        <Link to={`/profile/${post.authorUsername}`} className="shrink-0">
          <img
            src={post.authorAvatarUrl || `https://ui-avatars.com/api/?name=${post.authorDisplayName}&background=random`}
            alt={post.authorDisplayName}
            className="w-10 h-10 rounded-full object-cover"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <Link to={`/profile/${post.authorUsername}`} className="font-bold hover:underline truncate">
                {post.authorDisplayName}
              </Link>
              <span className="text-gray-500 dark:text-gray-400 truncate">@{post.authorUsername}</span>
              <span className="text-gray-500 dark:text-gray-400">·</span>
              <span className="text-gray-500 dark:text-gray-400 shrink-0">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
            </div>
            <button className="p-2 text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </div>
          
          <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {post.imageUrls && post.imageUrls.length > 0 && (
            <div className={`mt-3 grid gap-2 ${post.imageUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {post.imageUrls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt="Post attachment"
                  className="rounded-xl w-full object-cover max-h-96"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-3 text-gray-500 dark:text-gray-400 max-w-md">
            <Link to={`/post/${post.id}`} className="flex items-center gap-2 hover:text-indigo-500 group transition-colors">
              <div className="p-2 rounded-full group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20">
                <MessageCircle size={18} />
              </div>
              <span className="text-sm">{post.commentCount || 0}</span>
            </Link>
            
            <button 
              onClick={handleLike}
              className={`flex items-center gap-2 group transition-colors ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}
            >
              <div className={`p-2 rounded-full group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20`}>
                <Heart size={18} className={isLiked ? 'fill-current' : ''} />
              </div>
              <span className="text-sm">{likeCount}</span>
            </button>

            <button className="flex items-center gap-2 hover:text-green-500 group transition-colors">
              <div className="p-2 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-900/20">
                <Share size={18} />
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
