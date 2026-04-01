import type { Language } from "../translations";

export type UserRole = "admin" | "user";
export type Theme = "light" | "dark";

export interface UserDoc {
  fullUsername: string;
  username: string;
  tag: string;
  email: string;
  theme?: Theme;
  lang?: Language;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  disabled?: boolean;
  createdAt?: unknown;
}

export interface GuestDemographics {
  age: string;
  gender: string;
  country: string;
  education: string;
  occupation: string;
}
