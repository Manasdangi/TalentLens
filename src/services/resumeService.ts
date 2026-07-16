import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SavedResume, ResumeCategory } from '../types/resume';
import { MAX_SAVED_RESUMES } from '../types/resume';
import { syncResumeByRole, removeResumeFromByRole } from './resumeByRoleService';
import {
  deleteE2EResume,
  getAllE2EResumes,
  getE2EResumes,
  isE2EMode,
  saveE2EResume,
} from '../utils/e2eMode';

const COLLECTION_NAME = 'Resumes';

interface UserResumesDoc {
  userId: string;
  resumes: SavedResume[];
  updatedAt: number;
}

export async function getUserResumes(userId: string): Promise<SavedResume[]> {
  if (isE2EMode()) {
    return getE2EResumes(userId);
  }

  const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const byId = new Map<string, SavedResume>();
  const addNewest = (resume: SavedResume) => {
    const current = byId.get(resume.id);
    if (!current || resume.updatedAt >= current.updatedAt) {
      byId.set(resume.id, resume);
    }
  };

  snapshot.docs.forEach((resumeDoc) => {
    const data = resumeDoc.data() as Partial<SavedResume> & Partial<UserResumesDoc>;

    // Temporary backwards compatibility for the old Resumes/{userId}.resumes[] shape.
    if (Array.isArray(data.resumes)) {
      data.resumes.forEach(addNewest);
      return;
    }

    if (data.id && data.content && data.fileName) {
      addNewest(data as SavedResume);
    }
  });

  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getResume(resumeId: string): Promise<SavedResume | null> {
  if (isE2EMode()) {
    return getAllE2EResumes().find((resume) => resume.id === resumeId) ?? null;
  }

  const resumeDocRef = doc(db, COLLECTION_NAME, resumeId);
  const snapshot = await getDoc(resumeDocRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as Partial<SavedResume>;
  if (!data.id || !data.content || !data.fileName) {
    return null;
  }

  return data as SavedResume;
}

export async function getResumeForUser(userId: string, resumeId: string): Promise<SavedResume | null> {
  if (isE2EMode()) {
    return getE2EResumes(userId).find((resume) => resume.id === resumeId) ?? null;
  }

  const resume = await getResume(resumeId);
  if (resume) {
    return resume;
  }

  // Temporary backwards compatibility for old Resumes/{userId}.resumes[] data.
  const legacyDocRef = doc(db, COLLECTION_NAME, userId);
  const legacySnapshot = await getDoc(legacyDocRef);
  if (!legacySnapshot.exists()) {
    return null;
  }

  const legacyData = legacySnapshot.data() as Partial<UserResumesDoc>;
  if (!Array.isArray(legacyData.resumes)) {
    return null;
  }

  return legacyData.resumes.find((legacyResume) => legacyResume.id === resumeId) ?? null;
}

export interface SaveResumeOptions {
  targetRole?: string;
  experienceLevel?: string;
  jobDescription?: string;
  /** For recruiter ranking display when resume is indexed by role */
  userEmail?: string;
  userName?: string;
}

export async function saveResume(
  userId: string,
  category: ResumeCategory,
  label: string,
  content: string,
  fileName: string,
  existingId?: string,
  options?: SaveResumeOptions
): Promise<SavedResume> {
  if (isE2EMode()) {
    return saveE2EResume(userId, category, label, content, fileName, existingId, options);
  }

  console.info('[resumeService] saveResume started', {
    userId,
    category,
    label,
    fileName,
    existingId,
    targetRole: options?.targetRole,
    experienceLevel: options?.experienceLevel,
    contentLength: content.length,
  });
  const existingResumes = await getUserResumes(userId);
  const { targetRole, experienceLevel, jobDescription, userEmail, userName } = options ?? {};

  const now = Date.now();

  // One resume per category: if a resume for this category exists, update it instead of creating
  const existingByCategory = existingResumes.find(r => r.category === category);
  const idToUpdate = existingId ?? existingByCategory?.id;

  if (idToUpdate) {
    const existingResume = existingResumes.find(r => r.id === idToUpdate);
    if (!existingResume) {
      console.error('[resumeService] saveResume update failed: existing resume not found', {
        userId,
        idToUpdate,
        existingResumeIds: existingResumes.map((resume) => resume.id),
      });
      throw new Error('Resume not found');
    }

    const updatedResume: SavedResume = {
      ...existingResume,
      category,
      label,
      content,
      fileName,
      updatedAt: now,
      ...(targetRole !== undefined && { targetRole }),
      ...(experienceLevel !== undefined && { experienceLevel }),
      ...(jobDescription !== undefined && { jobDescription }),
    };

    try {
      console.info('[resumeService] Writing updated resume document', {
        path: `${COLLECTION_NAME}/${updatedResume.id}`,
        userId,
      });
      await setDoc(doc(db, COLLECTION_NAME, updatedResume.id), updatedResume);
      console.info('[resumeService] Syncing updated resume role index', {
        resumeId: updatedResume.id,
        targetRole: updatedResume.targetRole,
      });
      await syncResumeByRole(updatedResume, userEmail, userName, existingResume);
    } catch (error) {
      console.error('[resumeService] saveResume update failed during Firestore write/index sync:', {
        resumeId: updatedResume.id,
        userId,
        targetRole: updatedResume.targetRole,
        error,
      });
      throw error;
    }
    console.info('[resumeService] saveResume update succeeded', {
      resumeId: updatedResume.id,
      userId,
    });
    return updatedResume;
  } else {
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
      ...(targetRole !== undefined && { targetRole }),
      ...(experienceLevel !== undefined && { experienceLevel }),
      ...(jobDescription !== undefined && { jobDescription }),
    };

    try {
      console.info('[resumeService] Writing new resume document', {
        path: `${COLLECTION_NAME}/${newResume.id}`,
        userId,
      });
      await setDoc(doc(db, COLLECTION_NAME, newResume.id), newResume);
      console.info('[resumeService] Syncing new resume role index', {
        resumeId: newResume.id,
        targetRole: newResume.targetRole,
      });
      await syncResumeByRole(newResume, userEmail, userName);
    } catch (error) {
      console.error('[resumeService] saveResume create failed during Firestore write/index sync:', {
        resumeId: newResume.id,
        userId,
        targetRole: newResume.targetRole,
        error,
      });
      throw error;
    }
    console.info('[resumeService] saveResume create succeeded', {
      resumeId: newResume.id,
      userId,
    });
    return newResume;
  }
}

export async function deleteResume(userId: string, resumeId: string): Promise<void> {
  if (isE2EMode()) {
    deleteE2EResume(userId, resumeId);
    return;
  }

  const existingResumes = await getUserResumes(userId);
  const resume = existingResumes.find(r => r.id === resumeId);
  if (!resume) {
    throw new Error('Resume not found');
  }

  const resumeDocRef = doc(db, COLLECTION_NAME, resumeId);
  const resumeSnapshot = await getDoc(resumeDocRef);
  if (resumeSnapshot.exists()) {
    await deleteDoc(resumeDocRef);
  }

  // Temporary cleanup for users who still have the old Resumes/{userId}.resumes[] document.
  const legacyDocRef = doc(db, COLLECTION_NAME, userId);
  const legacySnapshot = await getDoc(legacyDocRef);
  const legacyData = legacySnapshot.exists() ? legacySnapshot.data() as Partial<UserResumesDoc> : null;
  if (Array.isArray(legacyData?.resumes)) {
    await setDoc(legacyDocRef, {
      userId,
      resumes: legacyData.resumes.filter(r => r.id !== resumeId),
      updatedAt: Date.now(),
    });
  }

  if (resume?.targetRole) {
    await removeResumeFromByRole(resumeId, resume.targetRole);
  }
}

export async function updateResumeLabel(
  userId: string,
  resumeId: string,
  label: string
): Promise<void> {
  const existingResumes = await getUserResumes(userId);
  const resume = existingResumes.find(r => r.id === resumeId);
  if (!resume) {
    throw new Error('Resume not found');
  }

  const updatedResume = { ...resume, label, updatedAt: Date.now() };
  await setDoc(doc(db, COLLECTION_NAME, resumeId), updatedResume);
  await syncResumeByRole(updatedResume, undefined, undefined, resume);
}

export async function updateResumeCategory(
  userId: string,
  resumeId: string,
  category: ResumeCategory
): Promise<void> {
  const existingResumes = await getUserResumes(userId);
  const resume = existingResumes.find(r => r.id === resumeId);
  if (!resume) {
    throw new Error('Resume not found');
  }

  const updatedResume = { ...resume, category, updatedAt: Date.now() };
  await setDoc(doc(db, COLLECTION_NAME, resumeId), updatedResume);
}
