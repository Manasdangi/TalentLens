import { useState, useEffect } from 'react';
import { Briefcase, Plus, Loader2, CheckCircle } from 'lucide-react';
import { RoleFilters, type RoleType, type ExperienceLevel } from '../RoleFilters';
import { createJobOpportunity, updateJobOpportunity } from '../../services/jobOpportunityService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { useAuth } from '../../context/AuthContext';
import type { JobOpportunity, JobOpportunityFormData } from '../../types/jobOpportunity';
import styles from './JobOpportunityUploader.module.css';

const emptyFormData: JobOpportunityFormData = {
  recruiterEmail: '',
  title: '',
  company: '',
  description: '',
  role: '',
  experienceLevel: '',
  location: '',
  salaryRange: '',
  requirements: '',
  benefits: '',
  applicationLink: '',
};

function jobToFormData(job: JobOpportunity): JobOpportunityFormData {
  return {
    recruiterEmail: job.recruiterEmail ?? '',
    title: job.title,
    company: job.company,
    description: job.description,
    role: job.role,
    experienceLevel: job.experienceLevel,
    location: job.location ?? '',
    salaryRange: job.salaryRange ?? '',
    requirements: job.requirements?.join('\n') ?? '',
    benefits: job.benefits?.join('\n') ?? '',
    applicationLink: job.applicationLink ?? '',
  };
}

interface JobOpportunityUploaderProps {
  /** When set, form is in edit mode for this job. */
  existingJob?: JobOpportunity | null;
  /** Called after a job is successfully posted or updated (e.g. to refresh list and close modal). */
  onJobPosted?: () => void;
}

export function JobOpportunityUploader({ existingJob, onJobPosted }: JobOpportunityUploaderProps = {}) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<JobOpportunityFormData>(emptyFormData);

  const isEditMode = !!existingJob;

  // Prefill from existing job when in edit mode; otherwise reset form (with recruiter email if available)
  useEffect(() => {
    if (existingJob) {
      setFormData(jobToFormData(existingJob));
    } else {
      setFormData(user?.email ? { ...emptyFormData, recruiterEmail: user.email } : emptyFormData);
    }
  }, [existingJob?.id, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || user.userType !== 'recruiter') {
      setError('Only recruiters can post job opportunities');
      return;
    }

    if (!formData.recruiterEmail?.trim() || !formData.title || !formData.company || !formData.description || !formData.role || !formData.experienceLevel) {
      setError('Please fill in all required fields (including your email)');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      if (isEditMode && existingJob) {
        await updateJobOpportunity(existingJob.id, formData);
        setSuccess(true);
        onJobPosted?.();
        setTimeout(() => setSuccess(false), 2000);
      } else {
        await createJobOpportunity(user.id, formData);
        setSuccess(true);
        onJobPosted?.();
        setFormData(prev => ({ ...prev, ...emptyFormData, recruiterEmail: prev.recruiterEmail }));
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      const message = getErrorMessage(err, isEditMode ? 'Failed to update job' : 'Failed to create job opportunity');
      setError(message);
      console.error(isEditMode ? 'Failed to update job:' : 'Failed to create job opportunity:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof JobOpportunityFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Briefcase size={24} />
        <h2>{isEditMode ? 'Edit Job' : 'Post Job Opportunity'}</h2>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label>Your Email *</label>
          <input
            type="email"
            value={formData.recruiterEmail}
            onChange={(e) => handleInputChange('recruiterEmail', e.target.value)}
            placeholder="your.email@company.com"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Job Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Senior Frontend Developer"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Company Name *</label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="e.g., Tech Corp"
              required
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Job Description *</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe the role, responsibilities, and what you're looking for..."
            required
            rows={6}
            className={styles.textarea}
          />
        </div>

        <RoleFilters
          selectedRole={formData.role as RoleType}
          selectedExperience={formData.experienceLevel as ExperienceLevel}
          onRoleChange={(role) => handleInputChange('role', role)}
          onExperienceChange={(exp) => handleInputChange('experienceLevel', exp)}
        />

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="e.g., San Francisco, CA or Remote"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Salary Range</label>
            <input
              type="text"
              value={formData.salaryRange}
              onChange={(e) => handleInputChange('salaryRange', e.target.value)}
              placeholder="e.g., $100k - $150k"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Requirements * (one per line)</label>
          <textarea
            value={formData.requirements}
            onChange={(e) => handleInputChange('requirements', e.target.value)}
            placeholder="• 3+ years of experience&#10;• Strong knowledge of React&#10;• Experience with TypeScript"
            required
            rows={5}
            className={styles.textarea}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Benefits (one per line)</label>
          <textarea
            value={formData.benefits}
            onChange={(e) => handleInputChange('benefits', e.target.value)}
            placeholder="• Health insurance&#10;• 401k matching&#10;• Flexible work hours"
            rows={4}
            className={styles.textarea}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Application Link</label>
          <input
            type="url"
            value={formData.applicationLink}
            onChange={(e) => handleInputChange('applicationLink', e.target.value)}
            placeholder="https://company.com/careers/apply"
            className={styles.input}
          />
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {success && (
          <div className={styles.success}>
            <CheckCircle size={16} />
            {isEditMode ? 'Job updated successfully!' : 'Job opportunity posted successfully!'}
          </div>
        )}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className={styles.spinner} />
              {isEditMode ? 'Saving...' : 'Posting...'}
            </>
          ) : (
            <>
              {isEditMode ? null : <Plus size={16} />}
              {isEditMode ? 'Save changes' : 'Post Job Opportunity'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
