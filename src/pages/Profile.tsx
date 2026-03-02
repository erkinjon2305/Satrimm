import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile, Post } from '../types';
import PostCard from '../components/PostCard';
import { Calendar, X, Camera } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile, setProfile: setCurrentUserProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [saving, setSaving] = useState(false);

  // Follow State
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      if (!username) return;
      setLoading(true);
      try {
        const userQuery = query(collection(db, 'users'), where('username', '==', username));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data() as UserProfile;
          setProfile(userData);
          
          if (currentUserProfile) {
            setIsFollowing(userData.followers?.includes(currentUserProfile.uid) || false);
          }

          const postsQuery = query(
            collection(db, 'posts'),
            where('authorId', '==', userData.uid),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
          const postsSnapshot = await getDocs(postsQuery);
          const userPosts = postsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Post[];
          setPosts(userPosts);
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndPosts();
  }, [username, currentUserProfile]);

  // Check username availability
  useEffect(() => {
    const checkUsername = async () => {
      if (editUsername === profile?.username) {
        setUsernameError('');
        return;
      }
      if (editUsername.length < 3) {
        setUsernameError('Username must be at least 3 characters');
        return;
      }
      try {
        const q = query(collection(db, 'users'), where('username', '==', editUsername.toLowerCase()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setUsernameError('Username is already taken');
        } else {
          setUsernameError('');
        }
      } catch (error) {
        console.error('Error checking username:', error);
      }
    };

    const timeoutId = setTimeout(() => {
      if (editUsername && isEditing) checkUsername();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [editUsername, profile, isEditing]);

  const handleFollow = async () => {
    if (!user || !currentUserProfile || !profile) return;
    
    const targetUserRef = doc(db, 'users', profile.uid);
    const currentUserRef = doc(db, 'users', currentUserProfile.uid);

    try {
      if (isFollowing) {
        await updateDoc(targetUserRef, { followers: arrayRemove(currentUserProfile.uid) });
        await updateDoc(currentUserRef, { following: arrayRemove(profile.uid) });
        setProfile(prev => prev ? { ...prev, followers: prev.followers.filter(id => id !== currentUserProfile.uid) } : null);
        setIsFollowing(false);
      } else {
        await updateDoc(targetUserRef, { followers: arrayUnion(currentUserProfile.uid) });
        await updateDoc(currentUserRef, { following: arrayUnion(profile.uid) });
        setProfile(prev => prev ? { ...prev, followers: [...(prev.followers || []), currentUserProfile.uid] } : null);
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    }
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditName(profile.displayName);
    setEditUsername(profile.username);
    setEditBio(profile.bio || '');
    setEditAvatarPreview(profile.avatarUrl || '');
    setEditAvatar(null);
    setUsernameError('');
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    if (usernameError) {
      toast.error('Please fix the errors before saving');
      return;
    }
    
    setSaving(true);
    try {
      let newAvatarUrl = profile.avatarUrl;

      if (editAvatar) {
        const imageRef = ref(storage, `avatars/${user.uid}_${Date.now()}`);
        await uploadBytes(imageRef, editAvatar);
        newAvatarUrl = await getDownloadURL(imageRef);
      }

      const updatedData = {
        displayName: editName,
        username: editUsername.toLowerCase(),
        bio: editBio,
        avatarUrl: newAvatarUrl
      };

      await updateDoc(doc(db, 'users', user.uid), updatedData);
      
      const updatedProfile = { ...profile, ...updatedData };
      setProfile(updatedProfile);
      setCurrentUserProfile(updatedProfile);
      
      toast.success('Profile updated successfully');
      setIsEditing(false);

      if (editUsername.toLowerCase() !== profile.username) {
        navigate(`/profile/${editUsername.toLowerCase()}`);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-gray-500">User not found</div>;
  }

  const isOwnProfile = currentUserProfile?.uid === profile.uid;

  return (
    <div className="max-w-2xl mx-auto w-full border-x border-gray-200 dark:border-gray-800 min-h-screen relative">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-6">
        <div>
          <h1 className="text-xl font-bold">{profile.displayName}</h1>
          <p className="text-sm text-gray-500">{posts.length} posts</p>
        </div>
      </div>

      {/* Header/Banner */}
      <div className="h-48 bg-indigo-100 dark:bg-indigo-900/20"></div>

      {/* Profile Info */}
      <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-800 relative">
        <div className="flex justify-between items-start">
          <img
            src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.displayName}&background=random`}
            alt={profile.displayName}
            className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-900 object-cover -mt-16 bg-white dark:bg-gray-900"
          />
          <div className="mt-4">
            {isOwnProfile ? (
              <button onClick={openEditModal} className="px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Edit profile
              </button>
            ) : user ? (
              <button 
                onClick={handleFollow}
                className={`px-4 py-1.5 rounded-full font-bold transition-colors ${
                  isFollowing 
                    ? 'border border-gray-300 dark:border-gray-600 hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' 
                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-bold">{profile.displayName}</h2>
          <p className="text-gray-500 dark:text-gray-400">@{profile.username}</p>
        </div>

        {profile.bio && (
          <p className="mt-4 text-gray-900 dark:text-gray-100">{profile.bio}</p>
        )}

        <div className="flex flex-wrap gap-4 mt-4 text-gray-500 dark:text-gray-400 text-sm">
          <div className="flex items-center gap-1">
            <Calendar size={16} />
            <span>Joined {format(new Date(profile.createdAt), 'MMMM yyyy')}</span>
          </div>
        </div>

        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex gap-1 hover:underline cursor-pointer">
            <span className="font-bold text-gray-900 dark:text-gray-100">{profile.following?.length || 0}</span>
            <span className="text-gray-500 dark:text-gray-400">Following</span>
          </div>
          <div className="flex gap-1 hover:underline cursor-pointer">
            <span className="font-bold text-gray-900 dark:text-gray-100">{profile.followers?.length || 0}</span>
            <span className="text-gray-500 dark:text-gray-400">Followers</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button className="flex-1 py-4 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative">
          Posts
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-500 rounded-t-full"></div>
        </button>
        <button className="flex-1 py-4 font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Replies
        </button>
        <button className="flex-1 py-4 font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Likes
        </button>
      </div>

      {/* Posts */}
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
        {posts.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No posts yet.
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                  <X size={20} />
                </button>
                <h2 className="text-xl font-bold">Edit profile</h2>
              </div>
              <button 
                onClick={handleSaveProfile}
                disabled={saving || !editName.trim()}
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-1.5 rounded-full font-bold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <img 
                  src={editAvatarPreview || `https://ui-avatars.com/api/?name=${editName}&background=random`} 
                  alt="Avatar preview" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-900"
                />
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer hover:bg-black/50 transition-colors">
                  <Camera className="text-white" size={24} />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEditAvatar(e.target.files[0]);
                        setEditAvatarPreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                  />
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">@</span>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    className={`w-full pl-8 pr-4 py-2 rounded-lg border ${usernameError ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all`}
                  />
                </div>
                {usernameError && <p className="text-red-500 text-xs mt-1">{usernameError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
