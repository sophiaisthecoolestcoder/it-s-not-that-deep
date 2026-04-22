import type { EmployeeRole } from './auth';

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: EmployeeRole;
  department: string | null;
  position: string | null;
  employment_started_on: string | null;
  employment_ended_on: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: EmployeeRole;
  department?: string | null;
  position?: string | null;
  employment_started_on?: string | null;
  employment_ended_on?: string | null;
  active?: boolean;
  notes?: string | null;
}

export interface EmployeeFilters {
  department?: string;
  role?: EmployeeRole;
  active?: boolean;
  search?: string;
}
