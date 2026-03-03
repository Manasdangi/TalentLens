import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { getUserProfile, createOrUpdateUserProfile } from '../services/userService';
import {
  getUserResumes,
  saveResume as saveResumeToDb,
  deleteResume as deleteResumeFromDb,
} from '../services/resumeService';
import { getErrorMessage } from '../utils/getErrorMessage';
import type { SavedResume, ResumeCategory } from '../types/resume';
import type { User, UserType } from './slices/UserSlice';
import type { UserSlice } from './slices/UserSlice';
import type { ResumeSlice } from './slices/ResumeSlice';

export type { UserType, User } from './slices/UserSlice';

export interface AppStoreState {
  user: UserSlice;
  resume: ResumeSlice;
}

const AppStoreContext = createContext<AppStoreState | null>(null);

const USER_STORAGE_KEY = 'talentlens_user';

export function StoreProvider({ children }: { children: ReactNode }) {
  // --- User state ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- Resume state ---
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [selectedResume, setSelectedResume] = useState<SavedResume | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // Auth: listen to Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          const newUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
            picture: firebaseUser.photoURL || undefined,
            userType: profile?.userType,
          };
          setUser(newUser);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        } catch (error) {
          console.warn('Failed to load user profile:', error);
          const newUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || '',
            email: firebaseUser.email || '',
            picture: firebaseUser.photoURL || undefined,
            userType: undefined,
          };
          setUser(newUser);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
        }
      } else {
        setUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const err = error as { code?: string };
      console.error('Failed to sign in with Firebase:', error);
      if (err?.code === 'auth/popup-closed-by-user') {
        console.log('Sign-in popup was closed by user');
      } else if (err?.code === 'auth/popup-blocked') {
        console.error('Popup was blocked by browser. Please allow popups for this site.');
      } else if (err?.code === 'auth/configuration-not-found') {
        console.error(
          'Firebase Configuration Error: Google Sign-In is not enabled in Firebase.\n' +
            'To fix this:\n' +
            '1. Go to Firebase Console (https://console.firebase.google.com)\n' +
            '2. Select your project: talentlens-13926\n' +
            '3. Go to Authentication > Sign-in method\n' +
            '4. Enable Google Sign-In provider'
        );
      }
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to sign out:', error);
      throw error;
    }
  }, []);

  const setUserType = useCallback(async (userType: UserType) => {
    if (!user) {
      throw new Error('User must be logged in to set user type');
    }
    try {
      const profile = await createOrUpdateUserProfile(
        user.id,
        userType,
        user.name,
        user.email,
        user.picture
      );
      const updatedUser: User = { ...user, userType: profile.userType };
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to set user type:', error);
      throw error;
    }
  }, [user]);

  // Resume: refresh
  const refreshResumes = useCallback(async () => {
    if (!user) {
      setSavedResumes([]);
      return;
    }
    setResumeLoading(true);
    setResumeError(null);
    try {
      const resumes = await getUserResumes(user.id);
      setSavedResumes(resumes);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load resumes');
      setResumeError(message);
      console.error('Failed to load resumes:', err);
    } finally {
      setResumeLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshResumes();
  }, [refreshResumes]);

  const saveResume = useCallback(
    async (
      category: ResumeCategory,
      label: string,
      content: string,
      fileName: string,
      existingId?: string,
      options?: {
        targetRole?: string;
        experienceLevel?: string;
        jobDescription?: string;
        userEmail?: string;
        userName?: string;
      }
    ): Promise<SavedResume | null> => {
      if (!user) {
        setResumeError('Please log in to save resumes');
        return null;
      }
      setResumeError(null);
      try {
        const savedResume = await saveResumeToDb(
          user.id,
          category,
          label,
          content,
          fileName,
          existingId,
          { ...options, userEmail: user.email, userName: user.name }
        );
        await refreshResumes();
        return savedResume;
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to save resume');
        setResumeError(message);
        console.error('Failed to save resume:', err);
        return null;
      }
    },
    [user, refreshResumes]
  );

  const deleteResume = useCallback(
    async (resumeId: string): Promise<void> => {
      if (!user) {
        setResumeError('Please log in to delete resumes');
        return;
      }
      setResumeError(null);
      try {
        await deleteResumeFromDb(user.id, resumeId);
        if (selectedResume?.id === resumeId) {
          setSelectedResume(null);
        }
        await refreshResumes();
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to delete resume');
        setResumeError(message);
        console.error('Failed to delete resume:', err);
      }
    },
    [user, selectedResume, refreshResumes]
  );

  const selectResume = useCallback((resume: SavedResume | null) => {
    setSelectedResume(resume);
  }, []);

  const store: AppStoreState = {
    user: {
      user,
      isLoading: authLoading,
      login,
      logout,
      setUserType,
    },
    resume: {
      savedResumes,
      isLoading: resumeLoading,
      error: resumeError,
      saveResume,
      deleteResume,
      refreshResumes,
      selectResume,
      selectedResume,
    },
  };

  return (
    <AppStoreContext.Provider value={store}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}

// Same API as before so existing components keep working
export function useAuth() {
  const { user: userSlice } = useStore();
  return userSlice;
}

export function useResumes() {
  const { resume } = useStore();
  return resume;
}
