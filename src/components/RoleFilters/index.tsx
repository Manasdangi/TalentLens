import { Briefcase, Clock, ChevronDown } from 'lucide-react';
import { ROLES, EXPERIENCE_LEVELS, type RoleType, type ExperienceLevel } from '../../constants';
import styles from './RoleFilters.module.css';

export { ROLES, EXPERIENCE_LEVELS, type RoleType, type ExperienceLevel };

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

