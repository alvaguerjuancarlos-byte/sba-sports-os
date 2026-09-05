// Espejo de src/hr-coach-hub/hr-coach-hub.types.ts (backend).
export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  organization_id: string;
  user_id: string | null;
  contract_type: string;
  hire_date: string;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

export interface PayrollInput {
  id: string;
  organization_id: string;
  employee_id: string;
  period: string;
  hours: string | null;
  bonuses: string;
  deductions_notes: string | null;
  created_at: string;
}

export type CoachObjectiveStatus = 'open' | 'in_progress' | 'achieved' | 'not_achieved';

export interface CoachObjective {
  id: string;
  organization_id: string;
  employee_id: string;
  period: string;
  objective_text: string;
  status: CoachObjectiveStatus;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAttendance {
  id: string;
  organization_id: string;
  employee_id: string;
  checked_in_at: string;
  created_at: string;
}

export interface ResumenDeCoach {
  employee: Employee;
  objetivos: CoachObjective[];
  equipos: { team: { id: string; name: string; category: string; sport: string } | null; standings: { points: number; wins: number; draws: number; losses: number }[] }[];
}
