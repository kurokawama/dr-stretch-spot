# Dr.stretch SPOT — System Specification

> **Version**: 1.1.0
> **Last Updated**: 2026-03-17
> **Status**: Phase 2 Production

---

## Project Overview

Dr.stretch SPOT は、Dr.stretch を退職したトレーナーが副業として店舗シフトに参加できる **OB/OG トレーナー マッチングプラットフォーム** である。

店舗が人手不足のシフトを公開 → 退職済みトレーナーが応募 → QR コードで打刻 → 勤務完了後に時給精算、という一連のフローをシステム化する。

---

## Purpose

| 課題 | 解決策 |
|------|--------|
| 店舗の慢性的な人手不足 | 退職トレーナーを即戦力として活用 |
| 退職者の離職後スキル活用 | 副業として柔軟にシフト参加可能 |
| 時給計算の属人化 | 在籍年数・出勤頻度・緊急度による自動計算 |
| ブランク期間による品質低下 | 60/90/120日ルールでスキルチェック自動管理 |
| 出退勤の不正防止 | QR コード + GPS 位置認証による打刻 |
| 緊急シフトの埋まりにくさ | 24h経過 + 充足率50%未満で自動ボーナス発動 |

---

## Target Users

| ロール | 対象者 | 主な操作 |
|--------|--------|---------|
| **Trainer** | Dr.stretch 退職トレーナー | シフト閲覧・応募・QR打刻・収入確認・シフト希望申告 |
| **Store Manager** | 店舗マネージャー | シフト作成・応募管理・勤怠確認・評価・直接オファー |
| **HR / Area Manager** | 本部 HR・エリアマネージャー | 全店舗横断管理・時給設定・マッチング監視・コスト上限管理 |
| **Admin** | システム管理者 | トレーナー一括管理・店舗設定・スキルチェック・予算監視 |
| **Employee** | 退職前社員 | 退職申請・SPOT登録（退職後トレーナーに移行） |

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Vercel (Hosting)                  │
│  ┌───────────────────────────────────────────────┐  │
│  │              Next.js 16 App Router             │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │ Server  │ │  Server  │ │  API Routes   │  │  │
│  │  │Components│ │ Actions  │ │ /api/*        │  │  │
│  │  │ (RSC)   │ │ 17 files │ │ 5 endpoints   │  │  │
│  │  └────┬────┘ └────┬─────┘ └──────┬────────┘  │  │
│  │       │           │              │            │  │
│  │  ┌────┴───────────┴──────────────┴─────────┐  │  │
│  │  │        Supabase Client (SSR/Admin)       │  │  │
│  │  └──────────────────┬──────────────────────┘  │  │
│  └─────────────────────┼─────────────────────────┘  │
└────────────────────────┼────────────────────────────┘
                         │ HTTPS
┌────────────────────────┼────────────────────────────┐
│              Supabase (Backend-as-a-Service)         │
│  ┌────────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ PostgreSQL │ │   Auth   │ │  Row Level       │  │
│  │  16 tables │ │ (Email/  │ │  Security (RLS)  │  │
│  │  + pg_cron │ │  Magic)  │ │  13 tables       │  │
│  └────────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────┐
│              External Services                       │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐    │
│  │  LINE    │  │   Resend   │  │  Vercel Cron │    │
│  │ Messaging│  │   (Email)  │  │ (Reminders)  │    │
│  └──────────┘  └────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|-----------|------|
| **Language** | TypeScript | 5.x (strict) | 全コード |
| **Framework** | Next.js | 16.1.6 | App Router / RSC / Server Actions |
| **UI Library** | shadcn/ui + Radix UI | latest | コンポーネントプリミティブ |
| **CSS** | Tailwind CSS | 4.x | ユーティリティファーストCSS |
| **Form** | React Hook Form + Zod | 7.x / 4.x | フォーム管理 + バリデーション |
| **Database** | PostgreSQL (Supabase) | 15 | メインDB |
| **Auth** | Supabase Auth | - | Email/Password（全ロール共通） |
| **Hosting** | Vercel | - | サーバーレスデプロイ |
| **Email** | Resend | - | トランザクションメール |
| **Messaging** | LINE Messaging API | - | プッシュ通知・アカウント連携 |
| **Icons** | Lucide React | 0.575 | SVGアイコン |
| **Date** | date-fns | 4.x | 日付操作 (JST対応) |

---

## Components

### アプリケーション層

| コンポーネント | ファイル | 役割 |
|---------------|---------|------|
| Server Actions | `src/actions/` (17ファイル, 5300+行) | 全ビジネスロジック |
| Middleware | `middleware.ts` | 認証チェック + ロールベースルーティング |
| Supabase Client | `src/lib/supabase/` (4ファイル) | DB接続（Browser/Server/Admin/Middleware） |
| LINE Integration | `src/lib/line/` (3ファイル) | Webhook検証・メッセージ送信・テンプレート |
| Date Utilities | `src/lib/date.ts` | JST タイムゾーン操作 |
| Email | `src/lib/notifications.ts` | Resend メールテンプレート |

### Server Actions 一覧

| ファイル | 行数 | 主要関数 | 概要 |
|---------|------|---------|------|
| `admin.ts` | 564 | `getAdminKPIs`, `updateTrainer`, `updateStoreConfig` | 管理ダッシュボード・KPI・一括管理 |
| `applications.ts` | 396 | `applyToShift`, `approveApplication`, `rejectApplication` | シフト応募・承認・却下 |
| `attendance.ts` | 219 | `clockIn`, `clockOut`, `verifyAttendance` | GPS打刻・勤怠確認 |
| `availability.ts` | 236 | `submitAvailability`, `getStoreAvailabilities` | トレーナーのシフト希望申告 |
| `config.ts` | 100+ | `getCostCeilingConfig`, `updateCostCeilingConfig` | コスト上限設定 |
| `evaluations.ts` | 83 | `createEvaluation`, `getTrainerEvaluations` | 勤務後評価 |
| `hr-offers.ts` | 100+ | `hrSearchTrainers`, `hrCreateOffer` | HR直接オファー |
| `line.ts` | 360 | `generateLinkToken`, `verifyAndLinkAccount` | LINEアカウント連携 |
| `matching.ts` | 276 | `getAllMatchings`, `confirmPreDayAttendance` | マッチング管理・前日確認 |
| `notifications.ts` | 201 | `createNotification`, `createBatchNotifications` | 通知ログ管理 |
| `offers.ts` | 395 | `sendOffer`, `acceptOffer`, `declineOffer` | 直接オファー管理 |
| `pricing.ts` | 305 | `calculateRate`, `simulateRateChange` | 時給計算エンジン（コア） |
| `qr.ts` | 200 | `generateQrToken`, `verifyQrToken` | QRコード打刻 |
| `rates.ts` | 318 | `getRateConfigs`, `updateRateConfig`, `rollbackToSnapshot` | 時給設定CRUD |
| `resignation.ts` | 326 | `submitResignation`, `completeResignation` | 退職申請フロー |
| `shifts.ts` | 298 | `createShiftRequest`, `approveShiftRequest`, `publishShift` | シフト募集管理 |
| `templates.ts` | 199 | `createShiftTemplate`, `createShiftFromTemplate` | テンプレートからシフト生成 |
| `accounts.ts` | 150+ | `getStaffAccounts`, `createStaffAccount`, `updateStaffAccount`, `deleteStaffAccount` | スタッフアカウントCRUD（管理者専用） |

### UI コンポーネント

| 種別 | 数 | 内容 |
|------|---|------|
| shadcn/ui プリミティブ | 27 | Button, Card, Table, Dialog, Form, Tabs, etc. |
| 共有コンポーネント | 4 | BottomNav, Header, ErrorState, StaffLoginForm |
| ページコンポーネント | 53 | 各ルートグループ内に直接定義 |

---

## Data Flow

### 1. シフト応募フロー（メインフロー）

```
Store Manager                  System                     Trainer
    │                            │                           │
    │── createShiftRequest() ──→ │                           │
    │                            │── status: pending_approval │
    │                            │                           │
HR ─│── approveShiftRequest() ─→ │                           │
    │                            │── status: open            │
    │                            │── notification ──────────→ │
    │                            │                           │
    │                            │ ←── applyToShift() ───── │
    │                            │     calculateRate()       │
    │                            │     rate_breakdown JSONB  │
    │                            │                           │
    │                    ┌───────┴───────┐                   │
    │                    │ auto_confirm? │                   │
    │                    └───┬───────┬───┘                   │
    │                   YES  │       │ NO                    │
    │                        │       │                       │
    │    auto: approved ←────┘       └──→ status: pending    │
    │    + attendance_record              │                  │
    │                            ←── approveApplication() ─ │
    │                                 status: approved       │
    │                                 + attendance_record    │
```

### 2. QR打刻フロー

```
Trainer                    API                      Store Scanner
   │                        │                           │
   │── generateQrToken() ──→│                           │
   │←── QR表示 ─────────────│                           │
   │                        │                           │
   │     (QRをスキャナーに見せる)                         │
   │                        │←── GET /api/attendance/   │
   │                        │    verify?token=xxx ──────│
   │                        │                           │
   │                        │── verifyQrToken()         │
   │                        │   clock_in or clock_out   │
   │                        │   GPS distance check      │
   │                        │   blank_status update     │
   │                        │                           │
   │                        │── { success: true } ─────→│
```

### 3. 時給計算ロジック

```
calculateRate(trainerId, shiftRequestId)
    │
    ├── Step 1: trainer.tenure_years 取得
    │
    ├── Step 2: hourly_rate_config から該当レンジ検索
    │   ├── 2.0〜3.0年 → ¥1,400
    │   ├── 3.0〜5.0年 → ¥1,600
    │   ├── 5.0〜7.0年 → ¥1,800
    │   └── 7.0年以上  → ¥2,000
    │
    ├── Step 3: 直近30日の出勤回数カウント
    │   └── 5回以上 → +¥200 (attendance_bonus)
    │
    ├── Step 4: 緊急ボーナス
    │   └── is_emergency → +¥500 (emergency_bonus)
    │
    ├── Step 5: コスト上限チェック
    │   └── min(total, cost_ceiling_config.max_hourly_rate)
    │
    └── return { base_rate, attendance_bonus, emergency_bonus, total }
        ※ 応募時点で fixed（後の設定変更の影響を受けない）
```

### 4. ブランク管理（pg_cron 自動更新 JST 02:00）

```
last_shift_date からの経過日数:
  ├── 0〜59日   → blank_status: 'ok'
  ├── 60〜89日  → blank_status: 'alert_60'        → 通知
  ├── 90〜119日 → blank_status: 'skill_check_required' → スキルチェック必須
  └── 120日以上 → blank_status: 'training_required'    → 再研修必須

応募時チェック:
  'skill_check_required' | 'training_required' → 応募不可
```

---

## API Design

### API Routes

| Method | Path | 認証 | 用途 |
|--------|------|------|------|
| GET | `/api/auth/demo-login?role=` | 不要 | デモログイン（開発環境のみ） |
| GET | `/api/auth/token-login?token=` | 不要 | マジックリンクログイン |
| GET/POST | `/api/attendance/verify?token=` | 不要* | QRコード打刻検証 |
| POST | `/api/confirm` | 不要 | メール確認リンク（前日リマインダー） |
| GET | `/api/cron/reminders` | Cron Secret | 定期リマインダー送信 |
| POST | `/api/line/webhook` | LINE署名 | LINE Webhook受信 |

*QRトークン自体が認証の役割を果たす（15分有効・1回限り）

### Server Actions（主要なもの）

| カテゴリ | Action | Input | Output |
|---------|--------|-------|--------|
| 応募 | `applyToShift` | `shiftRequestId` | `ActionResult<ShiftApplication>` |
| 承認 | `approveApplication` | `applicationId` | `ActionResult<void>` |
| 打刻 | `clockIn` | `{ applicationId, latitude, longitude }` | `ActionResult<AttendanceRecord>` |
| QR | `generateQrToken` | `applicationId, type` | `ActionResult<QrToken>` |
| 時給 | `calculateRate` | `{ trainerId, shiftRequestId }` | `RateBreakdown` |
| シフト作成 | `createShiftRequest` | `ShiftInput` | `ActionResult<ShiftRequest>` |
| オファー | `sendOffer` | `{ availabilityId, offeredRate }` | `ActionResult<ShiftOffer>` |

### 共通レスポンス型

```typescript
type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};
```

---

## Directory Structure

```
dr-stretch-spot/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 認証（login / register）
│   │   ├── (trainer)/                # トレーナー用（15ページ）
│   │   ├── (store)/                  # 店舗マネージャー用（9ページ）
│   │   ├── (hr)/                     # HR/エリアマネージャー用（11ページ）
│   │   ├── (admin)/                  # 管理者用（6ページ）
│   │   ├── api/                      # API Routes（5エンドポイント）
│   │   ├── auth/                     # Auth Callback
│   │   ├── layout.tsx                # Root Layout
│   │   ├── error.tsx                 # Global Error Handler
│   │   └── globals.css               # Tailwind CSS
│   ├── actions/                      # Server Actions（17ファイル）
│   │   ├── admin.ts                  # 管理ダッシュボード
│   │   ├── applications.ts           # シフト応募
│   │   ├── attendance.ts             # 出退勤
│   │   ├── pricing.ts               # 時給計算（コア）
│   │   ├── qr.ts                     # QRコード
│   │   ├── shifts.ts                 # シフト管理
│   │   ├── accounts.ts              # アカウント管理（管理者専用）
│   │   └── ...                       # 他11ファイル
│   ├── components/
│   │   ├── shared/                   # アプリ共有（Header, BottomNav, ErrorState, StaffLoginForm）
│   │   └── ui/                       # shadcn/ui プリミティブ（27個）
│   ├── lib/
│   │   ├── supabase/                 # DB接続（client / server / admin / middleware）
│   │   ├── line/                     # LINE連携（client / templates / verify）
│   │   ├── date.ts                   # JST日付ユーティリティ
│   │   ├── notifications.ts          # メールテンプレート
│   │   └── utils.ts                  # cn() ヘルパー
│   └── types/
│       └── database.ts               # 全型定義（530行, 18+ interfaces）
├── supabase/
│   └── migrations/                   # SQLマイグレーション（9ファイル）
│       ├── 001_initial_schema.sql    # 基本14テーブル
│       ├── 002_rls_policies.sql      # RLS全ポリシー
│       ├── 003_seed_data.sql         # 時給・ブランクルール初期値
│       ├── 004_rpc_functions.sql     # increment_filled_count
│       ├── 005_matching_attendance_flow.sql  # QR / 通知
│       ├── 006_resignation_flow.sql  # 退職申請
│       ├── 007_phase2_schema.sql     # 管理システム拡張
│       ├── 008_shift_availability.sql # 希望申告・オファー
│       └── 009_hr_shift_offers.sql   # HR直接オファー
├── scripts/
│   ├── seed-demo.js                  # デモデータ投入
│   └── insert-stores.mjs            # 全国220店舗マスタ投入
├── middleware.ts                      # 認証 + ロールベースルーティング
├── package.json
├── next.config.ts
└── tsconfig.json
```

---

## Database Schema

### テーブル一覧（16 + pg_cron ジョブ）

| テーブル | 行数目安 | 概要 |
|---------|---------|------|
| `profiles` | ユーザー数 | 認証後のロール・表示名 |
| `alumni_trainers` | トレーナー数 | トレーナーマスタ（銀行口座・ランク・ブランク） |
| `stores` | 221 | Dr.stretch全国店舗（座標・予算・自動確認） |
| `store_managers` | 店舗数 | 店舗マネージャー関連付け |
| `shift_requests` | 月次累積 | シフト募集（ステータスマシン） |
| `shift_templates` | 数十 | 繰り返しシフトのテンプレート |
| `shift_applications` | 月次累積 | 応募（時給固定・rate_breakdown JSONB） |
| `attendance_records` | 月次累積 | 出退勤（GPS・実労働時間） |
| `qr_tokens` | 一時的 | QRコード（15分有効・1回限り） |
| `evaluations` | 累積 | 勤務評価（星5・カテゴリ別） |
| `skill_checks` | 累積 | スキルチェック記録 |
| `notification_logs` | 大量 | 通知履歴（メール/LINE/プッシュ） |
| `hourly_rate_config` | 数件 | 時給設定マスタ |
| `blank_rule_config` | 3件 | ブランクルール（60/90/120日） |
| `config_snapshots` | 累積 | 設定ロールバック用スナップショット |
| `cost_ceiling_config` | 1件 | コスト上限設定 |
| `shift_availabilities` | 累積 | トレーナーの出勤可能日時 |
| `shift_offers` | 累積 | 直接オファー |
| `resignation_requests` | 累積 | 退職申請 |
| `line_link_tokens` | 一時的 | LINEアカウント連携トークン |

### RLS ポリシー概要

| テーブル | Trainer | Store Manager | HR/Admin |
|---------|---------|---------------|----------|
| alumni_trainers | 自身のみ R/W | 全員 R | 全員 R/W |
| shift_requests | open のみ R | 自店舗 R/W | 全員 R |
| shift_applications | 自身のみ R/W | 自店舗 R/W | 全員 R |
| attendance_records | 自身のみ R/W | 自店舗 R/W | 全員 R |
| hourly_rate_config | 全員 R | 全員 R | 全員 R/W |

### pg_cron ジョブ（3つ）

| ジョブ | 実行時間 (JST) | 処理 |
|-------|---------------|------|
| blank_status更新 | 毎日 02:00 | last_shift_date から経過日数を計算 → ステータス自動変更 |
| rank更新 | 毎日 03:00 | 出勤数 + 評価平均でランク自動昇格 |
| 月次予算リセット | 毎月1日 00:00 | emergency_budget_used = 0 |

---

## Development Workflow

### ローカル開発

```bash
# 1. 依存関係インストール
npm install

# 2. 環境変数設定
cp .env.local.example .env.local
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, LINE_* を設定

# 3. 開発サーバー起動
npm run dev          # http://localhost:3000

# 4. ロール別ログインURL
# /login           (トレーナー — Email/Password + 新規登録)
# /login/store     (店舗マネージャー — Email/Password)
# /login/hr        (HR — Email/Password)
# /login/admin     (管理者 — Email/Password)
# 各ページに「デモアカウントでログイン」ボタンあり（ENABLE_DEMO_LOGIN=true時）

# 5. デモログインAPI（内部用）
# /api/auth/demo-login?role=trainer  (トレーナー)
# /api/auth/demo-login?role=store    (店舗マネージャー)
# /api/auth/demo-login?role=hr       (HR)
# /api/auth/demo-login?role=admin    (管理者)
# 本番環境ではENABLE_DEMO_LOGIN=true が必要（未設定時は403エラー）
```

### コーディングルール

| ルール | 詳細 |
|-------|------|
| コンポーネント | Functional Components のみ（class 禁止） |
| データフェッチ | Server Components でデータ取得 → Client Components に props で渡す |
| 状態変更 | Server Actions (`src/actions/`) 経由のみ（直接DB操作禁止） |
| UI | shadcn/ui をベースに構築（カスタムプリミティブ禁止） |
| 型 | `src/types/database.ts` に全型を集約 |
| ビルド | `npm run build` エラー/警告ゼロ必須 |
| Lint | `npm run lint` 警告ゼロ必須 |
| 認証 | Server Action 冒頭で必ず `supabase.auth.getUser()` チェック |
| redirect | **Server Action 内で `redirect()` 使用禁止** — `return { success, error }` + クライアント側 `router.push()` |

### デプロイ

```bash
# ビルド確認
npm run build        # 53ページ, エラーゼロ

# Vercel デプロイ
npx vercel --prod --yes

# デプロイ後ヘルスチェック
curl https://dr-stretch-spot.vercel.app/api/health
```

### ブランチ戦略

| ブランチ | 用途 |
|---------|------|
| `master` | 本番（Vercel 自動デプロイ） |
| `cursor/*` | Cursor Agent による UI実装 |
| feature branches | 機能開発 |

---

## Middleware Routing

```typescript
// 1. Public Routes（認証不要）
"/login", "/login/store", "/login/hr", "/login/admin",
"/register", "/auth/callback", "/auth/magic"

// 2. 認証チェック（ロール別ログインページにリダイレクト）
未ログイン + /store/* → /login/store にリダイレクト
未ログイン + /hr/*    → /login/hr にリダイレクト
未ログイン + /admin/* → /login/admin にリダイレクト
未ログイン + その他   → /login にリダイレクト

// 3. プロフィールチェック
プロフィール未作成 → /register にリダイレクト

// 4. ロールベースルーティング
trainer       → /home, /shifts, /my-shifts, /clock, /earnings, /profile, /spot-setup, ...
store_manager → /store/*
hr            → /hr/*
admin         → /admin/*, /hr/*, /store/*（全アクセス可）
employee      → /home, /resignation, /profile のみ
```

---

## Future Improvements

### Phase 3（予定）

| 機能 | 概要 | 優先度 |
|------|------|--------|
| LINE Bot 双方向 | トレーナーがLINEからシフト確認・応募 | High |
| プッシュ通知 (Web) | ブラウザプッシュ通知 | Medium |
| レポート・分析 | 月次KPIレポート自動生成 | Medium |
| 地図表示 | 店舗一覧の地図UI | Low |
| トレーナー用デスクトップナビ | PC表示時のサイドバー（現在モバイルBottomNavのみ） | Low |
| 打刻リンク（PCトレーナー） | デスクトップからの `/clock` 直接アクセス導線 | Low |

### 技術的改善

| 項目 | 概要 |
|------|------|
| E2Eテスト | Playwright による全フロー自動テスト |
| OpenAPI Spec | API Routes の型安全なドキュメント生成 |
| i18n | 英語対応（グローバルトレーナー向け） |
| モニタリング | Sentry + Vercel Analytics 導入 |
| CI/CD | GitHub Actions によるビルド・テスト自動化 |

---

## Questions

> 現時点で開発を進めるにあたり、以下の情報が不足している。

1. **テストアカウント情報**: `seed-demo.js` で作成されるデモアカウントのメール/パスワードの一覧は？（本番環境にデモアカウントは残すのか）
2. **LINE Bot設計**: 現在 Webhook 受信のみ。トレーナー側からのコマンド受付（シフト確認・応募等）の仕様は決まっているか？
3. **メール配信**: Resend の送信ドメイン設定は完了しているか？（SPF/DKIM/DMARC）
4. **GPS精度要件**: `geofence_radius` のデフォルト値と許容誤差は？屋内精度の問題は？
5. **決済連携**: トレーナーへの報酬支払い（銀行振込）の連携先は決まっているか？
6. **スケーリング**: 同時接続ユーザー数の想定は？Supabase Pro の connection pooling 設定は？
7. **セキュリティ監査**: 銀行口座情報のカラム暗号化（pgcrypto）は必要か？
8. **データ保持**: notification_logs / attendance_records の保持期間ポリシーは？
