# Dr.stretch SPOT - Business Model Book

> **Last Updated:** 2026-03-08
> **URL:** https://dr-stretch-spot.vercel.app
> **Status:** MVP Phase 1 (Production)

---

## 1. What is this?

**Dr.stretch SPOT** is a gig-work matching platform for retired Dr.stretch trainers.

When trainers leave Dr.stretch, their skills don't disappear. SPOT connects these alumni trainers with Dr.stretch stores that need temporary staff, creating a win-win:
- Stores get experienced, pre-trained staff on demand
- Alumni trainers earn extra income with flexible schedules

```
Alumni trainer registers on SPOT
  -> Declares availability ("I can work Tuesdays at Shibuya store")
  -> Store posts a shift ("Need 2 trainers this Saturday")
  -> Trainer applies (or receives direct offer)
  -> Match confirmed -> QR clock-in/out -> Get paid
```

---

## 2. Who uses it?

| Role | Description | How they log in | Access |
|------|-------------|-----------------|--------|
| **Trainer** | Retired Dr.stretch trainer | Email/Password or OTP | `/home`, `/shifts`, `/clock`, `/earnings`, etc. |
| **Store Manager** | Dr.stretch store staff | Email/Password or OTP | `/store/*` |
| **HR** | Headquarters HR staff | Email/Password or OTP | `/hr/*` |
| **Area Manager** | Regional manager | Email/Password or OTP | `/hr/*` (filtered by area) |
| **Admin** | System administrator | Email/Password or OTP | All routes |
| **Employee** | Current employee (pre-resignation) | Email/Password or OTP | `/home`, `/resignation`, `/profile` only |

---

## 3. Key Pages & What They Do

### Trainer Pages

| Page | URL | Purpose |
|------|-----|---------|
| Home | `/home` | Dashboard: upcoming shifts, new postings, blank alerts, rank |
| Browse Shifts | `/shifts` | Search and apply for available shifts |
| My Shifts | `/my-shifts` | View applied/confirmed/past shifts |
| Clock In/Out | `/clock` | Show QR code for store to scan |
| Availability | `/availability` | Declare when/where you can work |
| Earnings | `/earnings` | View pay history with rate breakdowns |
| Rank | `/rank` | View current rank and progression |
| Evaluation History | `/evaluation-history` | See store evaluations received |
| Alerts | `/alerts` | Blank period warnings |
| Notifications | `/notifications` | All notifications |
| Profile | `/profile` | Edit personal info, bank details |
| Resignation | `/resignation` | Submit resignation request |
| SPOT Setup | `/spot-setup` | Initial SPOT registration for new alumni |

### Store Manager Pages

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/store` | Today's shifts, applications, attendance summary |
| Shift Management | `/store/shifts` | Create/edit shifts, use templates |
| Applications | `/store/applications` | Review trainer applications |
| Attendance | `/store/attendance` | QR scan for clock-in/out |
| Evaluations | `/store/evaluations` | Rate trainers after shifts |
| Templates | `/store/templates` | Manage recurring shift templates |
| Usage Stats | `/store/usage` | Monthly shift/cost/fill-rate statistics |
| Availability | `/store/availability` | View trainer availability declarations |
| Notifications | `/store/notifications` | Store notifications |

### HR Pages

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/hr` | Pending approvals, today's attendance, tomorrow's prep |
| Matchings | `/hr/matchings` | All applications across all stores |
| Attendance | `/hr/attendance` | Company-wide attendance board |
| Hourly Rates | `/hr/rates` | Configure pay rate tables |
| Rate Simulation | `/hr/simulation` | Simulate cost impact of rate changes |
| Blank Rules | `/hr/blank-rules` | Configure blank period rules (60/90/120 days) |
| Cost Ceiling | `/hr/cost-ceiling` | Set maximum hourly rates and budgets |
| Resignations | `/hr/resignations` | Process resignation requests |
| Audit Log | `/hr/audit-log` | All configuration change history |
| Rollback | `/hr/rollback` | Restore previous configurations |

### Admin Pages

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/admin` | HQ overview with key metrics |
| Trainers | `/admin/trainers` | Manage all trainers |
| Stores | `/admin/stores` | Manage all stores |
| Costs | `/admin/costs` | Company-wide cost analysis |
| Skill Checks | `/admin/skill-checks` | Manage skill check schedules |

---

## 4. Core Concepts

### 4-1. Shift Lifecycle

```
Store creates shift (status: pending_approval)
  -> HR approves (status: open)
  -> Trainer applies
  -> Auto-confirmed OR store reviews (depends on auto_confirm flag)
  -> Trainer clocks in via QR
  -> Trainer clocks out via QR
  -> Store evaluates trainer
  -> Shift completed
