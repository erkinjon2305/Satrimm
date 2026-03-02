import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Post, Comment } from '../types';
import PostCard from '../components/PostCard';
import { ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Fetch post
    const fetchPost = async () => {
      try {
        const docRef = doc(db, 'posts', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() } as Post);
        } else {
          toast.error('Post not found');
          navigate('/');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();

    // Listen to comments
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(fetchedComments);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !profile || !post) return;

    setSubmitting(true);
    try {
      // Add comment
      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        authorId: user.uid,
        authorUsername: profile.username,
        authorDisplayName: profile.displayName,
        authorAvatarUrl: profile.avatarUrl,
        content: newComment.trim(),
        createdAt: new Date().toISOString()
      });

      // Update post comment count
      await updateDoc(doc(db, 'posts', post.id), {
        commentCount: increment(1)
      });

      setNewComment('');
      toast.success('Comment added');
      
      // Update local post state to reflect new comment count immediately
      setPost(prev => prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : null);
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto w-full border-x border-gray-200 dark:border-gray-800 min-h-screen flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="max-w-2xl mx-auto w-full border-x border-gray-200 dark:border-gray-800 min-h-screen pb-20 sm:pb-0">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Post</h1>
      </div>

      <PostCard post={post} />

      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <form onSubmit={handleAddComment} className="flex gap-4">
          <img
            src={profile?.avatarUrl || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=random`}
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Post your reply..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-4 rounded-full transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
              Reply
            </button>
          </div>
        </form>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-800 border-t border-gray-200 dark:border-gray-800">
        {comments.map(comment => (
          <div key={comment.id} className="p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <Link to={`/profile/${comment.authorUsername}`} className="shrink-0">
              <img
                src={comment.authorAvatarUrl || `https://ui-avatars.com/api/?name=${comment.authorDisplayName}&background=random`}
                alt={comment.authorDisplayName}
                className="w-10 h-10 rounded-full object-cover"
              />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 truncate">
                <Link to={`/profile/${comment.authorUsername}`} className="font-bold hover:underline truncate">
                  {comment.authorDisplayName}
                </Link>
                <span className="text-gray-500 dark:text-gray-400 truncate">@{comment.authorUsername}</span>
                <span className="text-gray-500 dark:text-gray-400">·</span>
                <span className="text-gray-500 dark:text-gray-400 shrink-0">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No replies yet. Be the first to reply!
          </div>
        )}
      </div>
    </div>
  );
}
