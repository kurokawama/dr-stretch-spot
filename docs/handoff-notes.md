# Dr.stretch SPOT エンジニア引き継ぎノート

> 最終更新: 2026-03-17

---

## 1. ローンチ前最終改善

### ビジネス要件に基づく改善（G1〜G8）— 2026-03-14〜15 実施済み

| # | 改善内容 | 対象ファイル | 目的 |
|---|---------|-------------|------|
| G1 | 確定済みシフトのキャンセル制限 | `src/actions/applications.ts`, `src/app/(trainer)/my-shifts/page.tsx` | approved状態のキャンセルは人事部電話のみ（直接キャンセル不可） |
| G2 | LINE通知ボタン2つ化 | `src/lib/line/templates.ts` | 「参加する」「人事部へ相談する」のみ（辞退ボタン廃止） |
| G3 | 退職時SPOT同意チェック | `src/actions/resignation.ts` | SPOT不参加選択時はinactiveステータスで登録 |
| G4 | SPOTステータストグル | `src/app/(trainer)/profile/page.tsx` | 受付中/一時停止の切替（プロフィール画面上部） |
| G5 | 在籍年数別時給テーブル表示 | `src/app/(trainer)/rank/page.tsx` | 「長く勤めるほど得」を可視化（4段階テーブル+進捗表示） |
| G6 | 店舗モバイルナビ最適化 | `src/app/(store)/layout.tsx` | モバイル: 9項目→5項目に絞り込み |
| G7 | SPOT設定完了時LINE連携誘導 | `src/app/(trainer)/spot-setup/page.tsx` | 完了画面にLINE連携カード追加 |
| G8 | LINE全メッセージの温かみ改善 | `src/lib/line/templates.ts` | パーソナライズ+温かい表現に全面書き換え |

### 本番セキュリティ強化（2026-03-17 実施済み）

| 変更内容 | 対象ファイル | 概要 |
|---------|-------------|------|
| デモログイン機能完全削除 | `StaffLoginForm.tsx`, 全login/page.tsx | デモボタン・デモprops・デモAPIルート全削除 |
| 自己登録（signup）完全削除 | `src/app/(auth)/login/page.tsx` | ログインのみ。新規登録UIを完全除去 |
| ミドルウェア強化 | `src/middleware.ts` | `/register` をPUBLIC_ROUTESから除外 |
| テストアカウントパスワード変更 | Supabase Auth | 全4アカウントを強固なパスワードに変更 |
| エラーメッセージ漏洩防止 | 全Server Actions（18ファイル） | `error.message` → 汎用日本語メッセージに変更 |
| 通知所有権検証追加 | `src/actions/notifications.ts` | 他ユーザーの通知アクセスをブロック |
| 検索入力サニタイゼーション強化 | `src/actions/admin.ts` | PostgREST filter injection防止 |

### ロール別独立ログインページ（2026-03-17 実施済み）

各ロール専用の独立したログインページを新設。URLで分離するセキュリティ強化設計。

| 変更内容 | 対象ファイル | 概要 |
|---------|-------------|------|
| トレーナーログイン | `src/app/(auth)/login/page.tsx` | Email/Password認証（ログインのみ） |
| 店舗ログイン | `src/app/(auth)/login/store/page.tsx` | Email/Password認証 |
| HRログイン | `src/app/(auth)/login/hr/page.tsx` | Email/Password認証 |
| Adminログイン | `src/app/(auth)/login/admin/page.tsx` | Email/Password認証 |
| 共通ログインフォーム | `src/components/shared/StaffLoginForm.tsx` | store/hr/admin共通のログインUIコンポーネント |
| ミドルウェア更新 | `src/middleware.ts` | 未認証時にロール別ログインURLにリダイレクト |

### アカウント管理機能（2026-03-17 実施済み）

管理者がスタッフアカウント（店舗マネージャー/HR/Admin）をCRUD管理できる機能を追加。

| 変更内容 | 対象ファイル | 概要 |
|---------|-------------|------|
| Server Action | `src/actions/accounts.ts` | Supabase Admin API によるアカウントCRUD |
| サーバーコンポーネント | `src/app/(admin)/admin/accounts/page.tsx` | アカウント一覧取得・権限チェック |
| クライアントUI | `src/app/(admin)/admin/accounts/accounts-client.tsx` | 作成/編集/削除ダイアログ付きCRUD UI |
| レイアウト更新 | `src/app/(admin)/layout.tsx` | サイドバーに「アカウント管理」追加 |

### Server Action ハング修正（2026-03-17 実施済み）

3つのServer Actionが特定条件で無応答になるバグを修正。

| 対象 | 原因 | 修正 |
|------|------|------|
| `src/actions/attendance.ts` | `.single()` が RLS で0行時に PGRST116 エラー + try-catch なし | `.maybeSingle()` + try-catch |
| `src/actions/notifications.ts` | 同上 | try-catch 追加 + 所有権検証追加 |
| `src/actions/line.ts` | `.single()` + try-catch なし | `.maybeSingle()` + try-catch |

---

## 2. ビジネスコアコンセプト

