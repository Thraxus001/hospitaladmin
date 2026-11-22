export type User = { id: number; full_name: string; phone: string; email: string | null; role: string };
export type Doctor = {
  id: number; full_name: string; specialty: string; hospital_location: string; rating: number;
  slot_minutes: number; consultation_fee: number; working_days: number[];
  max_daily_appointments: number; active: boolean; has_login: boolean;
};
export type Appointment = {
  id: number; doctor_id: number; doctor: Doctor; patient: User | null; start_at: string; end_at: string;
  status: string; priority: number; fee: number; amount_due: number; rescheduled_from_id: number | null;
};
export type ScheduleWindow = { id: number; weekday: number; start_time: string; end_time: string };
export type SlotRow = { start_at: string; end_at: string; occupied: boolean; bumpable: boolean; patient: string | null };
export type PaymentRow = {
  id: number; appointment_id: number; patient: string; doctor: string; method: string; amount: number;
  status: string; provider_ref: string | null; created_at: string;
};
export type AuditRow = { id: number; admin: string; action: string; detail: string; created_at: string };
export type Summary = {
  period_days: number; collected: number; collected_by_method: Record<string, number>;
  pending_payments: number; refunds_due: number; appointments_by_status: Record<string, number>;
  turnout_rate: number | null; bookings_per_doctor: Record<string, number>;
  daily_collected: { date: string; amount: number }[]; bookings_by_hour: Record<string, number>;
};
export type Notif = {
  id: number; kind: string; channel: string; subject: string; body: string; status: string;
  appointment_id: number | null; created_at: string; read_at: string | null;
};
export type NotifRow = Notif & { recipient: string; user_name: string; attempts: number; error: string | null };

export type Department = { id: number; name: string; icon: string | null; active: boolean; doctor_count: number };
export type HospitalSettings = { payment_methods: string[]; insurance_providers: string[] };

export type ReferralCode = {
  id: number;
  code: string;
  patient_id: number;
  doctor_id: number;
  used: boolean;
  used_at: string | null;
  created_at: string;
  patient_name: string;
  doctor_name: string;
};
