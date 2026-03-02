import { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, Clock, ExternalLink, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { getJobOpportunities } from '../../services/jobOpportunityService';
import { ROLES, EXPERIENCE_LEVELS } from '../RoleFilters';
import type { JobOpportunity } from '../../types/jobOpportunity';
import styles from './JobOpportunitiesList.module.css';

export function JobOpportunitiesList() {
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const jobList = await getJobOpportunities();
      setJobs(jobList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load job opportunities';
      setError(message);
      console.error('Failed to load jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (jobId: string) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const getRoleLabel = (roleValue: string) => {
    return ROLES.find(r => r.value === roleValue)?.label || roleValue;
  };

  const getExperienceLabel = (expValue: string) => {
    return EXPERIENCE_LEVELS.find(e => e.value === expValue)?.label || expValue;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Briefcase size={24} />
          <h2>Job Opportunities</h2>
        </div>
        <div className={styles.loading}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading job opportunities...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Briefcase size={24} />
          <h2>Job Opportunities</h2>
        </div>
        <div className={styles.error}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Briefcase size={24} />
        <h2>Job Opportunities</h2>
        <span className={styles.count}>{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} available</span>
      </div>

      {jobs.length === 0 ? (
        <div className={styles.empty}>
          <Briefcase size={48} className={styles.emptyIcon} />
          <p>No job opportunities available at the moment.</p>
          <p className={styles.emptySubtext}>Check back later for new openings!</p>
        </div>
      ) : (
        <div className={styles.jobsList}>
          {jobs.map((job) => (
            <div key={job.id} className={styles.jobCard}>
              <div className={styles.jobHeader} onClick={() => toggleExpand(job.id)}>
                <div className={styles.jobTitleSection}>
                  <h3 className={styles.jobTitle}>{job.title}</h3>
                  <p className={styles.companyName}>{job.company}</p>
                </div>
                <div className={styles.jobMeta}>
                  <span className={styles.badge}>{getRoleLabel(job.role)}</span>
                  <span className={styles.badge}>{getExperienceLabel(job.experienceLevel)}</span>
                  {expandedJobId === job.id ? (
                    <ChevronUp size={20} className={styles.expandIcon} />
                  ) : (
                    <ChevronDown size={20} className={styles.expandIcon} />
                  )}
                </div>
              </div>

              <div className={styles.jobQuickInfo}>
                {job.location && (
                  <div className={styles.infoItem}>
                    <MapPin size={16} />
                    <span>{job.location}</span>
                  </div>
                )}
                {job.salaryRange && (
                  <div className={styles.infoItem}>
                    <DollarSign size={16} />
                    <span>{job.salaryRange}</span>
                  </div>
                )}
                <div className={styles.infoItem}>
                  <Clock size={16} />
                  <span>Posted {formatDate(job.createdAt)}</span>
                </div>
              </div>

              {expandedJobId === job.id && (
                <div className={styles.jobDetails}>
                  <div className={styles.section}>
                    <h4>Job Description</h4>
                    <p className={styles.description}>{job.description}</p>
                  </div>

                  {job.requirements && job.requirements.length > 0 && (
                    <div className={styles.section}>
                      <h4>Requirements</h4>
                      <ul className={styles.list}>
                        {job.requirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {job.benefits && job.benefits.length > 0 && (
                    <div className={styles.section}>
                      <h4>Benefits</h4>
                      <ul className={styles.list}>
                        {job.benefits.map((benefit, index) => (
                          <li key={index}>{benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {job.applicationLink && (
                    <div className={styles.applySection}>
                      <a
                        href={job.applicationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.applyBtn}
                      >
                        <ExternalLink size={16} />
                        Apply Now
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
