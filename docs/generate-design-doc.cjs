/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, TableOfContents
} = require("docx");

const PAGE_W = 11906;
const PAGE_H = 16838;
const MARGIN = 1440;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BLUE = "1B4F72";
const LIGHT_BLUE = "D6EAF8";
const ACCENT = "2E86C1";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function heading1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text, bold: true, size: 32, font: "Yu Gothic", color: BLUE })] });
}
function heading2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 }, children: [new TextRun({ text, bold: true, size: 26, font: "Yu Gothic", color: BLUE })] });
}
function heading3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 }, children: [new TextRun({ text, bold: true, size: 22, font: "Yu Gothic", color: ACCENT })] });
}
function para(text, opts = {}) {
  return new Paragraph({ spacing: { after: 80 }, ...opts, children: [new TextRun({ text, size: 20, font: "Yu Gothic", ...opts.run })] });
}
function boldPara(label, value) {
  return new Paragraph({ spacing: { after: 60 }, children: [
    new TextRun({ text: label, bold: true, size: 20, font: "Yu Gothic" }),
    new TextRun({ text: value, size: 20, font: "Yu Gothic" }),
  ]});
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 18, font: "Yu Gothic" })]
  });
}

function makeCell(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text: String(text), size: 18, font: "Yu Gothic", ...opts.run })];
  return new TableCell({
    borders, margins: cellMargins,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ spacing: { after: 0 }, children: runs })],
  });
}
function headerCell(text, width) {
  return makeCell(text, { width, shading: BLUE, run: { color: "FFFFFF", bold: true } });
}
function makeTable(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths[i])) }),
      ...rows.map(row => new TableRow({
        children: row.map((cell, i) => makeCell(cell, { width: colWidths[i] }))
      }))
    ]
  });
}

