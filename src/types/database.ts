// =============================================
// Dr.stretch SPOT - Database Types
// =============================================

export type UserRole = "trainer" | "store_manager" | "hr" | "admin" | "area_manager" | "employee";

export type TrainerStatus = "pending" | "active" | "suspended" | "inactive";
export type SpotStatus = "registered" | "active" | "inactive" | "paused";
export type ResignationStatus = "draft" | "submitted" | "received" | "accepted" | "completed" | "cancelled";
export type ResignationReason = "career_change" | "family" | "health" | "independence" | "relocation" | "other";
export type BlankStatus = "ok" | "alert_60" | "skill_check_required" | "training_required";
export type ShiftRequestStatus = "pending_approval" | "open" | "closed" | "cancelled" | "completed";
export type ApplicationStatus = "pending" | "approved" | "rejected" | "cancelled" | "completed" | "no_show";
export type AttendanceStatus = "scheduled" | "clocked_in" | "clocked_out" | "verified" | "disputed";
export type SkillCheckType = "skill_check" | "training";
export type SkillCheckResult = "pass" | "fail" | "pending";
export type BlankRuleType = "alert_60" | "skill_check_required" | "training_required";
export type ChangeLogType = "rate_update" | "rate_create" | "rate_delete" | "blank_rule_update" | "simulation" | "cost_ceiling_update" | "config_rollback" | "store_budget_update";
export type QrTokenType = "clock_in" | "clock_out";
export type NotificationType = "email" | "push" | "line";
export type NotificationCategory =
  | "shift_published"
  | "application_received"
  | "application_confirmed"
  | "application_rejected"
  | "application_cancelled"
  | "pre_day_reminder"
  | "day_reminder"
  | "clock_in"
  | "clock_out"
  | "shift_approval_request"
  | "shift_approved"
  | "blank_alert"
  | "cost_alert"
  | "rank_update"
  | "skill_check_scheduled"
  | "emergency_auto_trigger";

// Phase 2 Types
export type TrainerRank = "bronze" | "silver" | "gold" | "platinum";
export type ConfigSnapshotType = "rate_config" | "blank_rule_config" | "cost_ceiling";

