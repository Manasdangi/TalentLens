import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { JobOpportunity, JobOpportunityFormData } from '../types/jobOpportunity';

const COLLECTION_NAME = 'JobOpportunities';

export async function getJobOpportunities(recruiterId?: string): Promise<JobOpportunity[]> {
  let q;
  
  if (recruiterId) {
    q = query(
      collection(db, COLLECTION_NAME),
      where('recruiterId', '==', recruiterId),
      where('isActive', '==', true)
    );
  } else {
    q = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true)
    );
  }

  const snapshot = await getDocs(q);
  const jobs = snapshot.docs.map(doc => doc.data() as JobOpportunity);
  // Sort by createdAt in memory (newest first) to avoid requiring a composite index
  return jobs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getJobOpportunity(jobId: string): Promise<JobOpportunity | null> {
  const jobDocRef = doc(db, COLLECTION_NAME, jobId);
  const snapshot = await getDoc(jobDocRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return snapshot.data() as JobOpportunity;
}

export async function createJobOpportunity(
  recruiterId: string,
  formData: JobOpportunityFormData
): Promise<JobOpportunity> {
  const now = Date.now();
  const jobId = `${recruiterId}_${now}`;
  
  // Parse requirements and benefits from strings
  const requirements = formData.requirements
    .split('\n')
    .map(r => r.trim())
    .filter(r => r.length > 0);
  
  const benefits = formData.benefits
    ? formData.benefits.split('\n').map(b => b.trim()).filter(b => b.length > 0)
    : undefined;

  const jobOpportunity: JobOpportunity = {
    id: jobId,
    recruiterId,
    recruiterEmail: formData.recruiterEmail,
    title: formData.title,
    company: formData.company,
    description: formData.description,
    role: formData.role,
    experienceLevel: formData.experienceLevel,
    location: formData.location,
    salaryRange: formData.salaryRange,
    requirements,
    benefits,
    applicationLink: formData.applicationLink,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };

  const jobDocRef = doc(db, COLLECTION_NAME, jobId);
  await setDoc(jobDocRef, jobOpportunity);
  
  return jobOpportunity;
}

export async function updateJobOpportunity(
  jobId: string,
  formData: Partial<JobOpportunityFormData>
): Promise<void> {
  const jobDocRef = doc(db, COLLECTION_NAME, jobId);
  const existingJob = await getJobOpportunity(jobId);
  
  if (!existingJob) {
    throw new Error('Job opportunity not found');
  }

  const updateData: Partial<JobOpportunity> = {
    updatedAt: Date.now(),
    ...(formData.recruiterEmail !== undefined && { recruiterEmail: formData.recruiterEmail }),
    ...(formData.title !== undefined && { title: formData.title }),
    ...(formData.company !== undefined && { company: formData.company }),
    ...(formData.description !== undefined && { description: formData.description }),
    ...(formData.role !== undefined && { role: formData.role }),
    ...(formData.experienceLevel !== undefined && { experienceLevel: formData.experienceLevel }),
    ...(formData.location !== undefined && { location: formData.location }),
    ...(formData.salaryRange !== undefined && { salaryRange: formData.salaryRange }),
    ...(formData.applicationLink !== undefined && { applicationLink: formData.applicationLink }),
  };

  if (formData.requirements !== undefined) {
    updateData.requirements = formData.requirements
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);
  }
  if (formData.benefits !== undefined) {
    updateData.benefits = formData.benefits
      ? formData.benefits.split('\n').map(b => b.trim()).filter(b => b.length > 0)
      : undefined;
  }

  await setDoc(jobDocRef, updateData, { merge: true });
}

export async function deleteJobOpportunity(jobId: string): Promise<void> {
  const jobDocRef = doc(db, COLLECTION_NAME, jobId);
  await deleteDoc(jobDocRef);
}

export async function deactivateJobOpportunity(jobId: string): Promise<void> {
  const jobDocRef = doc(db, COLLECTION_NAME, jobId);
  await setDoc(jobDocRef, { isActive: false, updatedAt: Date.now() }, { merge: true });
}
