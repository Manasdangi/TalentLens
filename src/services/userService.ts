import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserType } from '../context/AuthContext';

const COLLECTION_NAME = 'Users';

export interface UserProfile {
  userId: string;
  userType: UserType;
  name: string;
  email: string;
  picture?: string;
  createdAt: number;
  updatedAt: number;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const userDocRef = doc(db, COLLECTION_NAME, userId);
  const snapshot = await getDoc(userDocRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return snapshot.data() as UserProfile;
}

export async function createOrUpdateUserProfile(
  userId: string,
  userType: UserType,
  name: string,
  email: string,
  picture?: string
): Promise<UserProfile> {
  const userDocRef = doc(db, COLLECTION_NAME, userId);
  const existingProfile = await getUserProfile(userId);
  const now = Date.now();

  const profile: UserProfile = {
    userId,
    userType,
    name,
    email,
    picture,
    createdAt: existingProfile?.createdAt || now,
    updatedAt: now,
  };

  await setDoc(userDocRef, profile);
  return profile;
}

export async function updateUserType(userId: string, userType: UserType): Promise<void> {
  const userDocRef = doc(db, COLLECTION_NAME, userId);
  const existingProfile = await getUserProfile(userId);
  
  if (!existingProfile) {
    throw new Error('User profile not found');
  }

  await setDoc(userDocRef, {
    ...existingProfile,
    userType,
    updatedAt: Date.now(),
  }, { merge: true });
}