// =============================================
// Table Types
// =============================================

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlumniTrainer {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  full_name_kana: string | null;
  phone: string | null;
  avatar_url: string | null;
  tenure_years: number;
  employment_start_date: string | null;
  employment_end_date: string | null;
  preferred_areas: string[];
  preferred_time_slots: string[];
  certifications: string[];
  bio: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_type: string;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  spot_status: SpotStatus;
  resignation_id: string | null;
  status: TrainerStatus;
  last_shift_date: string | null;
  blank_status: BlankStatus;
  skill_check_completed_at: string | null;
  training_completed_at: string | null;
  rank: TrainerRank;
  badges: string[];
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  name: string;
  area: string;
  prefecture: string;
  address: string;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_meters: number;
  emergency_budget_monthly: number;
  emergency_budget_used: number;
  emergency_budget_reset_at: string | null;
  auto_confirm: boolean;
  cost_ceiling_override: number | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface StoreManager {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  store_id: string;
  role: UserRole;
  managed_areas: string[];
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface ShiftRequest {
  id: string;
  store_id: string;
  created_by: string;
  title: string;
  description: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  required_count: number;
  filled_count: number;
  required_certifications: string[];
  is_emergency: boolean;
  emergency_bonus_amount: number;
  status: ShiftRequestStatus;
  approved_by: string | null;
  approved_at: string | null;
  target_areas: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  store?: Store;
  created_by_manager?: StoreManager;
}

export interface ShiftTemplate {
  id: string;
  store_id: string;
  created_by: string;
  name: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  break_minutes: number;
  required_count: number;
  required_certifications: string[];
  is_recurring: boolean;
  recurring_days: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RateBreakdown {
  base_rate: number;
  tenure_years: number;
  attendance_bonus: number;
  attendance_count_30d: number;
  emergency_bonus: number;
  total: number;
}

export interface ShiftApplication {
  id: string;
  shift_request_id: string;
  trainer_id: string;
  confirmed_rate: number;
  rate_breakdown: RateBreakdown;
  status: ApplicationStatus;
  applied_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  pre_day_reminder_sent: boolean;
  pre_day_confirmed: boolean;
  pre_day_confirmed_at: string | null;
  day_reminder_sent: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  shift_request?: ShiftRequest;
  trainer?: AlumniTrainer;
}

export interface AttendanceRecord {
  id: string;
  application_id: string;
  trainer_id: string;
  store_id: string;
  shift_date: string;
  scheduled_start: string;
  scheduled_end: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  is_location_verified: boolean;
  actual_work_minutes: number | null;
  break_minutes: number;
  overtime_minutes: number;
  status: AttendanceStatus;
  manager_note: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  trainer?: AlumniTrainer;
  store?: Store;
  application?: ShiftApplication;
}

export interface QrToken {
  id: string;
  matching_id: string;
  type: QrTokenType;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  // Joined fields
  application?: ShiftApplication;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string | null;
  matching_id: string | null;
  shift_request_id: string | null;
  subject: string | null;
  body: string | null;
  sent_at: string;
  delivered: boolean;
  responded: boolean;
  responded_at: string | null;
  read_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SkillCheck {
  id: string;
  trainer_id: string;
  checked_by: string | null;
  check_type: SkillCheckType;
  check_date: string;
  result: SkillCheckResult;
  score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  application_id: string;
  trainer_id: string;
  store_id: string;
  evaluator_id: string;
  rating: number;
  categories: Record<string, number>;
  comment: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  trainer?: AlumniTrainer;
}

export interface NotificationPreference {
  id: string;
  trainer_id: string;
  email_new_shift: boolean;
  email_application_update: boolean;
  email_blank_alert: boolean;
  push_enabled: boolean;
  preferred_notification_time: string;
  created_at: string;
  updated_at: string;
}

export interface HourlyRateConfig {
  id: string;
  tenure_min_years: number;
  tenure_max_years: number | null;
  base_rate: number;
  attendance_bonus_threshold: number;
  attendance_bonus_amount: number;
  effective_from: string;
  effective_until: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlankRuleConfig {
  id: string;
  rule_type: BlankRuleType;
  threshold_days: number;
  action_required: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RateChangeLog {
  id: string;
  changed_by: string;
  change_type: ChangeLogType;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  affected_trainers_count: number;
  estimated_cost_impact: number | null;
  created_at: string;
  // Joined fields
  changed_by_manager?: StoreManager;
}

// =============================================
// Resignation Types
// =============================================

export interface ResignationRequest {
  id: string;
  auth_user_id: string;
  employee_number: string | null;
  store_id: string | null;
  full_name: string;
  full_name_kana: string | null;
  phone: string | null;
  employment_start_date: string | null;
  desired_resignation_date: string;
  last_working_date: string | null;
  resignation_reason: ResignationReason | null;
  resignation_reason_detail: string | null;
  status: ResignationStatus;
  submitted_at: string | null;
  received_by: string | null;
  received_at: string | null;
  completed_by: string | null;
  completed_at: string | null;
  spot_interest: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  store?: Store;
}

// =============================================
// Phase 2 - New Table Types
// =============================================

export interface ConfigSnapshot {
  id: string;
  snapshot_type: ConfigSnapshotType;
  snapshot_data: Record<string, unknown>;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface CostCeilingConfig {
  id: string;
  max_hourly_rate: number;
  active_employee_ratio_threshold: number;
  per_store_emergency_budget_default: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// Phase 2 - Composite / KPI Types
// =============================================

export interface AdminKPIs {
  total_trainers: number;
  active_trainers: number;
  active_rate: number;
  monthly_shifts: number;
  monthly_fill_rate: number;
  monthly_cost: number;
  blank_distribution: Record<BlankStatus, number>;
  budget_alerts: Array<{
    store_id: string;
    store_name: string;
    budget: number;
    used: number;
    usage_rate: number;
  }>;
}

export interface StoreWithManager extends Store {
  managers: StoreManager[];
}

export interface BudgetReport {
  store_id: string;
  store_name: string;
  area: string;
  emergency_budget: number;
  emergency_used: number;
  total_shift_cost: number;
  shift_count: number;
  trainer_count: number;
}

export interface TrainerRankProgress {
  current_rank: TrainerRank;
  completed_shifts: number;
  avg_rating: number;
  next_rank: TrainerRank | null;
  shifts_needed: number;
  rating_needed: number;
}

// =============================================
// Action Result Types
// =============================================

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
