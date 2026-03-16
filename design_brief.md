# Dr.stretch SPOT Design Brief

## 1. Product Overview

Dr.stretch SPOT is a shift-matching mobile-first web app for retired Dr.stretch trainers who want to pick up spot (part-time) shifts at their former stores.

## 2. Persona

- **Who**: Former Dr.stretch trainers (age 20-40, smartphone-first, seeking side income)
- **Context**: Already familiar with Dr.stretch operations, looking for flexible shift work
- **Device**: Primarily mobile (iPhone/Android), occasional desktop for HR/admin
- **Literacy**: Comfortable with LINE, mobile apps; not necessarily tech-savvy

## 3. Emotional Design

### Trainer (Mobile)
- **Primary emotion**: "I want to work at my old store again" — warmth, nostalgia, trust
- **Secondary emotion**: "I can earn flexibly" — empowerment, control, opportunity
- **Anti-pattern**: Cold/corporate, overly complex, bureaucratic feel

### Store Manager (Desktop)
- **Primary emotion**: "I can fill shifts quickly" — efficiency, reliability
- **Anti-pattern**: Cluttered dashboards, unclear status

### HR (Desktop)
- **Primary emotion**: "Everything is under control" — oversight, confidence
- **Anti-pattern**: Information overload without actionable insights

## 4. Brand Identity

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#E60012` (oklch 0.53 0.22 29) | CTAs, active states, brand accent |
| Accent | `#DADF00` (oklch 0.87 0.18 110) | Highlights, success indicators, badges |
| Background | `#FCFCFC` | Page backgrounds |
| Card | `#FFFFFF` | Card surfaces |
| Muted | `#F5F5F5` | Section backgrounds, alternating rows |
| Foreground | `#1A1A1A` | Primary text |
| Muted FG | `#808080` | Secondary text, labels |

### Typography
- **Headings**: Montserrat (bold, sporty feel)
- **Body**: Inter + Noto Sans JP (clean Japanese readability)
- **Sizing**: Mobile-first — body 14px, headings 18-24px

### Shape & Spacing
- **Border radius**: `rounded-lg` (8px) for cards, `rounded-xl` (12px) for buttons/inputs
- **Shadow**: Subtle `shadow-sm` for cards, no heavy shadows
- **Spacing**: Generous padding (p-4 mobile, p-6 desktop)

### Visual Personality
- **Sporty & energetic** — not minimal/corporate
- **Warm & approachable** — rounded corners, friendly copy
- **Confident** — bold CTAs, clear hierarchy
- **NOT**: Monochrome, brutalist, overly decorative

## 5. Competitive Visual Benchmark

- **Timee** (タイミー): Simple card-based shift listings, quick apply flow
- **Sharefull** (シェアフル): Clean mobile UX, map-based search
- **Target quality**: Match or exceed these apps in mobile UX polish

## 6. Key Screens to Design

### Screen 1: Trainer Home (Mobile)
- Hero: Welcome back message with today's shift CTA (if any)
- Quick stats: Next shift, total earnings this month, rank
- Available shifts card list (3-4 visible)
- Clock-in CTA prominent when shift is active

### Screen 2: Trainer Shift Search (Mobile)
- Quick filter chips (area, date, time slot)
- Card-based shift listings with store name, date, time, rate
- Apply button inline on each card
- Empty state with illustration

### Screen 3: Store Dashboard (Desktop)
- Sidebar navigation (8 items)
- KPI row: Today's coverage, pending applications, this month's shifts
- Upcoming shifts table with status badges
- Quick actions: Create shift, View applications

### Screen 4: HR Management (Desktop)
- Sidebar navigation
- Data table with filters (status, date range, area)
- Approval workflow buttons
- Statistics summary cards

## 7. Design Principles

1. **Mobile-first**: Every screen works perfectly on 375px width
2. **One-tap actions**: Primary actions reachable with thumb
3. **Clear status**: Every item shows its current state (badge, color, icon)
4. **Dr.stretch DNA**: Red accent, sporty energy, trainer-friendly language
5. **Progressive disclosure**: Show summary first, details on tap