### 目的1: 在籍リテンション（長く勤めるほど得）

退職後のSPOTバイト時給が**在籍年数に連動**する仕組み。在職中から「辞めた後も得するために長く居よう」と思わせる。

| 在籍年数 | 基本時給 |
|---------|---------|
| 2〜3年 | ¥1,400/h |
| 3〜5年 | ¥1,600/h |
| 5〜7年 | ¥1,800/h |
| 7年以上 | ¥2,000/h |

実装: `src/lib/rate.ts` + `src/app/(trainer)/rank/page.tsx` の時給テーブルUI

### 目的2: 双方向マッチング

退職→自動的にSPOT候補として登録。退職時にSPOT参加意思を確認（`spot_interest` フラグ）。

- 同意 → `alumni_trainers` レコード作成 → `spot_status: pending_setup`
- 不同意 → `role: inactive`（いつでもプロフィールから再開可）

### キャンセルポリシー

- **pending（審査中）**: トレーナーが直接キャンセル可
- **approved（確定済み）**: 直接キャンセル不可。人事部へ電話（03-6451-1171）

### LINE Bot ボタン設計

オファー通知のボタンは**2つのみ**:
1. 「参加する」（postback: accept_offer）
2. 「人事部へ相談する」（tel: URI → 直接電話）

「辞退」ボタンは意図的に設置しない（電話で相談してもらう）。

---

## 3. セットアップ手順

### 前提条件

- Node.js 20+
- npm

### インストール

```bash
git clone https://github.com/kurokawama/dr-stretch-spot.git
cd dr-stretch-spot
npm install
```

### 環境変数（`.env.local`）

```env
NEXT_PUBLIC_SUPABASE_URL=https://wpliqlgrsfpymypgeqky.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service role key>

LINE_CHANNEL_SECRET=<LINE Channel Secret>
LINE_CHANNEL_ACCESS_TOKEN=<LINE Channel Access Token>

RESEND_API_KEY=<Resend API key>

NEXT_PUBLIC_APP_URL=https://dr-stretch-spot.vercel.app
```

### 開発サーバー

```bash
npm run dev
# → http://localhost:3000
```

### ビルド

```bash
npm run build  # エラーゼロを確認
npm run lint   # 修正ファイルにエラーがないことを確認
```

---

## 4. ディレクトリ構造

```
src/
├── app/
│   ├── (auth)/          # ログイン・プロフィール登録
│   ├── (trainer)/       # トレーナー向け（モバイルファースト）
│   ├── (store)/         # 店舗マネージャー向け（サイドバー+ボトムナビ）
│   ├── (hr)/            # HR向け（サイドバー）
│   ├── (admin)/         # 管理者向け
│   └── api/             # APIエンドポイント（LINE Webhook）
├── actions/             # Server Actions（全ビジネスロジック）
├── components/ui/       # shadcn/uiコンポーネント
├── lib/
│   ├── supabase/        # Supabase client/server/middleware
│   ├── line/            # LINE Bot テンプレート・SDK
│   ├── rate.ts          # 時給計算ロジック
│   ├── date.ts          # 日付ユーティリティ
│   └── notifications.ts # メール通知
└── types/               # TypeScript型定義

docs/
├── specification.md              # プロジェクト企画書・全仕様書
├── handoff-notes.md              # このファイル（引き継ぎノート）
├── test-guide.md                 # テスト手順書
└── trainer-registration-flow.md  # トレーナー登録フロー設計書

flow-diagram.json                 # 画面遷移図（JSON）
```

---

## 5. 認証・ルーティング

### ミドルウェア（`src/middleware.ts`）

- PUBLIC_ROUTES: `/login`, `/auth/callback`, `/auth/magic`
- **`/register` はPUBLIC_ROUTESから除外**（認証済みユーザーのプロフィール設定のみ）
- **ロール別ログインリダイレクト**: 未認証時、アクセス先に応じたログインページにリダイレクト
  - `/store/*` → `/login/store`
  - `/hr/*` → `/login/hr`
  - `/admin/*` → `/login/admin`
  - その他 → `/login`
- ロール別ルーティング: trainer→`/home`, store_manager→`/store`, hr→`/hr`, admin→全アクセス可
- employee→`/home`, `/resignation`, `/profile` のみ

### ロール別ログインページ

各ロール専用の独立したログインページ:

| ロール | URL | 認証方法 | コンポーネント |
|--------|-----|---------|--------------|
| トレーナー | `/login` | Email/Password（ログインのみ） | 専用UI |
| 店舗マネージャー | `/login/store` | Email/Password | `StaffLoginForm` |
| HR | `/login/hr` | Email/Password | `StaffLoginForm` |
| Admin | `/login/admin` | Email/Password | `StaffLoginForm` |

### アカウント作成方法

- **トレーナー**: HRまたはAdminが作成（自己登録不可）→ 詳細は `docs/trainer-registration-flow.md`
- **店舗/HR/Admin**: Adminがアカウント管理画面（`/admin/accounts`）で作成
- **デモログイン機能**: 完全削除済み（本番環境）

### テストアカウント

