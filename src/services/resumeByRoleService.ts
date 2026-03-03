import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { SavedResume } from '../types/resume';
import type { ResumeByRoleDoc } from '../types/resumeByRole';
import { ROLES } from '../components/RoleFilters';

const COLLECTION_NAME = 'ResumeByRole';
const RESUMES_SUBCOLLECTION = 'resumes';

/** Role document IDs in Firestore (ResumeByRole/{roleId}) */
const ROLE_IDS: string[] = ROLES.map((r) => r.value);

/**
 * Resolve job role (value or display label) to Firestore role document ID.
 * Used when ranking candidates so we always query the correct ResumeByRole/{roleId}/resumes.
 */
export function getRoleIdForQuery(role: string): string | null {
  if (!role || typeof role !== 'string') return null;
  const trimmed = role.trim().toLowerCase();
  // Already a known role id (e.g. frontend, backend)
  if (ROLE_IDS.includes(trimmed)) return trimmed;
  // Map from display label (e.g. "Frontend Developer") to role id
  const byLabel = ROLES.find(
    (r) => r.label.toLowerCase() === trimmed || r.label.toLowerCase().includes(trimmed)
  );
  return byLabel ? byLabel.value : null;
}

/**
 * Sync a resume to the ResumeByRole index under the role document.
 * Writes to ResumeByRole/{targetRole}/resumes/{resumeId}.
 * Call after save. When updating, pass previousResume to remove from old role if targetRole changed.
 */
export async function syncResumeByRole(
  resume: SavedResume,
  userEmail?: string,
  userName?: string,
  previousResume?: SavedResume
): Promise<void> {
  const roleId = resume.targetRole;

  // If targetRole changed, remove from previous role's subcollection
  if (previousResume?.targetRole && previousResume.targetRole !== roleId) {
    const oldRef = doc(db, COLLECTION_NAME, previousResume.targetRole, RESUMES_SUBCOLLECTION, previousResume.id);
    try {
      await deleteDoc(oldRef);
    } catch {
      // Doc may not exist
    }
  }

  if (roleId) {
    const docRef = doc(db, COLLECTION_NAME, roleId, RESUMES_SUBCOLLECTION, resume.id);
    const docData: ResumeByRoleDoc = {
      userId: resume.userId,
      resumeId: resume.id,
      targetRole: roleId,
      experienceLevel: resume.experienceLevel,
      content: resume.content,
      label: resume.label,
      ...(userEmail !== undefined && { userEmail }),
      ...(userName !== undefined && { userName }),
      updatedAt: resume.updatedAt,
    };
    await setDoc(docRef, docData);
  } else if (previousResume?.targetRole) {
    // Resume no longer has targetRole; remove from previous role
    const oldRef = doc(db, COLLECTION_NAME, previousResume.targetRole, RESUMES_SUBCOLLECTION, previousResume.id);
    try {
      await deleteDoc(oldRef);
    } catch {
      // Doc may not exist
    }
  }
}

/**
 * Remove a resume from the ResumeByRole index (e.g. when candidate deletes the resume).
 * Requires targetRole so we know which role document's resumes subcollection to update.
 */
export async function removeResumeFromByRole(resumeId: string, targetRole: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, targetRole, RESUMES_SUBCOLLECTION, resumeId);
  try {
    await deleteDoc(docRef);
  } catch {
    // Doc may not exist
  }
}

/**
 * Get all resumes indexed for a given target role (and optionally experience level).
 * Role can be the Firestore role id (e.g. "frontend") or display name (e.g. "Frontend Developer").
 * Reads from ResumeByRole/{roleId}/resumes. Only callable by recruiters (Firestore rules).
 */
export async function getResumesByRole(
  targetRole: string,
  experienceLevel?: string
): Promise<ResumeByRoleDoc[]> {
  const roleId = getRoleIdForQuery(targetRole);
  if (!roleId) return [];
  const resumesRef = collection(db, COLLECTION_NAME, roleId, RESUMES_SUBCOLLECTION);
  const snapshot = await getDocs(resumesRef);
  const docs = snapshot.docs.map((d) => d.data() as ResumeByRoleDoc);
  if (experienceLevel) {
    return docs.filter((d) => d.experienceLevel === experienceLevel);
  }
  return docs;
}
