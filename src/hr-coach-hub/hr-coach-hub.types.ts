// Tipos de fila — reflejan db/migrations/0015_hr_coach_hub_init.sql.

export type EmployeeStatus = 'active' | 'inactive';

export interface EmployeeRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  contract_type: string;
  hire_date: string;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
}

export interface PayrollInputRow {
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

export interface CoachObjectiveRow {
  id: string;
  organization_id: string;
  employee_id: string;
  period: string;
  objective_text: string;
  status: CoachObjectiveStatus;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAttendanceRow {
  id: string;
  organization_id: string;
  employee_id: string;
  checked_in_at: string;
  created_at: string;
}
