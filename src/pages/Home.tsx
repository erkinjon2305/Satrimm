import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import PostCard from '../components/PostCard';
import { Post } from '../types';
import { Image, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Home() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(newPosts);
    });

    return () => unsubscribe();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (images.length + filesArray.length > 4) {
        toast.error('You can only upload up to 4 images per post');
        return;
      }
      setImages(prev => [...prev, ...filesArray]);
      
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) return;
    if (!user || !profile) return;

    setLoading(true);
    try {
      const imageUrls: string[] = [];
      
      // Upload images
      for (const image of images) {
        const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${image.name}`);
        await uploadBytes(imageRef, image);
        const url = await getDownloadURL(imageRef);
        imageUrls.push(url);
      }

      // Create post
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorUsername: profile.username,
        authorDisplayName: profile.displayName,
        authorAvatarUrl: profile.avatarUrl,
        content: content.trim(),
        imageUrls,
        likes: [],
        commentCount: 0,
        createdAt: new Date().toISOString()
      });

      setContent('');
      setImages([]);
      setImagePreviews([]);
      toast.success('Post created!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full border-x border-gray-200 dark:border-gray-800 min-h-screen">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 hidden sm:block">
        <h1 className="text-xl font-bold">Home</h1>
      </div>

      {/* Create Post */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-4">
          <img
            src={profile?.avatarUrl || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=random`}
            alt="Avatar"
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
          <form onSubmit={handleSubmit} className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-transparent text-lg resize-none outline-none min-h-[80px] text-gray-900 dark:text-gray-100 placeholder-gray-500"
              maxLength={280}
            />
            
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-video rounded-xl overflow-hidden">
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-indigo-500">
                <label className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full cursor-pointer transition-colors">
                  <Image size={20} />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm ${content.length > 260 ? 'text-red-500' : 'text-gray-400'}`}>
                  {content.length}/280
                </span>
                <button
                  type="submit"
                  disabled={loading || (!content.trim() && images.length === 0)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-4 rounded-full transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                  Post
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Feed */}
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
        {posts.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No posts yet. Be the first to post!
          </div>
        )}
      </div>
    </div>
  );
}
