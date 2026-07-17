import type { User } from '../context/slices/UserSlice';
import type { JobApplication } from '../types/jobApplication';
import type { JobOpportunity, JobOpportunityFormData } from '../types/jobOpportunity';
import type { SavedResume, ResumeCategory } from '../types/resume';

export const E2E_USER_STORAGE_KEY = 'talentlens_e2e_user';
const E2E_RESUMES_STORAGE_KEY = 'talentlens_e2e_resumes';
const E2E_JOBS_STORAGE_KEY = 'talentlens_e2e_jobs';
const E2E_APPLICATIONS_STORAGE_KEY = 'talentlens_e2e_applications';

export function isE2EMode() {
  return import.meta.env.VITE_E2E_MODE === 'true';
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseBrowserStorage()) return fallback;

  const value = window.localStorage.getItem(key);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseBrowserStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getE2EUser(): User | null {
  if (!isE2EMode()) return null;
  return readJson<User | null>(E2E_USER_STORAGE_KEY, null);
}

export function setE2EUser(user: User | null) {
  if (!isE2EMode() || !canUseBrowserStorage()) return;
  if (user) {
    writeJson(E2E_USER_STORAGE_KEY, user);
  } else {
    window.localStorage.removeItem(E2E_USER_STORAGE_KEY);
  }
}

const now = 1_750_000_000_000;

function parseLines(value?: string): string[] {
  return value
    ? value.split('\n').map((item) => item.trim()).filter(Boolean)
    : [];
}

function defaultResumes(userId: string): SavedResume[] {
  return [
    {
      id: `${userId}_resume_frontend`,
      userId,
      category: 'frontend',
      label: 'Frontend Resume',
      content:
        'Frontend engineer with React, TypeScript, accessibility, testing, performance optimization, and design system experience.',
      fileName: 'frontend-resume.pdf',
      targetRole: 'frontend',
      experienceLevel: 'mid',
      jobDescription: 'React and TypeScript engineer role.',
      createdAt: now - 10_000,
      updatedAt: now - 5_000,
    },
  ];
}

const defaultJobs: JobOpportunity[] = [
  {
    id: 'e2e_job_frontend',
    recruiterId: 'e2e-recruiter',
    recruiterEmail: 'recruiter@example.com',
    title: 'Frontend Engineer',
    company: 'TalentLens Labs',
    description: 'Build polished React interfaces for candidate and recruiter workflows.',
    role: 'frontend',
    experienceLevel: 'mid',
    location: 'Remote',
    salaryRange: '$120k - $150k',
    requirements: ['React', 'TypeScript', 'Testing'],
    benefits: ['Remote work', 'Learning budget'],
    applicationLink: '',
    createdAt: now,
    updatedAt: now,
    isActive: true,
  },
];

