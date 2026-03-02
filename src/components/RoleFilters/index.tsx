import { Briefcase, Clock, ChevronDown } from 'lucide-react';
import styles from './RoleFilters.module.css';

export const ROLES = [
  { value: 'frontend', label: 'Frontend Developer' },
  { value: 'backend', label: 'Backend Developer' },
  { value: 'fullstack', label: 'Full Stack Developer' },
  { value: 'react_native', label: 'React Native Developer' },
  { value: 'ios', label: 'iOS Developer' },
  { value: 'android', label: 'Android Developer' },
  { value: 'flutter', label: 'Flutter Developer' },
  { value: 'devops', label: 'DevOps Engineer' },
  { value: 'data', label: 'Data Engineer' },
  { value: 'ml', label: 'ML Engineer' },
  { value: 'other', label: 'Other' },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: 'fresher', label: 'Fresher (0-1 years)' },
  { value: 'junior', label: 'Junior (1-2 years)' },
  { value: 'mid', label: 'Mid-Level (2-4 years)' },
  { value: 'senior', label: 'Senior (4-7 years)' },
  { value: 'lead', label: 'Lead (7-10 years)' },
  { value: 'principal', label: 'Principal (10+ years)' },
] as const;

export type RoleType = typeof ROLES[number]['value'] | '';
export type ExperienceLevel = typeof EXPERIENCE_LEVELS[number]['value'] | '';

interface RoleFiltersProps {
  selectedRole: RoleType;
  selectedExperience: ExperienceLevel;
  onRoleChange: (role: RoleType) => void;
  onExperienceChange: (exp: ExperienceLevel) => void;
}

export function RoleFilters({
  selectedRole,
  selectedExperience,
  onRoleChange,
  onExperienceChange,
}: RoleFiltersProps) {
  return (
    <div className={styles.container}>
      <div className={styles.field}>
        <label className={styles.label}>
          <Briefcase size={16} />
          Target Role
        </label>
        <div className={styles.selectWrapper}>
          <select
            className={`${styles.select} ${!selectedRole ? styles.placeholder : ''}`}
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value as RoleType)}
          >
            <option value="" disabled>Select Role</option>
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className={styles.chevron} aria-hidden />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          <Clock size={16} />
          Experience Level
        </label>
        <div className={styles.selectWrapper}>
          <select
            className={`${styles.select} ${!selectedExperience ? styles.placeholder : ''}`}
            value={selectedExperience}
            onChange={(e) => onExperienceChange(e.target.value as ExperienceLevel)}
          >
            <option value="" disabled>Select Experience</option>
            {EXPERIENCE_LEVELS.map((exp) => (
              <option key={exp.value} value={exp.value}>
                {exp.label}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className={styles.chevron} aria-hidden />
        </div>
      </div>
    </div>
  );
}

