import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SavedResume } from '../types/resume';
import type { ResumeByRoleDoc } from '../types/resumeByRole';

const COLLECTION_NAME = 'ResumeByRole';

/**
 * Sync a resume to the ResumeByRole index when it has a target role.
 * Call after save; call with targetRole undefined to remove from index (e.g. on update/delete).
 */
export async function syncResumeByRole(
  resume: SavedResume,
  userEmail?: string,
  userName?: string
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, resume.id);

  if (resume.targetRole) {
    const docData: ResumeByRoleDoc = {
      userId: resume.userId,
      resumeId: resume.id,
      targetRole: resume.targetRole,
      experienceLevel: resume.experienceLevel,
      content: resume.content,
      label: resume.label,
      ...(userEmail !== undefined && { userEmail }),
      ...(userName !== undefined && { userName }),
      updatedAt: resume.updatedAt,
    };
    await setDoc(docRef, docData);
  } else {
    try {
      await deleteDoc(docRef);
    } catch {
      // Doc may not exist if it was never indexed
    }
  }
}

/**
 * Remove a resume from the ResumeByRole index (e.g. when candidate deletes the resume).
 */
export async function removeResumeFromByRole(resumeId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, resumeId);
  try {
    await deleteDoc(docRef);
  } catch {
    // Doc may not exist
  }
}

/**
 * Get all resumes indexed for a given target role (and optionally experience level).
 * Only callable by recruiters (Firestore rules enforce userType == 'recruiter').
 */
export async function getResumesByRole(
  targetRole: string,
  experienceLevel?: string
): Promise<ResumeByRoleDoc[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('targetRole', '==', targetRole)
  );
  const snapshot = await getDocs(q);
  const docs = snapshot.docs.map((d) => d.data() as ResumeByRoleDoc);
  if (experienceLevel) {
    return docs.filter((d) => d.experienceLevel === experienceLevel);
  }
  return docs;
}
