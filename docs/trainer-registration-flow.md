# トレーナー登録フロー設計書

> 最終更新: 2026-03-17

---

## 概要

退職したトレーナーがSPOTに参加するための登録フロー。**一般ユーザーの自己登録は完全に禁止**されており、必ず人事部（HR）を起点とした招待制で運用する。

---

## フロー全体像

```
[HR] QRコード/招待リンク発行
  ↓
[HR] LINE Bot経由でトレーナーに送信
  ↓
[トレーナー] LINEで招待リンクを受信
  ↓
[トレーナー] Webアプリで登録（招待トークン必須）
  ↓
[システム] LINE連携完了（Web + LINE紐付け）
  ↓
[トレーナー] SPOT設定完了 → シフト検索開始
```

---

## 詳細フロー

### Phase 1: HR側 — 招待発行

1. **退職手続き完了時**
   - `resignation_requests` が `completed` ステータスに更新
   - `alumni_trainers` レコードが自動作成（`spot_status: pending_setup`）
   - トレーナーがSPOT参加に同意した場合のみ

2. **HR管理画面で招待QRコード/リンク発行**
   - HR画面: `/hr/trainers` → 対象トレーナーの「招待リンク発行」ボタン
   - システムが一意の招待トークン（UUID v4）を生成
   - `invitation_tokens` テーブルに保存:
     ```
     id, trainer_id, token, expires_at, used_at, created_by
     ```
   - 有効期限: 72時間
   - QRコード: 招待URLをエンコード（`{APP_URL}/register?token={UUID}`）

3. **LINE Bot経由で送信**
   - HRが「招待リンク送信」ボタンをクリック
   - LINE連携済みの場合: LINE Flex Messageで招待リンク+QRコードを送信
   - LINE未連携の場合: メールで招待リンクを送信

### Phase 2: トレーナー側 — 登録

4. **招待リンクからWebアプリにアクセス**
   - URL: `/register?token={UUID}`
   - トークン検証:
     - トークン存在確認
     - 有効期限チェック
     - 使用済みチェック
   - 検証失敗時: エラー画面（「招待リンクが無効です。人事部にお問い合わせください。」）

5. **アカウント作成**
   - メールアドレス入力（退職時のメールが自動入力）
   - パスワード設定（6文字以上）
   - Supabase Admin APIでアカウント作成（サーバーサイド）
   - `profiles` テーブルにロール `trainer` で登録

6. **プロフィール設定**
   - 氏名・電話番号・希望エリア・勤務可能時間等を入力
   - `alumni_trainers` の情報を更新

### Phase 3: LINE連携

7. **LINE連携（推奨）**
   - SPOT設定完了画面でLINE連携カードを表示（既存実装: G7）
   - LINE Bot友だち追加 → 連携トークン入力 → `line_link_tokens` で紐付け
   - 連携完了後、LINE経由でシフトオファー受信可能

---

## セキュリティ設計

### アクセス制御

| 操作 | 許可 | 方法 |
|------|------|------|
| トレーナーアカウント作成 | HRのみ（招待トークン経由） | Supabase Admin API |
| 店舗/HR/Adminアカウント作成 | Adminのみ | アカウント管理画面 |
| 自己登録（signup） | 完全禁止 | Supabase DISABLE_SIGNUP + UI削除 |
| ログイン | 既存アカウントのみ | Email/Password |

### 招待トークンの安全性

- UUID v4（推測不可能）
- 72時間有効期限
- 1回限り使用
- 使用後は `used_at` にタイムスタンプ記録
- HRのみ発行可能（ロールチェック）

### Supabase設定

- **DISABLE_SIGNUP**: `true`（Supabase Dashboard設定必須）
- **アカウント作成**: サーバーサイドのみ（`supabase.auth.admin.createUser()`）
- **ミドルウェア**: `/register` はPUBLIC_ROUTESから除外済み（認証必須 or トークン検証）

---

## データベース変更（Phase 2実装時）

### 新規テーブル: `invitation_tokens`

```sql
CREATE TABLE invitation_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES alumni_trainers(id),
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: HRとAdminのみ読み書き可能
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR and Admin can manage invitations"
  ON invitation_tokens
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'area_manager', 'admin')
    )
  );
```

---

## 実装優先度

| 優先度 | 内容 | 状態 |
|--------|------|------|
| P0 | 自己登録UI削除（signup機能） | 完了 |
| P0 | Supabase DISABLE_SIGNUP設定 | **要手動設定** |
| P1 | 招待トークンテーブル作成 | 未実装（Phase 2） |
| P1 | HR招待リンク発行UI | 未実装（Phase 2） |
| P1 | トークン付き登録フロー | 未実装（Phase 2） |
| P2 | LINE Bot経由の招待送信 | 未実装（Phase 2） |
| P2 | QRコード生成（ローカル） | 未実装（Phase 2） |

---

## 現在の暫定運用（Phase 2実装前）

1. HRがAdminに連絡 → Adminがアカウント管理画面でトレーナーアカウントを作成
2. 作成したメールアドレス・パスワードをHR経由でトレーナーに伝達
3. トレーナーが `/login` からログイン → プロフィール設定 → SPOT設定

---

## 注意事項

- **Supabase Dashboardで `DISABLE_SIGNUP` を `true` に設定すること**（管理APIトークン期限切れのため手動設定が必要）
  - 場所: Authentication > Settings > User Signups > 「Enable sign ups」をOFF
- 現在のコードからは自己登録のUI（signupフォーム）は完全に削除済み
- ミドルウェアで `/register` はPUBLIC_ROUTESから除外済み
