export type UserType = 'candidate' | 'recruiter';

export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  userType?: UserType;
}

export interface UserSlice {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setUserType: (userType: UserType) => Promise<void>;
}
