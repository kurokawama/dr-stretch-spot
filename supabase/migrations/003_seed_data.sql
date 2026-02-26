-- =============================================
-- Dr.stretch SPOT - Initial Seed Data
-- =============================================

-- =============================================
-- hourly_rate_config - 時給テーブル初期値
-- =============================================
-- 在籍2年未満: 応募不可（システム上はデータなし）
-- 在籍2年〜3年: ¥1,400
-- 在籍3年〜5年: ¥1,600
-- 在籍5年〜7年: ¥1,800
-- 在籍7年以上:  ¥2,000
-- 出勤ボーナス: 直近30日で5回以上出勤 → +¥200

INSERT INTO hourly_rate_config (tenure_min_years, tenure_max_years, base_rate, attendance_bonus_threshold, attendance_bonus_amount, effective_from) VALUES
  (2.0, 3.0, 1400, 5, 200, '2026-01-01'),
  (3.0, 5.0, 1600, 5, 200, '2026-01-01'),
  (5.0, 7.0, 1800, 5, 200, '2026-01-01'),
  (7.0, NULL, 2000, 5, 200, '2026-01-01');

-- =============================================
-- blank_rule_config - ブランクルール初期値
-- =============================================
INSERT INTO blank_rule_config (rule_type, threshold_days, action_required, description) VALUES
  ('alert_60', 60, 'notification', '60日間シフト未稼働 - 予防アラート通知を送信'),
  ('skill_check_required', 90, 'skill_check', '90日間シフト未稼働 - スキルチェック合格が必要'),
  ('training_required', 120, 'training', '120日間シフト未稼働 - 再研修の受講が必要');