| ロール | Email | ログインURL |
|--------|-------|------------|
| トレーナー | trainer@test.com | `/login` |
| 店舗マネージャー | store@test.com | `/login/store` |
| 人事部（HR） | hr@test.com | `/login/hr` |
| 管理者（Admin） | admin@test.com | `/login/admin` |

**パスワードは管理者に確認してください（セキュリティのためドキュメントに記載しません）。**

---

## 6. ローンチ前チェックリスト

### 完了済み

- [x] ビルドエラーゼロ
- [x] デモログイン機能完全削除（ボタン・API・ハードコードされた認証情報）
- [x] 確定済みシフトの直接キャンセルブロック
- [x] LINE通知ボタン2つ化
- [x] Supabase RLS ポリシー全テーブル確認（匿名アクセスで全テーブル0行確認済み）
- [x] テストアカウントパスワード変更（強固なパスワードに更新済み）
- [x] 入力サニタイゼーション強化（PostgREST filter injection防止）
- [x] 所有権検証（通知APIに他ユーザーアクセスブロック追加）
- [x] エラーメッセージから内部情報漏洩防止（全Server Actions修正済み）
- [x] トレーナー自己登録UI完全削除

### 要手動設定（Supabase Dashboard）

- [ ] **Supabase DISABLE_SIGNUP設定**: Authentication > Settings > User Signups > 「Enable sign ups」をOFF
  - ※ Management APIトークン期限切れのため手動設定が必要
  - ※ コード側の自己登録UIは全て削除済み

### 要設定確認（デプロイ環境）

- [ ] LINE Webhook URL を本番URLに設定（`https://dr-stretch-spot.vercel.app/api/line/webhook`）
- [ ] Vercel 環境変数の設定（.env.localの全変数）
- [ ] Resend ドメイン認証（メール送信用）

### Phase 2 推奨改善

- [ ] HR招待制トレーナー登録フロー実装（`docs/trainer-registration-flow.md` 参照）
- [ ] 「今月の収入」を全件集計に変更（現在は直近5件のみ）
- [ ] ランク昇格プログレスのホーム表示
- [ ] シフト検索の「全シフトを見る」リセットボタン
- [ ] QRコードのローカル生成（外部API依存の削除）
- [ ] 法定労働条件通知の表示
- [ ] Rate limiting（メール送信等のリソース消費操作）

---

## 7. 主要テーブルのリレーション

```
profiles (auth.users連携)
  └── alumni_trainers (1:1, auth_user_id)
        ├── shift_applications (1:N, trainer_id)
        │     └── shift_requests (N:1, shift_request_id)
        │           └── stores (N:1, store_id)
        ├── attendance_records (1:N, trainer_id)
        ├── evaluations (1:N, trainer_id)
        └── shift_offers (1:N, trainer_id)

resignation_requests (auth_user_id → profiles)
  → completed時: alumni_trainers レコード作成
```

---

## 8. LINE Bot 設定

| 項目 | 値 |
|------|---|
| LINE ID | @269knmbd |
| チャネルID | 2009367454 |
| Webhook | `{APP_URL}/api/line/webhook` |
| テンプレート | `src/lib/line/templates.ts` |

### メッセージ種別

| 種別 | トリガー | ボタン |
|------|---------|--------|
| オファー通知 | HR/店舗がオファー作成 | 「参加する」「人事部へ相談する」 |
| シフト確定 | 応募承認時 | なし（テキストのみ） |
| 前日リマインド | Cron 毎朝7:00 | 「了解！行きます」「人事部へ相談する」 |
| 連携完了 | LINE連携成功時 | なし |

---

## 9. セキュリティ対策（実施済み）

| 対策 | 状態 | 詳細 |
|------|------|------|
| RLS（Row Level Security） | 全テーブル有効 | 匿名アクセスで全テーブル0行確認済み |
| 自己登録ブロック | UI削除済み / Supabase設定待ち | signupフォーム削除、`/register` 非公開化 |
| デモログイン | 完全削除 | APIルート・UIボタン・ハードコード認証情報全削除 |
| テストアカウント | パスワード変更済み | 強固なパスワードに更新（`test1234`は無効） |
| エラーメッセージ | 汎用化済み | 内部情報（テーブル名・カラム名）非露出 |
| 入力サニタイゼーション | 強化済み | PostgREST filter injection防止 |
| 所有権検証 | 追加済み | 通知APIで他ユーザーアクセスブロック |

---

## 10. 既知のLint警告

`npm run lint` はエラー・警告ともにゼロです（2026-03-17 確認済み）。

---

## 11. 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-03-17 | 本番セキュリティ強化（デモ削除・signup削除・パスワード変更・エラー漏洩防止・所有権検証） |
| 2026-03-17 | トレーナー登録フロー設計書作成（`docs/trainer-registration-flow.md`） |
| 2026-03-17 | ロール別独立ログインページ新設 |
| 2026-03-17 | アカウント管理機能（Admin） |
| 2026-03-17 | Server Action ハング修正（attendance/notifications/line） |
| 2026-03-15 | ローンチ前最終改善（G1〜G8, P0〜P1） |
