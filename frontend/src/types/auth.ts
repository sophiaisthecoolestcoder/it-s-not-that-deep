export type EmployeeRole =
  | 'admin'
  | 'manager'
  | 'receptionist'
  | 'housekeeper'
  | 'spa_therapist'
  | 'chef'
  | 'waiter'
  | 'concierge'
  | 'maintenance';

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  admin: 'Admin',
  manager: 'Leitung',
  receptionist: 'Rezeption',
  housekeeper: 'Housekeeping',
  spa_therapist: 'SPA',
  chef: 'Küche',
  waiter: 'Service',
  concierge: 'Concierge',
  maintenance: 'Haustechnik',
};

export type ModuleKey = 'home' | 'angebote' | 'belegung' | 'staff' | 'assistant';

export interface AuthUser {
  id: number;
  username: string;
  role: EmployeeRole;
  employee_id: number | null;
  modules: ModuleKey[];
}
