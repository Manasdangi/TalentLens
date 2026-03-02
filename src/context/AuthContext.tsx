import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { getUserProfile, createOrUpdateUserProfile } from '../services/userService';

export type UserType = 'candidate' | 'recruiter';

interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  userType?: UserType;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setUserType: (userType: UserType) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_STORAGE_KEY = 'talentlens_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Load user profile from Firestore to get userType
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
          // If profile fetch fails, still set user but without userType
          // This allows login to work even if Firestore has permission issues
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
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async () => {
    try {
      // Sign in with Firebase using Google provider popup
      await signInWithPopup(auth, googleProvider);
      // User state will be updated by onAuthStateChanged listener
    } catch (error: any) {
      console.error('Failed to sign in with Firebase:', error);
      
      // Provide helpful error messages
      if (error?.code === 'auth/popup-closed-by-user') {
        console.log('Sign-in popup was closed by user');
      } else if (error?.code === 'auth/popup-blocked') {
        console.error('Popup was blocked by browser. Please allow popups for this site.');
      } else if (error?.code === 'auth/configuration-not-found') {
        console.error(
          'Firebase Configuration Error: Google Sign-In is not enabled in Firebase.\n' +
          'To fix this:\n' +
          '1. Go to Firebase Console (https://console.firebase.google.com)\n' +
          '2. Select your project: talentlens-13926\n' +
          '3. Go to Authentication > Sign-in method\n' +
          '4. Enable Google Sign-In provider'
        );
      }
      throw error; // Re-throw to allow components to handle the error
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to sign out:', error);
      throw error; // Re-throw to allow components to handle the error
    }
  }, []);

  const setUserType = useCallback(async (userType: UserType) => {
    if (!user) {
      throw new Error('User must be logged in to set user type');
    }

    try {
      // Save user type to Firestore
      const profile = await createOrUpdateUserProfile(
        user.id,
        userType,
        user.name,
        user.email,
        user.picture
      );

      // Update local user state
      const updatedUser: User = {
        ...user,
        userType: profile.userType,
      };
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Failed to set user type:', error);
      throw error;
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUserType }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
