# Dr.stretch SPOT — Project CLAUDE.md

## Project Overview
Dr.ストレッチ認定トレーナー（OB/OG）副業マッチングプラットフォーム。
退職トレーナーをスポットバイト形式で店舗とマッチングする自社専用システム。

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **UI**: shadcn/ui + Tailwind CSS v4
- **DB/Auth**: Supabase (PostgreSQL + Auth)
- **Hosting**: Vercel
- **Language**: TypeScript (strict)

## Design Tokens

### Brand Colors
```
Primary Red:      #E60012  (Dr.stretch brand)  → oklch(0.53 0.22 29)
Accent Green:     #DADF00  (highlight/accent)   → oklch(0.87 0.18 110)
Dark:             #1A1A1A  (text/headings)
White:            #FFFFFF  (backgrounds)
Muted Gray:       #F5F5F5  (subtle backgrounds)
Border:           #E5E5E5  (borders/dividers)
```

### Typography
- Font Family: `Montserrat` (headings/logo), `Inter` (body), `Noto Sans JP` (Japanese)
- Heading: font-weight 700-800
- Body: font-weight 400-500
- Small: font-weight 400

### Spacing
- Section padding: 24px (mobile), 32px (desktop)
- Card padding: 16px (mobile), 24px (desktop)
- Element gap: 8px / 12px / 16px / 24px

### Border Radius
- Card: 12px
- Button: 8px
- Input: 8px
- Badge: 16px (pill)

## Coding Rules

### File Naming
- Components: PascalCase (e.g., `ShiftCard.tsx`)
- Actions: camelCase (e.g., `shifts.ts`)
- Types: PascalCase (e.g., `types/shift.ts`)
- Routes: kebab-case directories

### Component Rules
- Functional components only
- Server Components by default, `"use client"` only when needed
- Use shadcn/ui components — do NOT create custom UI primitives
- Import from `@/components/ui/` for shadcn, `@/components/shared/` for app-level

### Data Flow
- Server Actions in `src/actions/`
- Supabase client in `src/lib/supabase/`
- Type definitions in `src/types/`
- No direct DB queries in components — always through Server Actions

### Security
- All Supabase queries go through RLS policies
- Validate user role in middleware before granting access
- Never expose Supabase service key to client
- Sanitize all user inputs in Server Actions

### User Roles
```
trainer        → (trainer)/ routes
store_manager  → (store)/ routes
hr             → (hr)/ routes
area_manager   → (hr)/ routes (filtered by managed areas)
admin          → all routes
```

## Key Business Logic

### Hourly Rate Calculation
```
confirmed_rate = base_rate(tenure) + attendance_bonus(recent_30_days) + emergency_bonus(if_applicable)
```
- Rate is FIXED at application time (not affected by later config changes)
- Rate breakdown stored in `shift_applications.rate_breakdown` as JSONB

### Blank Management
- 60 days: prevention alert (notification only)
- 90 days: skill_check_required (blocks applications)
- 120 days: training_required (blocks applications)
- Days are configurable via HR control panel (`blank_rule_config` table)

### Dynamic Pricing
- Attendance bonus: 30-day sliding window (NOT monthly reset)
- Emergency bonus: triggered when shift is < 24h old AND < 50% filled
- Emergency budget: per-store monthly cap

## Supabase Tables (16 tables)
alumni_trainers, stores, store_managers, shift_requests, shift_templates,
shift_applications, attendance_records, skill_checks, evaluations,
notification_preferences, hourly_rate_config, blank_rule_config, rate_change_logs,
profiles, qr_tokens, notification_logs

## Matching & Attendance Flow

### Shift Lifecycle
```
Store creates shift → status: pending_approval
  → HR approves → status: open (visible to trainers)
  → HR rejects → status: cancelled
  → Trainer applies → auto-confirm (first come first served)
  → All slots filled → auto-close trigger → status: closed
```

### Auto-Confirm Matching
- Controlled by `stores.auto_confirm` (default: true)
- When true: application → approved immediately → attendance_records created
- When false: application → pending → store manager reviews

### QR Attendance (unified direction: trainer shows → store scans)
```
Clock-in:
  Trainer taps "Show QR" → qr_tokens created (15min expiry)
  → Store scans token → POST /api/attendance/verify → clock_in_at recorded

Clock-out:
  Store taps "退勤リクエスト" → clock_out QR token created
  → Trainer's app auto-detects via 5s polling → shows QR
  → Store scans → clock_out_at recorded → status: clocked_out
```

### Pre-day Confirmation
- Cron at 18:00 JST → email with OK button → GET /api/confirm?id=xxx
- Unconfirmed trainers → alert on HR dashboard (no auto-cancel)
- HR can manually cancel, reassign, or add people

### Cron Schedule (vercel.json — Hobby plan: 1 cron/day)
```
0 22 * * *  → 07:00 JST — sends BOTH day-of and pre-day reminders in one run
```

### Area Manager
- Same HR dashboard, filtered by `store_managers.managed_areas`
- Role: `area_manager` in profiles table
- Routes: same /hr/* paths

### Email Notifications (Resend)
- Gracefully skips if RESEND_API_KEY not configured
- Templates: matchingConfirmedEmail, preDayReminderEmail, dayReminderEmail
- LINE integration: planned for future phase

## Important Notes
- `preview_screenshot` is BANNED (freezes) — use `preview_snapshot` / `preview_eval`
- Lint: use `npm run lint` (NOT `npx next lint`)
- Windows environment: use `cmd /c` pattern for preview_start
