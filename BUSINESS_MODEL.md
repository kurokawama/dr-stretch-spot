# Dr.stretch SPOT - Business Model Book

> **Last Updated:** 2026-03-11
> **Status:** MVP Phase 1 (Production)

---

## 1. What is this?

**Dr.stretch SPOT** is a part-time employment (アルバイト) matching platform for retired Dr.stretch trainers.

When trainers leave Dr.stretch, their skills don't disappear. SPOT connects these alumni trainers with Dr.stretch stores that need temporary staff as part-time employees (アルバイト — NOT freelance/業務委託), creating a win-win:
- Stores get experienced, pre-trained staff on demand
- Alumni trainers earn extra income with flexible schedules
- Salary is paid by HR via bank transfer (not through the platform)

```
Alumni trainer registers on SPOT
  -> Declares availability ("I can work Tuesdays at Shibuya store")
  -> Store posts a shift ("Need 2 trainers this Saturday")
  -> Trainer applies (or receives direct offer)
  -> Match confirmed -> QR clock-in/out -> HR pays salary via bank transfer
```

---

## 2. Who uses it?

| Role | Description | How they log in |
|------|-------------|-----------------|
| **Trainer** | Retired Dr.stretch trainer | Email/Password |
| **Store Manager** | Dr.stretch store staff | Email/Password |
| **HR** | Headquarters HR staff | Email/Password |
| **Area Manager** | Regional manager | Email/Password |
| **Admin** | System administrator | Email/Password |
| **Employee** | Current employee (pre-resignation) | Email/Password |

---

## 3. Key Pages & What They Do

### Trainer Pages

- **Home** - Dashboard: upcoming shifts, new postings, blank alerts, rank
  https://dr-stretch-spot.vercel.app/home

- **Browse Shifts** - Search and apply for available shifts
  https://dr-stretch-spot.vercel.app/shifts

- **My Shifts** - View applied/confirmed/past shifts
  https://dr-stretch-spot.vercel.app/my-shifts

- **Clock In/Out** - Show QR code for store to scan
  https://dr-stretch-spot.vercel.app/clock

- **Availability** - Declare when/where you can work
  https://dr-stretch-spot.vercel.app/availability

- **Earnings** - View pay history with rate breakdowns
  https://dr-stretch-spot.vercel.app/earnings

- **Rank** - View current rank and progression
  https://dr-stretch-spot.vercel.app/rank

- **Alerts** - Blank period warnings
  https://dr-stretch-spot.vercel.app/alerts

- **Notifications** - All notifications
  https://dr-stretch-spot.vercel.app/notifications

- **Profile** - Edit personal info, bank details
  https://dr-stretch-spot.vercel.app/profile

- **Resignation** - Submit resignation request
  https://dr-stretch-spot.vercel.app/resignation

### Store Manager Pages

- **Dashboard** - Today's shifts, applications, attendance summary
  https://dr-stretch-spot.vercel.app/store

- **Shift Management** - Create/edit shifts, use templates
  https://dr-stretch-spot.vercel.app/store/shifts

- **Applications** - Review trainer applications
  https://dr-stretch-spot.vercel.app/store/applications

- **Attendance** - QR scan for clock-in/out
  https://dr-stretch-spot.vercel.app/store/attendance

- **Evaluations** - Rate trainers after shifts
  https://dr-stretch-spot.vercel.app/store/evaluations

- **Templates** - Manage recurring shift templates
  https://dr-stretch-spot.vercel.app/store/templates

- **Usage Stats** - Monthly shift/cost/fill-rate statistics
  https://dr-stretch-spot.vercel.app/store/usage

- **Availability** - View trainer availability declarations
  https://dr-stretch-spot.vercel.app/store/availability

### HR Pages

- **Dashboard** - Pending approvals, today's attendance, tomorrow's prep
  https://dr-stretch-spot.vercel.app/hr

- **Matchings** - All applications across all stores
  https://dr-stretch-spot.vercel.app/hr/matchings

- **Attendance** - Company-wide attendance board
  https://dr-stretch-spot.vercel.app/hr/attendance

- **Hourly Rates** - Configure pay rate tables
  https://dr-stretch-spot.vercel.app/hr/rates

- **Rate Simulation** - Simulate cost impact of rate changes
  https://dr-stretch-spot.vercel.app/hr/simulation

- **Blank Rules** - Configure blank period rules (60/90/120 days)
  https://dr-stretch-spot.vercel.app/hr/blank-rules

