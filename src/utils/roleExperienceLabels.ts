import { ROLES, EXPERIENCE_LEVELS } from '../constants';

export function getRoleLabel(value: string): string {
  return ROLES.find((r) => r.value === value)?.label ?? value;
}

export function getExperienceLabel(value: string): string {
  return EXPERIENCE_LEVELS.find((e) => e.value === value)?.label ?? value;
}