// ── DB Tables Data ──
const tables = [
  {
    name: "profiles",
    desc: "認証メタデータ。Supabase Auth (auth.users) と1:1対応。ロール管理の中心テーブル。",
    cols: [
      ["id", "UUID", "PK, FK→auth.users", "Supabase Auth のユーザーID"],
      ["role", "TEXT", "NOT NULL", "trainer|store_manager|hr|admin|area_manager|employee"],
      ["display_name", "TEXT", "", "表示名"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", "作成日時"],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", "更新日時"],
    ]
  },
  {
    name: "alumni_trainers",
    desc: "退職トレーナーのメインテーブル。SPOT登録・ブランク管理・ランク・LINE連携を含む。",
    cols: [
      ["id", "UUID", "PK, DEFAULT uuid_generate_v4()", "トレーナーID"],
      ["auth_user_id", "UUID", "UNIQUE, FK→auth.users", "認証ユーザーID"],
      ["email", "TEXT", "NOT NULL", "メールアドレス"],
      ["full_name", "TEXT", "NOT NULL", "氏名"],
      ["full_name_kana", "TEXT", "", "氏名（カナ）"],
      ["phone", "TEXT", "", "電話番号"],
      ["avatar_url", "TEXT", "", "アバター画像URL"],
      ["tenure_years", "NUMERIC", "", "在籍年数（時給計算に使用）"],
      ["employment_start_date", "DATE", "", "入社日"],
      ["employment_end_date", "DATE", "", "退職日"],
      ["preferred_areas", "TEXT[]", "DEFAULT '{}'", "希望勤務エリア"],
      ["preferred_time_slots", "TEXT[]", "DEFAULT '{}'", "希望時間帯"],
      ["certifications", "TEXT[]", "DEFAULT '{}'", "保有資格"],
      ["bio", "TEXT", "", "自己紹介"],
      ["bank_name", "TEXT", "", "銀行名"],
      ["bank_branch", "TEXT", "", "支店名"],
      ["bank_account_type", "TEXT", "", "口座種別（普通/当座）"],
      ["bank_account_number", "TEXT", "", "口座番号"],
      ["status", "TEXT", "DEFAULT 'pending'", "pending|active|suspended|inactive"],
      ["spot_status", "TEXT", "DEFAULT 'registered'", "registered|active|inactive|paused"],
      ["last_shift_date", "DATE", "", "最終シフト日（ブランク計算基準）"],
      ["blank_status", "TEXT", "DEFAULT 'ok'", "ok|alert_60|skill_check_required|training_required"],
      ["skill_check_completed_at", "TIMESTAMPTZ", "", "スキルチェック完了日時"],
      ["training_completed_at", "TIMESTAMPTZ", "", "研修完了日時"],
      ["rank", "TEXT", "DEFAULT 'bronze'", "bronze|silver|gold|platinum"],
      ["badges", "TEXT[]", "DEFAULT '{}'", "獲得バッジ一覧"],
      ["resignation_id", "UUID", "FK→resignation_requests", "退職申請ID"],
      ["line_user_id", "TEXT", "UNIQUE", "LINE ユーザーID"],
      ["line_linked_at", "TIMESTAMPTZ", "", "LINE連携日時"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", "作成日時"],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", "更新日時"],
    ]
  },
  {
    name: "stores",
    desc: "店舗マスタ。緊急予算・ジオフェンス・自動確認設定を含む。",
    cols: [
      ["id", "UUID", "PK", "店舗ID"],
      ["name", "TEXT", "NOT NULL", "店舗名"],
      ["area", "TEXT", "NOT NULL", "エリア"],
      ["prefecture", "TEXT", "", "都道府県"],
      ["address", "TEXT", "", "住所"],
      ["phone", "TEXT", "", "電話番号"],
      ["latitude", "NUMERIC", "", "緯度（ジオフェンス用）"],
      ["longitude", "NUMERIC", "", "経度（ジオフェンス用）"],
      ["geofence_radius_meters", "INT", "DEFAULT 200", "ジオフェンス半径（メートル）"],
      ["emergency_budget_monthly", "INT", "DEFAULT 50000", "月間緊急予算（円）"],
      ["emergency_budget_used", "INT", "DEFAULT 0", "使用済み緊急予算"],
      ["emergency_budget_reset_at", "TIMESTAMPTZ", "", "予算リセット日時"],
      ["auto_confirm", "BOOLEAN", "DEFAULT false", "応募自動承認フラグ"],
      ["cost_ceiling_override", "INT", "", "店舗別コスト上限（円/時）"],
      ["status", "TEXT", "DEFAULT 'active'", "active|inactive"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "store_managers",
    desc: "店舗管理スタッフ。ロールベースのアクセス制御に使用。",
    cols: [
      ["id", "UUID", "PK", "管理者ID"],
      ["auth_user_id", "UUID", "FK→auth.users", "認証ユーザーID"],
      ["email", "TEXT", "NOT NULL", "メールアドレス"],
      ["full_name", "TEXT", "", "氏名"],
      ["phone", "TEXT", "", "電話番号"],
      ["store_id", "UUID", "FK→stores", "所属店舗ID"],
      ["role", "TEXT", "NOT NULL", "store_manager|hr|admin|area_manager"],
      ["managed_areas", "TEXT[]", "DEFAULT '{}'", "管理エリア（area_manager用）"],
      ["status", "TEXT", "DEFAULT 'active'", "active|inactive"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "shift_requests",
    desc: "シフト募集。承認ワークフロー・緊急フラグ・ソース追跡を含む。",
    cols: [
      ["id", "UUID", "PK", "シフトID"],
      ["store_id", "UUID", "FK→stores", "店舗ID"],
      ["created_by", "UUID", "FK→store_managers (nullable)", "作成者（店舗）"],
      ["created_by_hr_id", "UUID", "FK→store_managers (nullable)", "作成者（HR）"],
      ["title", "TEXT", "NOT NULL", "シフトタイトル"],
      ["description", "TEXT", "", "詳細説明"],
      ["shift_date", "DATE", "NOT NULL", "シフト日"],
      ["start_time", "TIME", "NOT NULL", "開始時間"],
      ["end_time", "TIME", "NOT NULL", "終了時間"],
      ["break_minutes", "INT", "DEFAULT 0", "休憩時間（分）"],
      ["required_count", "INT", "NOT NULL", "必要人数"],
      ["filled_count", "INT", "DEFAULT 0", "充足人数"],
      ["required_certifications", "TEXT[]", "DEFAULT '{}'", "必要資格"],
      ["is_emergency", "BOOLEAN", "DEFAULT false", "緊急フラグ"],
      ["emergency_bonus_amount", "INT", "DEFAULT 0", "緊急ボーナス額（円）"],
      ["source", "TEXT", "DEFAULT 'store_created'", "store_created|direct_offer|hr_offer"],
      ["offer_id", "UUID", "FK→shift_offers (nullable)", "オファーID"],
      ["status", "TEXT", "DEFAULT 'pending_approval'", "pending_approval|open|closed|cancelled|completed"],
      ["approved_by", "UUID", "", "承認者ID"],
      ["approved_at", "TIMESTAMPTZ", "", "承認日時"],
      ["target_areas", "TEXT[]", "DEFAULT '{}'", "対象エリア"],
      ["published_at", "TIMESTAMPTZ", "", "公開日時"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "shift_applications",
    desc: "トレーナーのシフト応募。時給内訳(JSONB)・前日確認フラグを含む。",
    cols: [
      ["id", "UUID", "PK", "応募ID"],
      ["shift_request_id", "UUID", "FK→shift_requests", "シフトID"],
      ["trainer_id", "UUID", "FK→alumni_trainers", "トレーナーID"],
      ["confirmed_rate", "INT", "", "確定時給（円/時）"],
      ["rate_breakdown", "JSONB", "", "{base_rate, attendance_bonus, emergency_bonus, ceiling_applied}"],
      ["status", "TEXT", "DEFAULT 'pending'", "pending|approved|rejected|cancelled|completed|no_show"],
      ["applied_at", "TIMESTAMPTZ", "DEFAULT now()", "応募日時"],
      ["reviewed_at", "TIMESTAMPTZ", "", "レビュー日時"],
      ["reviewed_by", "UUID", "", "レビュー者ID"],
      ["cancel_reason", "TEXT", "", "キャンセル理由"],
      ["cancelled_at", "TIMESTAMPTZ", "", "キャンセル日時"],
      ["pre_day_reminder_sent", "BOOLEAN", "DEFAULT false", "前日リマインダー送信済み"],
      ["pre_day_confirmed", "BOOLEAN", "DEFAULT false", "前日確認済み"],
      ["pre_day_confirmed_at", "TIMESTAMPTZ", "", "前日確認日時"],
      ["day_reminder_sent", "BOOLEAN", "DEFAULT false", "当日リマインダー送信済み"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "attendance_records",
    desc: "勤怠記録。位置情報検証・実働時間計算を含む。application_idでUNIQUE。",
    cols: [
      ["id", "UUID", "PK", "勤怠ID"],
      ["application_id", "UUID", "UNIQUE, FK→shift_applications", "応募ID（1:1）"],
      ["trainer_id", "UUID", "FK→alumni_trainers", "トレーナーID"],
      ["store_id", "UUID", "FK→stores", "店舗ID"],
      ["shift_date", "DATE", "NOT NULL", "シフト日"],
      ["scheduled_start", "TIME", "", "予定開始時間"],
      ["scheduled_end", "TIME", "", "予定終了時間"],
      ["clock_in_at", "TIMESTAMPTZ", "", "出勤打刻時間"],
      ["clock_out_at", "TIMESTAMPTZ", "", "退勤打刻時間"],
      ["clock_in_latitude", "NUMERIC", "", "出勤時の緯度"],
      ["clock_in_longitude", "NUMERIC", "", "出勤時の経度"],
      ["clock_out_latitude", "NUMERIC", "", "退勤時の緯度"],
      ["clock_out_longitude", "NUMERIC", "", "退勤時の経度"],
      ["is_location_verified", "BOOLEAN", "DEFAULT false", "位置検証結果"],
      ["actual_work_minutes", "INT", "", "実働時間（分）"],
      ["break_minutes", "INT", "DEFAULT 0", "休憩時間（分）"],
      ["overtime_minutes", "INT", "DEFAULT 0", "残業時間（分）"],
      ["status", "TEXT", "DEFAULT 'scheduled'", "scheduled|clocked_in|clocked_out|verified|disputed"],
      ["manager_note", "TEXT", "", "マネージャー備考"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "qr_tokens",
    desc: "QR打刻トークン。15分有効の使い捨てトークン。",
    cols: [
      ["id", "UUID", "PK", "トークンID"],
      ["application_id", "UUID", "FK→shift_applications", "応募ID"],
      ["token", "TEXT", "UNIQUE, NOT NULL", "QRトークン文字列"],
      ["type", "TEXT", "NOT NULL", "clock_in|clock_out"],
      ["expires_at", "TIMESTAMPTZ", "NOT NULL", "有効期限（生成から15分）"],
      ["used_at", "TIMESTAMPTZ", "", "使用日時"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "shift_templates",
    desc: "再利用可能なシフトテンプレート。繰返し設定対応。",
    cols: [
      ["id", "UUID", "PK", "テンプレートID"],
      ["store_id", "UUID", "FK→stores", "店舗ID"],
      ["created_by", "UUID", "FK→store_managers", "作成者ID"],
      ["name", "TEXT", "NOT NULL", "テンプレート名"],
      ["title", "TEXT", "", "シフトタイトル"],
      ["description", "TEXT", "", "説明"],
      ["start_time", "TIME", "", "開始時間"],
      ["end_time", "TIME", "", "終了時間"],
      ["break_minutes", "INT", "DEFAULT 0", "休憩（分）"],
      ["required_count", "INT", "", "必要人数"],
      ["required_certifications", "TEXT[]", "DEFAULT '{}'", "必要資格"],
      ["is_recurring", "BOOLEAN", "DEFAULT false", "繰返しフラグ"],
      ["recurring_days", "INT[]", "DEFAULT '{}'", "繰返し曜日（0=日〜6=土）"],
      ["is_active", "BOOLEAN", "DEFAULT true", "有効フラグ"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "evaluations",
    desc: "シフト後のトレーナー評価。1-5星 + カテゴリ別評価。application_idでUNIQUE。",
    cols: [
      ["id", "UUID", "PK", "評価ID"],
      ["application_id", "UUID", "UNIQUE, FK→shift_applications", "応募ID（1:1）"],
      ["trainer_id", "UUID", "FK→alumni_trainers", "トレーナーID"],
      ["store_id", "UUID", "FK→stores", "店舗ID"],
      ["evaluator_id", "UUID", "", "評価者ID"],
      ["rating", "INT", "CHECK (1-5)", "総合評価（1-5）"],
      ["categories", "JSONB", "", "カテゴリ別評価"],
      ["comment", "TEXT", "", "コメント"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "skill_checks",
    desc: "スキルチェック・研修の記録。",
    cols: [
      ["id", "UUID", "PK", "チェックID"],
      ["trainer_id", "UUID", "FK→alumni_trainers", "トレーナーID"],
      ["checked_by", "UUID", "", "チェック実施者ID"],
      ["check_type", "TEXT", "NOT NULL", "skill_check|training"],
      ["check_date", "DATE", "", "実施日"],
      ["result", "TEXT", "DEFAULT 'pending'", "pass|fail|pending"],
      ["score", "INT", "", "スコア"],
      ["notes", "TEXT", "", "備考"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "hourly_rate_config",
    desc: "在籍年数ベースの時給設定。出勤ボーナス閾値を含む。",
    cols: [
      ["id", "UUID", "PK", "設定ID"],
      ["tenure_min_years", "NUMERIC", "NOT NULL", "在籍年数下限"],
      ["tenure_max_years", "NUMERIC", "", "在籍年数上限"],
      ["base_rate", "INT", "NOT NULL", "基本時給（円）"],
      ["attendance_bonus_threshold", "INT", "DEFAULT 5", "出勤ボーナス閾値（回/30日）"],
      ["attendance_bonus_amount", "INT", "DEFAULT 200", "出勤ボーナス額（円）"],
      ["effective_from", "DATE", "", "有効開始日"],
      ["effective_until", "DATE", "", "有効終了日"],
      ["is_active", "BOOLEAN", "DEFAULT true", "有効フラグ"],
      ["created_by", "UUID", "", "作成者ID"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "blank_rule_config",
    desc: "ブランク日数閾値ルール設定。",
    cols: [
      ["id", "UUID", "PK", "ルールID"],
      ["rule_type", "TEXT", "NOT NULL", "alert_60|skill_check_required|training_required"],
      ["threshold_days", "INT", "NOT NULL", "閾値日数"],
      ["action_required", "TEXT", "", "必要アクション説明"],
      ["description", "TEXT", "", "ルール説明"],
      ["is_active", "BOOLEAN", "DEFAULT true", "有効フラグ"],
      ["created_by", "UUID", "", "作成者ID"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "cost_ceiling_config",
    desc: "コスト上限設定。最大時給・予算上限を管理。",
    cols: [
      ["id", "UUID", "PK", "設定ID"],
      ["max_hourly_rate", "INT", "DEFAULT 3000", "最大時給（円/時）"],
      ["threshold_ratio", "NUMERIC", "DEFAULT 0.8", "アラート閾値（80%）"],
      ["default_monthly_budget", "INT", "DEFAULT 100000", "デフォルト月間予算"],
      ["is_active", "BOOLEAN", "DEFAULT true", "有効フラグ"],
      ["created_by", "UUID", "", "作成者ID"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "rate_change_logs",
    desc: "設定変更の監査ログ。全変更履歴を記録。",
    cols: [
      ["id", "UUID", "PK", "ログID"],
      ["changed_by", "UUID", "", "変更者ID"],
      ["change_type", "TEXT", "NOT NULL", "rate_update|rate_create|rate_delete|blank_rule_update|simulation|cost_ceiling_update|config_rollback|store_budget_update"],
      ["table_name", "TEXT", "", "対象テーブル名"],
      ["record_id", "UUID", "", "対象レコードID"],
      ["old_values", "JSONB", "", "変更前の値"],
      ["new_values", "JSONB", "", "変更後の値"],
      ["reason", "TEXT", "", "変更理由"],
      ["affected_trainers_count", "INT", "", "影響トレーナー数"],
      ["estimated_cost_impact", "INT", "", "推定コスト影響"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "config_snapshots",
    desc: "設定のスナップショット。ロールバック用。",
    cols: [
      ["id", "UUID", "PK", "スナップショットID"],
      ["snapshot_type", "TEXT", "NOT NULL", "rate_config|blank_rule_config|cost_ceiling"],
      ["snapshot_data", "JSONB", "NOT NULL", "スナップショットデータ"],
      ["description", "TEXT", "", "説明"],
      ["created_by", "UUID", "", "作成者ID"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "resignation_requests",
    desc: "退職申請。ワークフロー（draft→submitted→received→completed）を管理。",
    cols: [
      ["id", "UUID", "PK", "申請ID"],
      ["user_id", "UUID", "FK→auth.users", "申請者ユーザーID"],
      ["employee_number", "TEXT", "", "社員番号"],
      ["employment_start_date", "DATE", "", "入社日"],
      ["employment_end_date", "DATE", "", "退職予定日"],
      ["resignation_date", "DATE", "", "退職希望日"],
      ["resignation_reason", "TEXT", "", "career_change|family|health|independence|relocation|other"],
      ["resignation_detail", "TEXT", "", "詳細理由"],
      ["spot_interest", "BOOLEAN", "DEFAULT false", "SPOT登録意向"],
      ["status", "TEXT", "DEFAULT 'draft'", "draft|submitted|received|accepted|completed|cancelled"],
      ["received_by", "UUID", "", "受理者ID"],
      ["received_at", "TIMESTAMPTZ", "", "受理日時"],
      ["completed_by", "UUID", "", "完了処理者ID"],
      ["completed_at", "TIMESTAMPTZ", "", "完了日時"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "shift_availabilities",
    desc: "トレーナーの稼働可能日申告。",
    cols: [
      ["id", "UUID", "PK", "稼働可能日ID"],
      ["trainer_id", "UUID", "FK→alumni_trainers", "トレーナーID"],
      ["available_date", "DATE", "NOT NULL", "稼働可能日"],
      ["start_time", "TIME", "", "開始可能時間"],
      ["end_time", "TIME", "", "終了可能時間"],
      ["preferred_area", "TEXT", "", "希望エリア"],
      ["notes", "TEXT", "", "備考"],
      ["status", "TEXT", "DEFAULT 'open'", "open|offered|matched|expired|cancelled"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "shift_offers",
    desc: "ダイレクトオファー（店舗→トレーナー / HR→トレーナー）。",
    cols: [
      ["id", "UUID", "PK", "オファーID"],
      ["availability_id", "UUID", "FK→shift_availabilities (nullable)", "稼働可能日ID（店舗オファー時）"],
      ["trainer_id", "UUID", "FK→alumni_trainers", "トレーナーID"],
      ["store_id", "UUID", "FK→stores", "店舗ID"],
      ["created_by", "UUID", "FK→store_managers (nullable)", "作成者（店舗）"],
      ["created_by_hr_id", "UUID", "FK→store_managers (nullable)", "作成者（HR）"],
      ["shift_date", "DATE", "NOT NULL", "シフト日"],
      ["start_time", "TIME", "", "開始時間"],
      ["end_time", "TIME", "", "終了時間"],
      ["title", "TEXT", "", "タイトル"],
      ["description", "TEXT", "", "説明"],
      ["offered_rate", "INT", "", "提示時給"],
      ["rate_breakdown", "JSONB", "", "時給内訳"],
      ["status", "TEXT", "DEFAULT 'pending'", "pending|accepted|declined|expired|cancelled"],
      ["responded_at", "TIMESTAMPTZ", "", "応答日時"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "notification_preferences",
    desc: "トレーナー別の通知設定。trainer_idでUNIQUE。",
    cols: [
      ["id", "UUID", "PK", "設定ID"],
      ["trainer_id", "UUID", "UNIQUE, FK→alumni_trainers", "トレーナーID"],
      ["email_new_shift", "BOOLEAN", "DEFAULT true", "新シフトメール通知"],
      ["email_application_update", "BOOLEAN", "DEFAULT true", "応募更新メール通知"],
      ["email_blank_alert", "BOOLEAN", "DEFAULT true", "ブランクアラートメール通知"],
      ["push_enabled", "BOOLEAN", "DEFAULT true", "プッシュ通知有効"],
      ["preferred_notification_time", "TIME", "", "希望通知時間"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
      ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "notification_logs",
    desc: "通知送信ログ。全チャネル（email/push/LINE）統合。",
    cols: [
      ["id", "UUID", "PK", "通知ID"],
      ["user_id", "UUID", "", "宛先ユーザーID"],
      ["type", "TEXT", "", "email|push|line"],
      ["category", "TEXT", "", "通知カテゴリ（shift_published等）"],
      ["title", "TEXT", "", "通知タイトル"],
      ["message", "TEXT", "", "通知本文"],
      ["metadata", "JSONB", "", "追加メタデータ"],
      ["delivered", "BOOLEAN", "DEFAULT false", "配信済みフラグ"],
      ["responded", "BOOLEAN", "DEFAULT false", "応答済みフラグ"],
      ["read_at", "TIMESTAMPTZ", "", "既読日時"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "line_link_tokens",
    desc: "LINE連携用ワンタイムトークン。30分有効。",
    cols: [
      ["id", "UUID", "PK", "トークンID"],
      ["trainer_id", "UUID", "FK→alumni_trainers", "トレーナーID"],
      ["token", "TEXT", "UNIQUE, NOT NULL", "トークン文字列"],
      ["expires_at", "TIMESTAMPTZ", "NOT NULL", "有効期限（30分）"],
      ["used_at", "TIMESTAMPTZ", "", "使用日時"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
  {
    name: "line_notifications",
    desc: "LINE Push通知の送信記録。",
    cols: [
      ["id", "UUID", "PK", "通知ID"],
      ["trainer_id", "UUID", "FK→alumni_trainers", "トレーナーID"],
      ["line_user_id", "TEXT", "NOT NULL", "LINE ユーザーID"],
      ["message_type", "TEXT", "", "メッセージ種類"],
      ["message_data", "JSONB", "", "メッセージデータ"],
      ["sent_at", "TIMESTAMPTZ", "DEFAULT now()", "送信日時"],
      ["delivered", "BOOLEAN", "DEFAULT false", "配信成功フラグ"],
      ["error", "TEXT", "", "エラー内容"],
      ["created_at", "TIMESTAMPTZ", "DEFAULT now()", ""],
    ]
  },
];

// ── Build table section ──
function buildTableSection(t) {
  const children = [];
  children.push(heading2(t.name));
  children.push(para(t.desc));
  children.push(new Paragraph({ spacing: { after: 80 } }));
  children.push(makeTable(
    ["カラム名", "型", "制約", "説明"],
    t.cols,
    [2000, 1800, 2500, 2726]
  ));
  children.push(new Paragraph({ spacing: { after: 200 } }));
  return children;
}

async function main() {
  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Yu Gothic", size: 20 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 32, bold: true, font: "Yu Gothic", color: BLUE },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 26, bold: true, font: "Yu Gothic", color: BLUE },
          paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 22, bold: true, font: "Yu Gothic", color: ACCENT },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
      ]
    },
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      }]
    },
    sections: [
      // ── Cover ──
      {
        properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } },
        children: [
          new Paragraph({ spacing: { before: 4000 } }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Dr.Stretch SPOT", size: 56, bold: true, font: "Montserrat", color: BLUE })
          ]}),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
            new TextRun({ text: "退職トレーナー副業マッチングプラットフォーム", size: 28, font: "Yu Gothic", color: "555555" })
          ]}),
          new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "システム設計書", size: 48, bold: true, font: "Yu Gothic", color: BLUE })
          ]}),
          new Paragraph({ spacing: { before: 800 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "System Design Document", size: 24, font: "Montserrat", color: "888888" })
          ]}),
          new Paragraph({ spacing: { before: 2000 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "文書バージョン: 1.0  |  作成日: 2026年3月12日", size: 20, font: "Yu Gothic" })
          ]}),
          new Paragraph({ children: [new PageBreak()] }),
        ]
      },
      // ── Main ──
      {
        properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } } },
        headers: {
          default: new Header({ children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } }, children: [
            new TextRun({ text: "Dr.Stretch SPOT  |  システム設計書  v1.0", size: 16, font: "Yu Gothic", color: "999999" })
          ]})] })
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Page ", size: 16, font: "Yu Gothic", color: "999999" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Yu Gothic", color: "999999" }),
          ]})] })
        },
        children: [
          heading1("目次"),
          new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 1. Architecture ──
          heading1("1. システムアーキテクチャ"),
          heading2("1.1 技術スタック"),
          makeTable(
            ["レイヤー", "技術", "バージョン/詳細"],
            [
              ["フロントエンド", "Next.js (App Router)", "v16"],
              ["UIライブラリ", "shadcn/ui + Tailwind CSS", "Radix UI ベース"],
              ["バックエンド", "Next.js Server Actions", "サーバーサイド関数"],
              ["データベース", "PostgreSQL (Supabase)", "RLS + pg_cron"],
              ["認証", "Supabase Auth", "OTP / Magic Link"],
              ["ホスティング", "Vercel", "サーバーレス"],
              ["外部連携", "LINE Messaging API", "Push / Flex Message"],
              ["言語", "TypeScript", "型安全"],
            ],
            [2500, 3000, 3526]
          ),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("1.2 ディレクトリ構成"),
          para("src/"),
          bullet("app/ ---- App Router ページ（5ルートグループ）"),
          bullet("  (auth)/ ---- 認証画面（login, register, magic）"),
          bullet("  (trainer)/ ---- トレーナー画面（15画面）"),
          bullet("  (store)/ ---- 店舗管理画面（9画面）"),
          bullet("  (hr)/ ---- HR管理画面（12画面）"),
          bullet("  (admin)/ ---- 管理者画面（5画面）"),
          bullet("actions/ ---- Server Actions（17ファイル）"),
          bullet("types/ ---- TypeScript型定義"),
          bullet("components/ ---- 共通UIコンポーネント"),
          bullet("lib/ ---- ユーティリティ（Supabaseクライアント等）"),
          para("supabase/"),
          bullet("migrations/ ---- マイグレーションSQL（001-011）"),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("1.3 認証フロー"),
          para("Supabase Auth を使用した OTP ベース認証。マジックリンクも対応。"),
          bullet("1. ユーザーがメールアドレスを入力"),
          bullet("2. Supabase が OTP コードをメール送信"),
          bullet("3. ユーザーが OTP コードを入力して認証"),
          bullet("4. セッション確立後、profiles テーブルの role でリダイレクト先を決定"),
          bullet("5. middleware.ts が全リクエストで認証状態とロールをチェック"),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 2. DB Schema ──
          heading1("2. データベース設計"),
          para("全23テーブル。Supabase PostgreSQL + Row Level Security (RLS) で構成。"),
          new Paragraph({ spacing: { after: 100 } }),

          heading2("2.1 ER概要"),
          para("中心テーブル: alumni_trainers, stores, shift_requests, shift_applications"),
          para("補助テーブル: attendance_records, evaluations, qr_tokens, notification_logs"),
          para("設定テーブル: hourly_rate_config, blank_rule_config, cost_ceiling_config"),
          para("ワークフロー: resignation_requests, shift_offers, shift_availabilities"),
          para("監査: rate_change_logs, config_snapshots"),
          para("LINE連携: line_link_tokens, line_notifications"),
          new Paragraph({ children: [new PageBreak()] }),

          heading2("2.2 テーブル定義"),
          ...tables.flatMap(t => buildTableSection(t)),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 3. Server Actions ──
          heading1("3. Server Actions 設計"),
          para("全17ファイル、約80関数。Next.js Server Actions として実装。"),
          new Paragraph({ spacing: { after: 100 } }),

          heading2("3.1 pricing.ts（時給計算エンジン）"),
          para("システムのコア。全時給計算のシングルソース。"),
          heading3("calculateRate(params)"),
          para("時給計算の中心関数。以下の要素を加味して最終時給を決定:"),
          bullet("基本時給: tenure_years に基づく hourly_rate_config テーブル参照"),
          bullet("出勤ボーナス: 直近30日の出勤回数 >= threshold → +200円"),
          bullet("緊急ボーナス: shift_requests.emergency_bonus_amount"),
          bullet("コスト上限: cost_ceiling_config.max_hourly_rate（または店舗別上限）"),
          para("計算式: min(基本時給 + 出勤ボーナス + 緊急ボーナス, コスト上限)"),
          new Paragraph({ spacing: { after: 200 } }),

          heading3("デフォルト時給テーブル"),
          makeTable(
            ["在籍年数", "基本時給", "出勤ボーナス閾値", "出勤ボーナス額"],
            [
              ["2-3年", "1,400円", "5回/30日", "+200円"],
              ["3-5年", "1,600円", "5回/30日", "+200円"],
              ["5-7年", "1,800円", "5回/30日", "+200円"],
              ["7年以上", "2,000円", "5回/30日", "+200円"],
            ],
            [2000, 2500, 2500, 2026]
          ),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("3.2 applications.ts（応募管理）"),
          heading3("applyToShift(shiftRequestId)"),
          para("トレーナーがシフトに応募する中心フロー:"),
          bullet("1. blank_status チェック（skill_check_required以上は応募不可）"),
          bullet("2. calculateHourlyRate() で時給計算 + rate_breakdown JSONB 作成"),
          bullet("3. shift_applications に INSERT"),
          bullet("4. store.auto_confirm = true の場合: 即 approved + try_increment_filled_count (atomic)"),
          bullet("5. auto_confirm 成功時: attendance_records も自動作成"),
          bullet("6. 通知送信（push + LINE）"),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("3.3 attendance.ts（勤怠管理）"),
          heading3("clockIn / clockOut"),
          para("QR トークン経由の打刻処理:"),
          bullet("clockIn: 出勤時刻 + GPS座標を記録。ジオフェンス検証。"),
          bullet("clockOut: 退勤時刻記録 + actual_work_minutes 自動計算。last_shift_date 更新 + blank_status=ok。"),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("3.4 qr.ts（QRトークン管理）"),
          para("15分有効の使い捨てQRトークンの生成・検証:"),
          bullet("generateQrToken: 既存の未使用同タイプトークンを無効化し、新トークン生成"),
          bullet("verifyQrToken: トークン検証 → clockIn/clockOut実行 → token.used_at記録"),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("3.5 resignation.ts（退職ワークフロー）"),
          para("退職→SPOT登録の一連のフロー:"),
          bullet("1. submitResignation: 従業員が退職申請（draft→submitted）"),
          bullet("2. receiveResignation: HRが受理（submitted→received）"),
          bullet("3. completeResignation: HR完了処理"),
          bullet("   → alumni_trainers に INSERT（spot_status=registered）"),
          bullet("   → tenure_years 自動計算（employment_start_date〜end_date）"),
          bullet("   → profiles.role を employee→trainer に変更"),
          bullet("4. activateSpot: トレーナーがSPOT開始（spot_status=active）"),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("3.6 offers.ts + hr-offers.ts（オファー管理）"),
          para("2つのオファーフロー:"),
          heading3("店舗ダイレクトオファー（offers.ts）"),
          bullet("店舗管理者がトレーナーの稼働可能日に基づきオファー送信"),
          bullet("トレーナー承諾 → shift_request(source=direct_offer) + shift_application + attendance_record 自動作成"),
          heading3("HRオファー（hr-offers.ts）"),
          bullet("HRがトレーナーを検索してオファー送信（稼働可能日不要）"),
          bullet("トレーナー承諾 → shift_request(source=hr_offer) + shift_application + attendance_record 自動作成"),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("3.7 config.ts + rates.ts（設定管理）"),
          para("設定変更の安全管理:"),
          bullet("全変更に理由入力必須 → rate_change_logs に記録"),
          bullet("変更前に自動スナップショット作成"),
          bullet("rollbackToSnapshot でいつでも復元可能"),
          bullet("simulateRateChange で変更前にコスト影響を試算"),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 4. RLS ──
          heading1("4. Row Level Security (RLS) ポリシー"),
          para("Supabase RLS で全テーブルにアクセス制御を実装。"),
          new Paragraph({ spacing: { after: 100 } }),

          heading2("4.1 ヘルパー関数"),
          makeTable(
            ["関数名", "引数", "戻り値", "用途"],
            [
              ["get_user_role(user_id)", "UUID", "TEXT", "profiles.role を返す"],
              ["is_hr_or_admin(user_id)", "UUID", "BOOLEAN", "role が hr|admin か判定"],
              ["get_trainer_id(user_id)", "UUID", "UUID", "alumni_trainers.id を返す"],
              ["get_manager_store_id(user_id)", "UUID", "UUID", "store_managers.store_id を返す"],
            ],
            [2800, 1200, 1500, 3526]
          ),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("4.2 主要ポリシー概要"),
          makeTable(
            ["テーブル", "操作", "ロール", "条件"],
            [
              ["alumni_trainers", "SELECT", "trainer", "auth_user_id = auth.uid()"],
              ["alumni_trainers", "UPDATE", "trainer", "auth_user_id = auth.uid()（自分のみ）"],
              ["alumni_trainers", "SELECT/UPDATE", "hr/admin", "全レコード"],
              ["shift_requests", "SELECT", "trainer", "status = 'open' のみ"],
              ["shift_requests", "INSERT", "store_manager", "自店舗のみ"],
              ["shift_requests", "UPDATE", "hr/admin", "承認/拒否"],
              ["shift_applications", "INSERT", "trainer", "自分のtrainer_idのみ"],
              ["shift_applications", "UPDATE", "store_manager", "自店舗シフトの応募のみ"],
              ["attendance_records", "UPDATE", "trainer", "clock_in/out（自分のみ）"],
              ["attendance_records", "UPDATE", "store_manager", "verify（自店舗のみ）"],
              ["hourly_rate_config", "SELECT", "all", "is_active = true"],
              ["hourly_rate_config", "INSERT/UPDATE/DELETE", "hr/admin", "設定変更権限"],
            ],
            [2200, 1200, 2000, 3626]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 5. Batch Jobs ──
          heading1("5. バッチジョブ（pg_cron）"),
          makeTable(
            ["スケジュール", "処理内容", "対象テーブル", "詳細"],
            [
              ["毎日 02:00 JST", "ブランクステータス更新", "alumni_trainers", "last_shift_date からの経過日数で blank_status を更新"],
              ["毎日 03:00 JST", "ランク更新", "alumni_trainers", "completed_shifts数 + avg_rating でランク判定"],
              ["毎月1日 00:00 JST", "緊急予算リセット", "stores", "emergency_budget_used を 0 にリセット"],
            ],
            [2000, 2200, 2200, 2626]
          ),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("5.1 ランク判定基準"),
          makeTable(
            ["ランク", "必要シフト数", "必要平均評価", "バッジ色"],
            [
              ["Bronze", "0（デフォルト）", "---", "銅"],
              ["Silver", "10回以上", "3.5以上", "銀"],
              ["Gold", "30回以上", "4.0以上", "金"],
              ["Platinum", "50回以上", "4.5以上", "プラチナ"],
            ],
            [2000, 2500, 2500, 2026]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 6. Cron API ──
          heading1("6. API エンドポイント"),
          heading2("6.1 Cron エンドポイント"),
          makeTable(
            ["パス", "メソッド", "スケジュール", "処理内容"],
            [
              ["/api/cron/reminders", "GET", "毎日 22:00 UTC", "翌日シフトのリマインダー送信"],
            ],
            [2500, 1200, 2000, 3326]
          ),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("6.2 LINE Webhook（将来実装）"),
          para("LINE Messaging API の Webhook エンドポイント。現在は LINE Push のみ実装済み。"),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 7. RPC Functions ──
          heading1("7. RPC関数（PostgreSQL）"),
          makeTable(
            ["関数名", "引数", "戻り値", "用途"],
            [
              ["try_increment_filled_count", "shift_id UUID", "BOOLEAN", "アトミックにfilled_countをインクリメント。定員超過を防止。成功時true。"],
              ["increment_filled_count", "shift_id UUID", "void", "filled_count++。定員到達時に自動close。"],
              ["get_user_role", "user_id UUID", "TEXT", "profiles.role を返す"],
              ["is_hr_or_admin", "user_id UUID", "BOOLEAN", "HR/Admin権限チェック"],
              ["get_trainer_id", "user_id UUID", "UUID", "auth.uid → trainer.id 変換"],
              ["get_manager_store_id", "user_id UUID", "UUID", "auth.uid → store_id 変換"],
            ],
            [2800, 1800, 1500, 2926]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 8. Triggers ──
          heading1("8. トリガー"),
          makeTable(
            ["トリガー名", "テーブル", "タイミング", "処理"],
            [
              ["update_updated_at_column", "全テーブル", "BEFORE UPDATE", "updated_at を now() に自動更新"],
              ["auto_close_filled_shift", "shift_applications", "AFTER UPDATE (approved)", "filled_count >= required_count 時に shift_request を closed に変更"],
            ],
            [2800, 2000, 2000, 2226]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 9. External ──
          heading1("9. 外部連携"),
          heading2("9.1 LINE Messaging API"),
          para("トレーナーへの Push 通知に使用。Flex Message 対応。"),
          bullet("連携フロー: generateLinkToken → トレーナーがLINEで認証 → verifyAndLinkAccount"),
          bullet("Push対象: シフト確定通知、オファー通知"),
          bullet("Flex Message: シフト詳細カード形式で送信"),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("9.2 Geolocation API"),
          para("打刻時の位置検証に使用。ブラウザの Geolocation API で座標取得。"),
          bullet("打刻時に緯度・経度を取得"),
          bullet("店舗の geofence_radius_meters 内かどうかを検証"),
          bullet("is_location_verified フラグで結果を記録"),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 10. Env ──
          heading1("10. 環境変数"),
          makeTable(
            ["変数名", "用途", "設定場所"],
            [
              ["NEXT_PUBLIC_SUPABASE_URL", "Supabase プロジェクトURL", "Vercel / .env.local"],
              ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase 匿名キー", "Vercel / .env.local"],
              ["SUPABASE_SERVICE_ROLE_KEY", "Supabase サービスロールキー（サーバーサイドのみ）", "Vercel"],
              ["LINE_CHANNEL_ACCESS_TOKEN", "LINE Messaging API トークン", "Vercel"],
              ["LINE_CHANNEL_SECRET", "LINE チャネルシークレット", "Vercel"],
              ["CRON_SECRET", "Cron エンドポイント認証シークレット", "Vercel"],
            ],
            [3500, 3000, 2526]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 11.未実装 ──
          heading1("11. 未接続・未実装機能"),
          makeTable(
            ["機能", "状態", "備考"],
            [
              ["Resend メール送信", "未接続", "通知ログは作成されるがメール実送信なし"],
              ["プッシュ通知", "未接続", "Service Worker / FCM 未実装"],
              ["決済", "未実装", "将来的にStripe等を想定"],
              ["LINE Webhook受信", "未実装", "Push送信のみ実装済み"],
              ["メール通知テンプレート", "未実装", "notification_preferences は定義済み"],
              ["ファイルアップロード", "未実装", "Supabase Storage 未使用"],
            ],
            [3000, 1500, 4526]
          ),
          new Paragraph({ spacing: { after: 200 } }),

          // ── 12. Security ──
          heading1("12. セキュリティ設計"),
          bullet("認証: Supabase Auth（OTP / Magic Link）。セッショントークンはHTTPOnly Cookie。"),
          bullet("認可: RLS ポリシーでテーブルレベルアクセス制御。middleware.ts でルートレベル制御。"),
          bullet("CSRF: Next.js Server Actions の CSRF トークン自動保護。"),
          bullet("XSS: React のデフォルトエスケープ + Content Security Policy。"),
          bullet("QR トークン: 15分有効 + ワンタイム。タイミング攻撃対策でアトミック操作使用。"),
          bullet("銀行情報: RLS で本人のみアクセス可。HR/Admin は閲覧不可。"),
          bullet("LINE連携: 30分有効のワンタイムトークン。HTTPS経由。"),
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("C:\\Users\\m-kur\\dr-stretch-spot\\docs\\設計書_DrStretch_SPOT.docx", buffer);
  console.log("Generated: 設計書_DrStretch_SPOT.docx");
}

main().catch(console.error);
