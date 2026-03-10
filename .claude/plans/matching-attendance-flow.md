# Dr.stretch SPOT — マッチング・打刻フロー実装計画

## 合意事項（Agent Teams討論結果）
- QR方向: 出勤・退勤とも「ワーカー提示 → 店舗スキャン」で統一
- マッチング確定: 先着順自動確定（デフォルト）
- 権限: trainer / store / admin の3ロール + area_manager（同じ画面でフィルタ）
- 通知: メールのみ（Resend）。LINE は Phase 5 で計画
- 前日確認未返信: 人事ダッシュボードにアラート。自動キャンセルしない
- 人事管理画面: キャンセル/追加アサイン/人員補充が可能

## Phase 1: DB拡張・型定義・基盤（Claude Code）
### 新規テーブル
- qr_tokens: QRコードトークン管理
- notification_logs: 通知送信ログ

### テーブル変更
- shift_requests: status に 'pending_approval' 追加、approved_by/approved_at 追加
- shift_applications: pre_day_confirmed, reminder フィールド追加
- stores: auto_confirm カラム追加
- store_managers: role に 'area_manager' 追加

### TypeScript型更新
- database.ts に新テーブルの型追加
- 既存型の更新

## Phase 2: Server Actions・API Routes（Claude Code）
- QRトークン生成・検証 API
- シフト承認ワークフロー（HR）
- 先着順自動確定ロジック
- 退勤リクエスト → QR生成フロー
- 打刻関連の既存 Actions をQR対応に更新

## Phase 3: HR管理画面（Claude Code）
- HR ダッシュボード（承認キュー + マッチング一覧 + 出勤状況）
- HR マッチング管理（キャンセル/追加アサイン/人員補充）
- エリアマネージャー対応（同じ画面、フィルタ表示）

## Phase 4: 店舗・トレーナーUI更新（Cursor AI候補）
- 店舗: QRスキャナー、退勤リクエスト、明日の出勤リスト
- トレーナー: QRコード表示、前日確認OKボタン

## Phase 5: 通知・リマインド（Claude Code）
- Resend メール統合
- Vercel Cron: 前日18時/当日7時リマインド
- 前日確認OKボタンのメールリンク処理
- LINE連携の計画文書化

## 現在のステータス
- Phase 1 実装中
