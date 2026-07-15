import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import type { JobApplication } from '../types/jobApplication';

const COLLECTION_NAME = 'JobApplications';

export async function applyForJob(
  jobId: string,
  candidateId: string,
  candidateEmail: string,
  candidateName: string,
  resumeId: string,
  resumeLabel: string,
  fileName: string
): Promise<JobApplication> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('You must be signed in to apply.');
  }
  if (candidateId !== uid) {
    throw new Error('Application must use the signed-in user.');
  }

  const id = `${jobId}_${uid}`;
  const docRef = doc(db, COLLECTION_NAME, id);
  const alreadyApplied = (await getMyApplications(uid)).some((app) => app.jobId === jobId);
  if (alreadyApplied) {
    throw new Error('You have already applied for this job.');
  }

  const now = Date.now();
  const application: JobApplication = {
    id,
    jobId,
    candidateId: uid,
    candidateEmail,
    candidateName,
    resumeId,
    resumeLabel,
    fileName,
    appliedAt: now,
  };

  await setDoc(docRef, application);
  return application;
}

export async function getApplicationsByJob(jobId: string): Promise<JobApplication[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('jobId', '==', jobId)
  );
  const snapshot = await getDocs(q);
  const apps = snapshot.docs.map((d) => d.data() as JobApplication);
  return apps.sort((a, b) => b.appliedAt - a.appliedAt);
}

export async function getMyApplications(candidateId: string): Promise<JobApplication[]> {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('candidateId', '==', candidateId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as JobApplication).sort((a, b) => b.appliedAt - a.appliedAt);
}
