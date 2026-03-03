import { useState, useEffect } from 'react';
import { Briefcase, Plus, Loader2, CheckCircle } from 'lucide-react';
import { RoleFilters, type RoleType, type ExperienceLevel } from '../RoleFilters';
import { createJobOpportunity } from '../../services/jobOpportunityService';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { useAuth } from '../../context/AuthContext';
import type { JobOpportunityFormData } from '../../types/jobOpportunity';
import styles from './JobOpportunityUploader.module.css';

interface JobOpportunityUploaderProps {
  /** Called after a job is successfully posted (e.g. to refresh recruiter's job list). */
  onJobPosted?: () => void;
}

export function JobOpportunityUploader({ onJobPosted }: JobOpportunityUploaderProps = {}) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<JobOpportunityFormData>({
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
  });

  // Prefill recruiter email when user is available
  useEffect(() => {
    if (user?.email) {
      setFormData(prev => ({ ...prev, recruiterEmail: user.email }));
    }
  }, [user?.email]);

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
      await createJobOpportunity(user.id, formData);
      setSuccess(true);
      onJobPosted?.();
      // Reset form (keep recruiter email)
      setFormData(prev => ({
        ...prev,
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
      }));
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to create job opportunity');
      setError(message);
      console.error('Failed to create job opportunity:', err);
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
        <h2>Post Job Opportunity</h2>
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
            Job opportunity posted successfully!
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
              Posting...
            </>
          ) : (
            <>
              <Plus size={16} />
              Post Job Opportunity
            </>
          )}
        </button>
      </form>
    </div>
  );
}
