import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SavedResume, ResumeCategory } from '../types/resume';
import { MAX_SAVED_RESUMES } from '../types/resume';

const COLLECTION_NAME = 'Resumes';

interface UserResumesDoc {
  userId: string;
  resumes: SavedResume[];
  updatedAt: number;
}

export async function getUserResumes(userId: string): Promise<SavedResume[]> {
  const userDocRef = doc(db, COLLECTION_NAME, userId);
  const snapshot = await getDoc(userDocRef);
  
  if (!snapshot.exists()) {
    return [];
  }
  
  const data = snapshot.data() as UserResumesDoc;
  return data.resumes || [];
}

export async function saveResume(
  userId: string,
  category: ResumeCategory,
  label: string,
  content: string,
  fileName: string,
  existingId?: string
): Promise<SavedResume> {
  const userDocRef = doc(db, COLLECTION_NAME, userId);
  const existingResumes = await getUserResumes(userId);
  
  const now = Date.now();
  
  if (existingId) {
    // Update existing resume
    const resumeIndex = existingResumes.findIndex(r => r.id === existingId);
    if (resumeIndex === -1) {
      throw new Error('Resume not found');
    }
    
    const updatedResume: SavedResume = {
      ...existingResumes[resumeIndex],
      category,
      label,
      content,
      fileName,
      updatedAt: now,
    };
    
    existingResumes[resumeIndex] = updatedResume;
    
    await setDoc(userDocRef, {
      userId,
      resumes: existingResumes,
      updatedAt: now,
    });
    
    return updatedResume;
  } else {
    // Create new resume
    if (existingResumes.length >= MAX_SAVED_RESUMES) {
      throw new Error(`You can only save up to ${MAX_SAVED_RESUMES} resumes. Please delete one to add a new resume.`);
    }
    
    const newResume: SavedResume = {
      id: `${userId}_${now}`,
      userId,
      category,
      label,
      content,
      fileName,
      createdAt: now,
      updatedAt: now,
    };
    
    const updatedResumes = [...existingResumes, newResume];
    
    await setDoc(userDocRef, {
      userId,
      resumes: updatedResumes,
      updatedAt: now,
    });
    
    return newResume;
  }
}

export async function deleteResume(userId: string, resumeId: string): Promise<void> {
  const userDocRef = doc(db, COLLECTION_NAME, userId);
  const existingResumes = await getUserResumes(userId);
  
  const filteredResumes = existingResumes.filter(r => r.id !== resumeId);
  
  if (filteredResumes.length === existingResumes.length) {
    throw new Error('Resume not found');
  }
  
  await setDoc(userDocRef, {
    userId,
    resumes: filteredResumes,
    updatedAt: Date.now(),
  });
}

export async function updateResumeLabel(
  userId: string,
  resumeId: string,
  label: string
): Promise<void> {
  const userDocRef = doc(db, COLLECTION_NAME, userId);
  const existingResumes = await getUserResumes(userId);
  
  const resumeIndex = existingResumes.findIndex(r => r.id === resumeId);
  if (resumeIndex === -1) {
    throw new Error('Resume not found');
  }
  
  existingResumes[resumeIndex].label = label;
  existingResumes[resumeIndex].updatedAt = Date.now();
  
  await setDoc(userDocRef, {
    userId,
    resumes: existingResumes,
    updatedAt: Date.now(),
  });
}

export async function updateResumeCategory(
  userId: string,
  resumeId: string,
  category: ResumeCategory
): Promise<void> {
  const userDocRef = doc(db, COLLECTION_NAME, userId);
  const existingResumes = await getUserResumes(userId);
  
  const resumeIndex = existingResumes.findIndex(r => r.id === resumeId);
  if (resumeIndex === -1) {
    throw new Error('Resume not found');
  }
  
  existingResumes[resumeIndex].category = category;
  existingResumes[resumeIndex].updatedAt = Date.now();
  
  await setDoc(userDocRef, {
    userId,
    resumes: existingResumes,
    updatedAt: Date.now(),
  });
}
