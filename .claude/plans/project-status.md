# Dr.stretch SPOT — プロジェクト状態（2026-02-28 時点）

## 現在のステータス: テスト準備完了

### 本番URL
https://dr-stretch-spot.vercel.app

### GitHub
- リポジトリ: https://github.com/kurokawama/dr-stretch-spot
- ブランチ: `master`
- 最新コミット: `038e32a` (Prepare for user testing)
- **バックアップタグ: `v0.2.0-pre-test`** ← 壊れたらここに戻す

---

## 完了済みの実装

### Phase 1（基盤）
- 退職申請フロー（employee → resignation → SPOT有効化）
- OTP認証（メール認証コード）
- ミドルウェア（ロールベースルーティング）
- 全テーブル RLS + ポリシー完備

### Phase 2（全機能）
- トレーナー: ホーム / シフト検索 / 応募 / マイシフト / QR打刻 / 収入 / ランク / 通知 / プロフィール
- 店舗: ダッシュボード / シフト作成 / テンプレート / 応募管理(Tabs) / 出勤管理(QR) / 評価 / 利用実績(月別) / 通知
- HR: マッチング管理 / 時給テーブル / ブランクルール / コスト上限 / シミュレーション / 監査ログ / ロールバック
- Admin: トレーナー管理 / 店舗管理 / コスト管理 / スキルチェック管理

### UX改善（Phase 2.5）
- BottomNav にプロフィールリンク追加
- 通知ディープリンク（カテゴリ→画面遷移）
- 時給プレビュー（応募画面で実際の金額表示）
- 店舗ダッシュボード強化（統計・シフトプレビュー）
- 応募一覧 Tabs（審査待ち/承認済み/却下）
- 利用実績・収入ページの月切替ナビ
- ランクページに評価履歴リンク + 昇格基準表

### テスト準備
- エラーメッセージ全日本語化（13ファイル・80箇所）
- 招待制ログイン（shouldCreateUser: false）
- ヘッダーにログアウト + アカウント切替
- テスト手順書: `docs/test-guide.md`
- デモシードデータ投入済み
- 店舗位置情報設定済み（大阪市中央区）

---

## テストアカウント

| ロール | メール | ログイン方法 |
|--------|--------|-------------|
| トレーナー（黒川） | (登録メール) | OTP認証 |
| 店舗マネージャー | store@test.com | デモボタン or パスワード: test1234 |
| HR | hr@test.com | デモボタン or パスワード: test1234 |
| Admin | admin@test.com | デモボタン or パスワード: test1234 |

### ダミートレーナー（シードデータ）
| 名前 | 認証ID | ランク | 備考 |
|------|--------|--------|------|
| Tanaka Yuki | c3ec1bec-774b-4846-9c0c-185c5e18deb1 | silver | 3年 |
| Suzuki Ren | a29a8942-ce8c-4e0a-820c-d96dbe5462bb | gold | 5.5年 |
| Yamamoto Hina | 6f59a9a2-e9c5-4642-a0a1-a462983fea00 | bronze | 1.5年 |

---

## DB 情報

### Supabase
- プロジェクト: wpliqlgrsfpymypgeqky
- Management API Token: sbp_194efc23d6b1ca23eee71176405e6b27be7e40da
- Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbGlxbGdyc2ZweW15cGdlcWt5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExMTc2OCwiZXhwIjoyMDg3Njg3NzY4fQ.yi1pqQOp_zFK-zJlve8WcXxBfODNhAI972tXjrjSqms

### 主要レコードID
- Store: 7ba000b2-24b1-4d7b-bd35-2d00f6716c8e
- Store Manager record: c013d367-3f71-4455-9f84-33f72b135d30
- Kurokawa trainer: 67c492d3-d2f4-4772-8a62-51ae37a64cd6
- Kurokawa auth: 8888ab3a-3a05-4d28-a57c-b7a1bf3a22c6

### シードデータ復元
```bash
# デモデータが消えた場合
cd dr-stretch-spot
node scripts/seed-demo.js
```

---

## 出張後にやること（優先順位）

### P0: テスト開始前に必須
1. **SMTP設定** — Resend等のアカウント開設 + Supabase連携（OTP送信の2通/時間制限解消）
2. **テスター登録** — 実テスターのメールアドレスで auth ユーザー作成
3. **実店舗データ** — doctorstretch.com から店舗情報取得 → stores テーブル更新

### P1: テスト品質向上
4. **店舗マネージャー認証方式** — テスト用にOTP or パスワード設定
5. **エラーメッセージ確認** — 実際にフローを歩いて表示確認

### P2: 本番前
6. **ステージング環境** — テストDBと本番DBの分離
7. **E2Eテスト** — Playwright でコアフロー自動テスト
8. **本番SMTP** — 本番メール送信設定

---

## バックアップ復元手順

### コードが壊れた場合
```bash
git checkout v0.2.0-pre-test
# または
git reset --hard v0.2.0-pre-test
git push origin master --force
```

### DBデータが壊れた場合
```bash
# シードスクリプトは ON CONFLICT で冪等
node scripts/seed-demo.js
```

### 全部壊れた場合
```bash
git clone https://github.com/kurokawama/dr-stretch-spot.git
cd dr-stretch-spot
git checkout v0.2.0-pre-test
npm install
# .env.local を再設定（下記参照）
node scripts/seed-demo.js
```

### .env.local の内容（再設定用）
```
NEXT_PUBLIC_SUPABASE_URL=https://wpliqlgrsfpymypgeqky.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbGlxbGdyc2ZweW15cGdlcWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTE3NjgsImV4cCI6MjA4NzY4Nzc2OH0.RIKrFPVdxoFEELJUKi31seGY3agRAxUmfOieCuqBQ48
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbGlxbGdyc2ZweW15cGdlcWt5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjExMTc2OCwiZXhwIjoyMDg3Njg3NzY4fQ.yi1pqQOp_zFK-zJlve8WcXxBfODNhAI972tXjrjSqms
```

---

## 3AI 振り分けメモ（次回実装時）
- Plan 承認後、コード着手前に「AI振り分け表」を必ず作成する
- 標準UI 3ファイル以上 → Cursor AI（例外なし）
- Claude Code が直接やっていいUI: 2ファイル以下の小修正のみ
- 詳細: ~/.claude/CLAUDE.md Step 4 参照