export function getE2EResumes(userId: string): SavedResume[] {
  const resumes = readJson<SavedResume[] | null>(E2E_RESUMES_STORAGE_KEY, null);
  if (resumes) {
    return resumes.filter((resume) => resume.userId === userId).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  const seeded = defaultResumes(userId);
  writeJson(E2E_RESUMES_STORAGE_KEY, seeded);
  return seeded;
}

export function getAllE2EResumes(): SavedResume[] {
  return readJson<SavedResume[] | null>(E2E_RESUMES_STORAGE_KEY, null) ?? [];
}

export function getE2EJobs(recruiterId?: string): JobOpportunity[] {
  const jobs = readJson<JobOpportunity[] | null>(E2E_JOBS_STORAGE_KEY, null) ?? defaultJobs;
  if (!readJson<JobOpportunity[] | null>(E2E_JOBS_STORAGE_KEY, null)) {
    writeJson(E2E_JOBS_STORAGE_KEY, jobs);
  }

  return jobs
    .filter((job) => job.isActive)
    .filter((job) => !recruiterId || job.recruiterId === recruiterId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getE2EJob(jobId: string): JobOpportunity | null {
  return getE2EJobs().find((job) => job.id === jobId) ?? null;
}

export function createE2EJob(recruiterId: string, formData: JobOpportunityFormData): JobOpportunity {
  const jobs = readJson<JobOpportunity[] | null>(E2E_JOBS_STORAGE_KEY, null) ?? defaultJobs;
  const createdAt = Date.now();
  const job: JobOpportunity = {
    id: `${recruiterId}_${createdAt}`,
    recruiterId,
    recruiterEmail: formData.recruiterEmail,
    title: formData.title,
    company: formData.company,
    description: formData.description,
    role: formData.role,
    experienceLevel: formData.experienceLevel,
    location: formData.location,
    salaryRange: formData.salaryRange,
    requirements: parseLines(formData.requirements),
    benefits: parseLines(formData.benefits),
    applicationLink: formData.applicationLink,
    createdAt,
    updatedAt: createdAt,
    isActive: true,
  };

  writeJson(E2E_JOBS_STORAGE_KEY, [job, ...jobs]);
  return job;
}

export function updateE2EJob(jobId: string, formData: Partial<JobOpportunityFormData>) {
  const jobs = readJson<JobOpportunity[] | null>(E2E_JOBS_STORAGE_KEY, null) ?? defaultJobs;
  const index = jobs.findIndex((job) => job.id === jobId);
  if (index === -1) {
    throw new Error('Job opportunity not found');
  }

  const existing = jobs[index];
  jobs[index] = {
    ...existing,
    ...(formData.recruiterEmail !== undefined && { recruiterEmail: formData.recruiterEmail }),
    ...(formData.title !== undefined && { title: formData.title }),
    ...(formData.company !== undefined && { company: formData.company }),
    ...(formData.description !== undefined && { description: formData.description }),
    ...(formData.role !== undefined && { role: formData.role }),
    ...(formData.experienceLevel !== undefined && { experienceLevel: formData.experienceLevel }),
    ...(formData.location !== undefined && { location: formData.location }),
    ...(formData.salaryRange !== undefined && { salaryRange: formData.salaryRange }),
    ...(formData.applicationLink !== undefined && { applicationLink: formData.applicationLink }),
    ...(formData.requirements !== undefined && {
      requirements: parseLines(formData.requirements),
    }),
    ...(formData.benefits !== undefined && {
      benefits: parseLines(formData.benefits),
    }),
    updatedAt: Date.now(),
  };
  writeJson(E2E_JOBS_STORAGE_KEY, jobs);
}

export function deleteE2EJob(jobId: string) {
  const jobs = readJson<JobOpportunity[] | null>(E2E_JOBS_STORAGE_KEY, null) ?? defaultJobs;
  writeJson(E2E_JOBS_STORAGE_KEY, jobs.filter((job) => job.id !== jobId));
}

export function deactivateE2EJob(jobId: string) {
  const jobs = readJson<JobOpportunity[] | null>(E2E_JOBS_STORAGE_KEY, null) ?? defaultJobs;
  writeJson(
    E2E_JOBS_STORAGE_KEY,
    jobs.map((job) => job.id === jobId ? { ...job, isActive: false, updatedAt: Date.now() } : job)
  );
}

export function saveE2EResume(
  userId: string,
  category: ResumeCategory,
  label: string,
  content: string,
  fileName: string,
  existingId?: string,
  options?: {
    targetRole?: string;
    experienceLevel?: string;
    jobDescription?: string;
  }
): SavedResume {
  const allResumes = readJson<SavedResume[] | null>(E2E_RESUMES_STORAGE_KEY, null) ?? defaultResumes(userId);
  const nowMs = Date.now();
  const existingIndex = existingId
    ? allResumes.findIndex((resume) => resume.id === existingId && resume.userId === userId)
    : allResumes.findIndex((resume) => resume.userId === userId && resume.category === category);

  const resume: SavedResume = {
    ...(existingIndex >= 0 ? allResumes[existingIndex] : {
      id: `${userId}_${nowMs}`,
      userId,
      createdAt: nowMs,
    }),
    category,
    label,
    content,
    fileName,
    targetRole: options?.targetRole,
    experienceLevel: options?.experienceLevel,
    jobDescription: options?.jobDescription,
    updatedAt: nowMs,
  };

  if (existingIndex >= 0) {
    allResumes[existingIndex] = resume;
  } else {
    allResumes.unshift(resume);
  }
  writeJson(E2E_RESUMES_STORAGE_KEY, allResumes);
  return resume;
}

export function deleteE2EResume(userId: string, resumeId: string) {
  const resumes = readJson<SavedResume[] | null>(E2E_RESUMES_STORAGE_KEY, null) ?? defaultResumes(userId);
  writeJson(E2E_RESUMES_STORAGE_KEY, resumes.filter((resume) => resume.id !== resumeId));
}

export function getE2EApplications(candidateId?: string): JobApplication[] {
  const applications = readJson<JobApplication[]>(E2E_APPLICATIONS_STORAGE_KEY, []);
  return applications
    .filter((application) => !candidateId || application.candidateId === candidateId)
    .sort((a, b) => b.appliedAt - a.appliedAt);
}

export function createE2EApplication(application: JobApplication) {
  const applications = readJson<JobApplication[]>(E2E_APPLICATIONS_STORAGE_KEY, []);
  writeJson(E2E_APPLICATIONS_STORAGE_KEY, [application, ...applications]);
}