```

**Shift statuses:**
- `pending_approval` - Waiting for HR approval
- `open` - Published, trainers can apply
- `closed` - All slots filled
- `cancelled` - Rejected by HR or cancelled
- `completed` - All attendance records finalized

### 4-2. Pay Rate Calculation

Every trainer's hourly rate is calculated from 3 components:

```
Final Rate = Base Rate + Attendance Bonus + Emergency Bonus
```

| Component | How it's determined | Example |
|-----------|-------------------|---------|
| **Base Rate** | Tenure years (configured in rate table) | 2-5 years = 1,500 yen/h |
| **Attendance Bonus** | 30-day sliding window: if worked >= threshold shifts | +200 yen/h |
| **Emergency Bonus** | Shift unfilled after 24h AND fill rate < 50% | +500 yen/h |

**Important rules:**
- Rate is locked at application time (stored as JSON snapshot)
- Later rate table changes don't affect existing applications
- Cost ceiling can cap the maximum rate per store or company-wide

### 4-3. Blank Management

When a trainer hasn't worked for a while, the system escalates:

| Days since last shift | Status | Action |
|----------------------|--------|--------|
| 0-59 | OK | Normal |
| 60-89 | Alert | Warning notification (can still apply) |
| 90-119 | Skill Check Required | **Blocked from applying** until skill check passed |
| 120+ | Training Required | **Blocked from applying** until training completed |

- Clock-out automatically resets blank status to OK
- HR can manually clear blank status after skill check/training

### 4-4. QR Clock-In/Out

```
[Clock In]
Trainer opens app -> "Show QR" button
  -> System generates QR token (valid 15 minutes)
  -> Store manager scans QR with phone camera
  -> Clock-in recorded

[Clock Out]
Store manager requests clock-out
  -> Trainer shows QR again
  -> Store scans -> Clock-out recorded
  -> Work hours calculated automatically
```

### 4-5. Trainer Ranks

| Rank | Requirements |
|------|-------------|
| Bronze | Default |
| Silver | Accumulated shifts + good evaluations |
| Gold | Higher thresholds |
| Platinum | Top performers |

Ranks affect visibility and trust but not pay rates directly.

### 4-6. Availability & Direct Offers

Two-way matching system:

```
Trainer declares: "I can work Tuesdays and Thursdays at Shibuya store"
  -> Store sees availability list
  -> Store sends direct offer: "Work this Tuesday, 1500 yen/h"
  -> Trainer accepts/declines
```

This is the reverse of the normal flow (trainer browsing shifts).

---

## 5. Database Tables

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User accounts | id, role, display_name |
| `alumni_trainers` | Trainer details | tenure_years, status, blank_status, rank, last_shift_date |
| `stores` | Store locations | name, area, prefecture, auto_confirm, emergency_budget |
| `store_managers` | Store/HR staff | store_id, role, managed_areas |

### Shift & Matching Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `shift_requests` | Posted shifts | store_id, date, time, required_count, filled_count, status |
| `shift_templates` | Recurring templates | store_id, recurring_days, is_active |
| `shift_applications` | Trainer applications | shift_request_id, trainer_id, confirmed_rate, rate_breakdown, status |
| `shift_availabilities` | Trainer availability declarations | trainer_id, store_id, available_date |
| `shift_offers` | Store direct offers | availability_id, offered_rate, status |

### Attendance & Evaluation Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `attendance_records` | Clock in/out records | application_id, clock_in_at, clock_out_at, actual_work_minutes |
| `qr_tokens` | QR code tokens | matching_id, type (clock_in/out), token, expires_at |
| `evaluations` | Store evaluations of trainers | trainer_id, rating (1-5), categories, comment |
| `skill_checks` | Blank period skill assessments | trainer_id, check_type, result, score |

### Configuration Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `hourly_rate_config` | Pay rate tiers | tenure_min_years, tenure_max_years, base_rate |
| `blank_rule_config` | Blank period rules | rule_type, threshold_days, is_active |
| `cost_ceiling_config` | Max hourly rate limits | max_hourly_rate |
| `config_snapshots` | Config version history | snapshot_type, snapshot_data (for rollback) |

### Support Tables

| Table | Purpose |
|-------|---------|
| `notification_logs` | Notification history |
| `notification_preferences` | Per-trainer notification settings |
| `rate_change_logs` | Audit trail for config changes |
| `resignation_requests` | Resignation processing |

---

## 6. Business Value

### The problem

Dr.stretch invests heavily in training. When trainers leave, that investment is lost. Meanwhile, stores sometimes need temporary staff urgently.

### The solution

SPOT creates a marketplace where:
- **Stores** get access to pre-trained, experienced staff on demand
- **Alumni trainers** earn flexible income using skills they already have
- **Company** retains connection with former employees and reduces hiring costs

### Revenue model

Platform charges are managed through the rate system:
- Company sets pay rates (base + bonuses)
- Cost ceiling prevents overspending
- Emergency bonus budget is capped per store per month
- Potential future: take a platform fee from each transaction

### Cost structure

| Item | Estimated Monthly Cost |
|------|----------------------|
| Vercel hosting | Free tier / ~$20 |
| Supabase (Pro) | ~$25 |
| Resend (Email) | Free tier / ~$20 |
| Domain | ~$1 |

---

## 7. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (OTP + Password) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Email | Resend API |
| Hosting | Vercel |

---

## 8. Test Accounts

Access via demo login buttons at the login page:

| Role | How to login |
|------|-------------|
| Trainer | Click "Trainer Demo Login" button |
| Store Manager | Click "Store Demo Login" button |
| HR | Click "HR Demo Login" button |
| Admin | Click "Admin Demo Login" button |

All demo accounts use the `/api/auth/demo-login?role=[role]` endpoint.

---

## 9. Cross-System Integration

```
Dr.stretch Meister (Career Credentials)
  -> Trainer career data flows to SPOT
  -> VCs provide pre-verification for gig work

Dr.stretch SPOT (Gig Matching)
  -> Alumni trainers matched with stores
  -> Performance data feeds back to Meister

Dr.stretch SELECT (Member EC)
  -> Independent system (no direct integration)
  -> Same brand, different user base (customers vs trainers)
```
