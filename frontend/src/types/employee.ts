import type { EmployeeRole } from './auth';

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
}
