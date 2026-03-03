import { useState, useEffect } from 'react';
import { Briefcase, MapPin, DollarSign, Clock, ExternalLink, Loader2, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { getJobOpportunities } from '../../services/jobOpportunityService';
import { getRoleLabel, getExperienceLabel } from '../../utils/roleExperienceLabels';
import { getErrorMessage } from '../../utils/getErrorMessage';
import { RankedCandidates } from '../RankedCandidates';
import type { JobOpportunity } from '../../types/jobOpportunity';
import styles from './JobOpportunitiesList.module.css';

interface JobOpportunitiesListProps {
  /** When set, shows only this recruiter's jobs (e.g. "Your Posted Jobs"). */
  recruiterId?: string;
  /** Increment to refetch the list (e.g. after posting a new job). */
  refreshTrigger?: number;
}

export function JobOpportunitiesList({ recruiterId, refreshTrigger }: JobOpportunitiesListProps = {}) {
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, [recruiterId, refreshTrigger]);

  const loadJobs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const jobList = await getJobOpportunities(recruiterId);
      setJobs(jobList);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load job opportunities'));
      console.error('Failed to load jobs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (jobId: string) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const title = recruiterId ? 'Your Posted Jobs' : 'Job Opportunities';
  const loadingMessage = recruiterId ? 'Loading your jobs...' : 'Loading job opportunities...';
  const emptyMessage = recruiterId
    ? "You haven't posted any jobs yet."
    : 'No job opportunities available at the moment.';
  const emptySubtext = recruiterId
    ? 'Post your first job above to get started.'
    : 'Check back later for new openings!';

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Briefcase size={24} />
          <h2>{title}</h2>
        </div>
        <div className={styles.loading}>
          <Loader2 size={24} className={styles.spinner} />
          <span>{loadingMessage}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Briefcase size={24} />
          <h2>{title}</h2>
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
        <h2>{title}</h2>
        <span className={styles.count}>{jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} {recruiterId ? 'posted' : 'available'}</span>
      </div>

      {jobs.length === 0 ? (
        <div className={styles.empty}>
          <Briefcase size={48} className={styles.emptyIcon} />
          <p>{emptyMessage}</p>
          <p className={styles.emptySubtext}>{emptySubtext}</p>
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
                  {job.recruiterEmail && (
                    <div className={styles.section}>
                      <h4>Recruiter Contact</h4>
                      <a
                        href={`mailto:${job.recruiterEmail}`}
                        className={styles.recruiterEmail}
                      >
                        <Mail size={16} />
                        {job.recruiterEmail}
                      </a>
                    </div>
                  )}

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

                  {recruiterId && (
                    <RankedCandidates job={job} />
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