- **Cost Ceiling** - Set maximum hourly rates and budgets
  https://dr-stretch-spot.vercel.app/hr/cost-ceiling

- **Resignations** - Process resignation requests
  https://dr-stretch-spot.vercel.app/hr/resignations

- **Audit Log** - All configuration change history
  https://dr-stretch-spot.vercel.app/hr/audit-log

- **Rollback** - Restore previous configurations
  https://dr-stretch-spot.vercel.app/hr/rollback

### Admin Pages

- **Dashboard** - HQ overview with key metrics
  https://dr-stretch-spot.vercel.app/admin

- **Trainers** - Manage all trainers
  https://dr-stretch-spot.vercel.app/admin/trainers

- **Stores** - Manage all stores
  https://dr-stretch-spot.vercel.app/admin/stores

- **Costs** - Company-wide cost analysis
  https://dr-stretch-spot.vercel.app/admin/costs

- **Skill Checks** - Manage skill check schedules
  https://dr-stretch-spot.vercel.app/admin/skill-checks

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

SPOT is an internal HR tool — not a marketplace that charges fees:
- Company sets pay rates (base + bonuses) for part-time employees
- Cost ceiling prevents overspending
- Emergency bonus budget is capped per store per month
- Salary is paid via standard payroll (bank transfer by HR department)
- No platform fee or in-app payment processing

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
| Auth | Supabase Auth (Email/Password) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Email | Resend API |
| Hosting | Vercel |

---

## 8. Cross-System Integration

```
Dr.stretch Meister (Career Credentials)
  -> Trainer career data flows to SPOT
  -> VCs provide pre-verification for part-time work

Dr.stretch SPOT (Part-time Employment Matching)
  -> Alumni trainers matched with stores as part-time employees
  -> Performance data feeds back to Meister

Dr.stretch SELECT (Member EC)
  -> Independent system (no direct integration)
  -> Same brand, different user base (customers vs trainers)
```

---

## 9. Currently NOT Connected (Important for Testing)

Below is a list of features that exist in the UI but are NOT yet fully working. When testing, these areas will not function as expected.

| Feature | Current Status | What You'll See | What's Needed to Connect |
|---------|---------------|-----------------|--------------------------|
| **Email Notifications** | NOT CONNECTED | Shift reminders, application confirmations, and blank alerts are NOT sent by email. Notification logs appear in the system but emails don't actually deliver. | Resend API key needs to be configured |
| **Push Notifications** | NOT IMPLEMENTED | The "Notifications" page shows notification records, but no push notifications are sent to phones. | Firebase Cloud Messaging or LINE Messaging API integration needed |
| **LINE Notifications** | ✅ CONNECTED | LINE messages are sent for shift offers, confirmations, and system notifications via LINE Messaging API (@476pimjy). | Fully operational |
| **Payment / Payout** | HANDLED EXTERNALLY | The "Earnings" page shows calculated pay amounts for reference. Actual salary payment is handled by HR via bank transfer (standard アルバイト payroll). No in-app payment processing is needed. | N/A — HR handles payroll externally |
| **Cron Reminders** | PARTIALLY WORKING | The cron job runs on schedule, but because email is not connected, reminder emails are silently skipped. | Resend API key needed |
| **Meister Integration** | NOT IMPLEMENTED (Phase 2) | SPOT and Meister are completely separate systems. Career data from Meister does not flow to SPOT. | Phase 2 development |

**Everything else works:** Shift creation, shift approval, trainer applications, QR clock-in/out, attendance tracking, evaluations, pay rate calculation, blank management rules, cost ceiling, audit log, rollback, resignation flow - all fully functional within the system.

---

## 10. Test It Yourself

### Site URL

https://dr-stretch-spot.vercel.app

### Login Pages (Role-specific)

Each role has its own login page:

- **Trainer**: https://dr-stretch-spot.vercel.app/login
- **Store Manager**: https://dr-stretch-spot.vercel.app/login/store
- **HR**: https://dr-stretch-spot.vercel.app/login/hr
- **Admin**: https://dr-stretch-spot.vercel.app/login/admin

Self-registration is disabled. Accounts are created by Admin via `/admin/accounts`.

### Recommended Test Flow

1. Open the trainer login page: https://dr-stretch-spot.vercel.app/login
2. Log in with trainer credentials (ask admin for password)
3. Log out, then open /login/store to see the store manager view
4. Log out, then open /login/hr to see the HR dashboard
5. Log out, then open /login/admin to see the admin overview

### Source Code

https://github.com/kurokawama/dr-stretch-spot
