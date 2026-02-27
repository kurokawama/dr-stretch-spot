/**
 * Demo Seed Data for Dr.stretch SPOT
 * Run via: node scripts/seed-demo.js
 */
const https = require("https");
const TOKEN = "sbp_194efc23d6b1ca23eee71176405e6b27be7e40da";
const REF = "wpliqlgrsfpymypgeqky";

function runSQL(query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const req = https.request(
      {
        hostname: "api.supabase.com",
        path: `/v1/projects/${REF}/database/query`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          if (body.includes('"message"')) {
            console.error("SQL ERROR:", body.substring(0, 200));
            resolve(null);
          } else {
            resolve(JSON.parse(body));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// Known IDs
const STORE_ID = "7ba000b2-24b1-4d7b-bd35-2d00f6716c8e";
const STORE_MGR_RECORD_ID = "c013d367-3f71-4455-9f84-33f72b135d30"; // store_managers.id
const STORE_MGR_AUTH = "4f6d8fc7-dfde-45b2-a628-6dc190c87c87";
const KUROKAWA_AUTH = "8888ab3a-3a05-4d28-a57c-b7a1bf3a22c6";
const KUROKAWA_TRAINER_ID = "67c492d3-d2f4-4772-8a62-51ae37a64cd6";
const ADMIN_AUTH = "ba3a7248-4c1d-4f27-a9c9-fd7bf3bc5cc1";

// Dummy trainer auth IDs (created via Supabase Auth Admin API)
const TANAKA_AUTH = "c3ec1bec-774b-4846-9c0c-185c5e18deb1";
const SUZUKI_AUTH = "a29a8942-ce8c-4e0a-820c-d96dbe5462bb";
const YAMAMOTO_AUTH = "6f59a9a2-e9c5-4642-a0a1-a462983fea00";

// Deterministic UUIDs
const TRAINER_2 = "aaaa0001-0001-0001-0001-000000000001";
const TRAINER_3 = "aaaa0001-0001-0001-0001-000000000002";
const TRAINER_4 = "aaaa0001-0001-0001-0001-000000000003";

const SHIFT = (n) => `bbbb0001-0001-0001-0001-00000000000${n}`;
const APP = (n) => `cccc0001-0001-0001-0001-00000000000${n}`;

// Date helpers
const today = new Date();
const fmt = (d) => d.toISOString().split("T")[0];
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const ts = (dateStr, time) => `${dateStr}T${time}:00Z`;

const D = {
  today: fmt(today),
  y1: fmt(addDays(today, -1)),
  y2: fmt(addDays(today, -2)),
  y5: fmt(addDays(today, -5)),
  y10: fmt(addDays(today, -10)),
  y15: fmt(addDays(today, -15)),
  y20: fmt(addDays(today, -20)),
  y35: fmt(addDays(today, -35)),
  f1: fmt(addDays(today, 1)),
  f3: fmt(addDays(today, 3)),
  f5: fmt(addDays(today, 5)),
  f7: fmt(addDays(today, 7)),
};

async function main() {
  console.log("=== Dr.stretch SPOT Demo Seed ===\n");

  // Step 0: Rate config 0-2yr
  console.log("0: Rate config 0-2yr...");
  await runSQL(`INSERT INTO hourly_rate_config (tenure_min_years, tenure_max_years, base_rate, attendance_bonus_threshold, attendance_bonus_amount, effective_from, is_active) VALUES (0, 2.0, 1200, 5, 100, '2026-01-01', true) ON CONFLICT DO NOTHING`);

  // Step 1: Dummy trainers (with real auth_user_ids)
  console.log("1: Trainers...");
  await runSQL(`
    INSERT INTO alumni_trainers (id, auth_user_id, email, full_name, full_name_kana, phone, tenure_years, employment_start_date, employment_end_date, preferred_areas, status, spot_status, blank_status, rank, badges, last_shift_date, bio)
    VALUES
    ('${TRAINER_2}', '${TANAKA_AUTH}', 'tanaka@test.com', 'Tanaka Yuki', 'タナカ ユキ', '09011111111', 3.0, '2023-01-01', '2026-12-31', ARRAY['Kansai'], 'active', 'active', 'ok', 'silver', ARRAY['first_shift','five_shifts'], '${D.y5}', 'Stretch specialist'),
    ('${TRAINER_3}', '${SUZUKI_AUTH}', 'suzuki@test.com', 'Suzuki Ren', 'スズキ レン', '09022222222', 5.5, '2020-06-01', '2026-12-31', ARRAY['Kansai'], 'active', 'active', 'ok', 'gold', ARRAY['first_shift','five_shifts','ten_shifts','high_rating'], '${D.y2}', 'Senior trainer'),
    ('${TRAINER_4}', '${YAMAMOTO_AUTH}', 'yamamoto@test.com', 'Yamamoto Hina', 'ヤマモト ヒナ', '09033333333', 1.5, '2024-09-01', '2026-12-31', ARRAY['Kansai'], 'active', 'active', 'alert_60', 'bronze', ARRAY['first_shift'], '${D.y20}', 'Newcomer')
    ON CONFLICT (id) DO NOTHING
  `);

  // Step 2: Update Kurokawa
  console.log("2: Kurokawa stats...");
  await runSQL(`UPDATE alumni_trainers SET rank='silver', badges=ARRAY['first_shift','five_shifts','no_cancel'], last_shift_date='${D.y1}', preferred_areas=ARRAY['Kansai'] WHERE id='${KUROKAWA_TRAINER_ID}'`);

  // Step 3: Shifts (created_by = store_managers.id)
  console.log("3: Shifts...");
  await runSQL(`
    INSERT INTO shift_requests (id, store_id, created_by, title, description, shift_date, start_time, end_time, break_minutes, required_count, filled_count, is_emergency, emergency_bonus_amount, status, published_at, target_areas) VALUES
    ('${SHIFT(1)}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 'Morning stretch class', 'Regular morning session', '${D.y15}', '09:00', '13:00', 30, 2, 2, false, 0, 'completed', '${ts(D.y20,"09:00")}', ARRAY['Kansai']),
    ('${SHIFT(2)}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 'Afternoon full-body', 'Afternoon coverage needed', '${D.y10}', '13:00', '17:00', 30, 1, 1, false, 0, 'completed', '${ts(D.y15,"09:00")}', ARRAY['Kansai']),
    ('${SHIFT(3)}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 'Weekend special event', 'Special event coverage', '${D.y5}', '10:00', '18:00', 60, 3, 2, false, 0, 'completed', '${ts(D.y10,"09:00")}', ARRAY['Kansai']),
    ('${SHIFT(4)}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 'Today AM shift', 'Morning coverage', '${D.today}', '09:00', '13:00', 30, 2, 1, false, 0, 'open', '${ts(D.y2,"09:00")}', ARRAY['Kansai']),
    ('${SHIFT(5)}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 'URGENT: Evening cover', 'Urgent replacement!', '${D.today}', '17:00', '21:00', 0, 1, 0, true, 500, 'open', '${ts(D.y1,"09:00")}', ARRAY['Kansai']),
    ('${SHIFT(6)}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 'Tomorrow morning', 'Regular shift', '${D.f1}', '09:00', '14:00', 30, 2, 0, false, 0, 'open', '${ts(D.today,"08:00")}', ARRAY['Kansai']),
    ('${SHIFT(7)}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 'Midweek coverage', '3-day advance', '${D.f3}', '10:00', '16:00', 30, 2, 0, false, 0, 'open', '${ts(D.today,"08:00")}', ARRAY['Kansai']),
    ('${SHIFT(8)}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 'Weekend shift', 'Weekend help', '${D.f5}', '09:00', '17:00', 60, 3, 0, false, 0, 'open', '${ts(D.today,"08:00")}', ARRAY['Kansai']),
    ('${SHIFT(9)}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 'Next week PM', 'Afternoon session', '${D.f7}', '13:00', '18:00', 30, 1, 0, false, 0, 'open', '${ts(D.today,"08:00")}', ARRAY['Kansai'])
    ON CONFLICT (id) DO NOTHING
  `);

  // Step 4: Applications
  console.log("4: Applications...");
  await runSQL(`
    INSERT INTO shift_applications (id, shift_request_id, trainer_id, confirmed_rate, rate_breakdown, status, applied_at, reviewed_at, reviewed_by) VALUES
    ('${APP(1)}', '${SHIFT(1)}', '${KUROKAWA_TRAINER_ID}', 1400, '{"base_rate":1400,"attendance_bonus":0,"emergency_bonus":0}', 'completed', '${ts(D.y20,"10:00")}', '${ts(D.y20,"12:00")}', '${STORE_MGR_RECORD_ID}'),
    ('${APP(2)}', '${SHIFT(1)}', '${TRAINER_2}', 1600, '{"base_rate":1600,"attendance_bonus":0,"emergency_bonus":0}', 'completed', '${ts(D.y20,"11:00")}', '${ts(D.y20,"12:00")}', '${STORE_MGR_RECORD_ID}'),
    ('${APP(3)}', '${SHIFT(2)}', '${KUROKAWA_TRAINER_ID}', 1400, '{"base_rate":1400,"attendance_bonus":0,"emergency_bonus":0}', 'completed', '${ts(D.y15,"10:00")}', '${ts(D.y15,"12:00")}', '${STORE_MGR_RECORD_ID}'),
    ('${APP(4)}', '${SHIFT(3)}', '${KUROKAWA_TRAINER_ID}', 1400, '{"base_rate":1400,"attendance_bonus":0,"emergency_bonus":0}', 'completed', '${ts(D.y10,"10:00")}', '${ts(D.y10,"12:00")}', '${STORE_MGR_RECORD_ID}'),
    ('${APP(5)}', '${SHIFT(3)}', '${TRAINER_3}', 1800, '{"base_rate":1800,"attendance_bonus":0,"emergency_bonus":0}', 'completed', '${ts(D.y10,"11:00")}', '${ts(D.y10,"12:00")}', '${STORE_MGR_RECORD_ID}'),
    ('${APP(6)}', '${SHIFT(4)}', '${TRAINER_2}', 1600, '{"base_rate":1600,"attendance_bonus":0,"emergency_bonus":0}', 'approved', '${ts(D.y2,"10:00")}', '${ts(D.y2,"14:00")}', '${STORE_MGR_RECORD_ID}'),
    ('${APP(7)}', '${SHIFT(6)}', '${TRAINER_4}', 1200, '{"base_rate":1200,"attendance_bonus":0,"emergency_bonus":0}', 'pending', '${ts(D.today,"09:00")}', NULL, NULL),
    ('${APP(8)}', '${SHIFT(6)}', '${TRAINER_3}', 1800, '{"base_rate":1800,"attendance_bonus":0,"emergency_bonus":0}', 'pending', '${ts(D.today,"09:30")}', NULL, NULL),
    ('${APP(9)}', '${SHIFT(3)}', '${TRAINER_4}', 1200, '{"base_rate":1200,"attendance_bonus":0,"emergency_bonus":0}', 'rejected', '${ts(D.y10,"12:00")}', '${ts(D.y10,"14:00")}', '${STORE_MGR_RECORD_ID}')
    ON CONFLICT (id) DO NOTHING
  `);

  // Step 5: Attendance
  console.log("5: Attendance...");
  await runSQL(`
    INSERT INTO attendance_records (application_id, trainer_id, store_id, shift_date, scheduled_start, scheduled_end, clock_in_at, clock_out_at, actual_work_minutes, status) VALUES
    ('${APP(1)}', '${KUROKAWA_TRAINER_ID}', '${STORE_ID}', '${D.y15}', '09:00', '13:00', '${ts(D.y15,"00:00")}', '${ts(D.y15,"03:55")}', 225, 'verified'),
    ('${APP(2)}', '${TRAINER_2}', '${STORE_ID}', '${D.y15}', '09:00', '13:00', '${ts(D.y15,"00:02")}', '${ts(D.y15,"03:50")}', 218, 'verified'),
    ('${APP(3)}', '${KUROKAWA_TRAINER_ID}', '${STORE_ID}', '${D.y10}', '13:00', '17:00', '${ts(D.y10,"04:00")}', '${ts(D.y10,"07:55")}', 225, 'verified'),
    ('${APP(4)}', '${KUROKAWA_TRAINER_ID}', '${STORE_ID}', '${D.y5}', '10:00', '18:00', '${ts(D.y5,"01:00")}', '${ts(D.y5,"08:55")}', 415, 'verified'),
    ('${APP(5)}', '${TRAINER_3}', '${STORE_ID}', '${D.y5}', '10:00', '18:00', '${ts(D.y5,"01:05")}', '${ts(D.y5,"08:50")}', 405, 'verified')
    ON CONFLICT DO NOTHING
  `);

  // Step 6: Evaluations
  console.log("6: Evaluations...");
  await runSQL(`
    INSERT INTO evaluations (application_id, trainer_id, store_id, evaluator_id, rating, categories, comment) VALUES
    ('${APP(1)}', '${KUROKAWA_TRAINER_ID}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 4, '{"technique":4,"communication":5,"punctuality":4,"attitude":4}', 'Good work overall'),
    ('${APP(3)}', '${KUROKAWA_TRAINER_ID}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 5, '{"technique":5,"communication":5,"punctuality":5,"attitude":5}', 'Excellent performance'),
    ('${APP(4)}', '${KUROKAWA_TRAINER_ID}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 4, '{"technique":4,"communication":4,"punctuality":5,"attitude":4}', 'Reliable and professional'),
    ('${APP(2)}', '${TRAINER_2}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 3, '{"technique":3,"communication":4,"punctuality":3,"attitude":3}', 'Average'),
    ('${APP(5)}', '${TRAINER_3}', '${STORE_ID}', '${STORE_MGR_RECORD_ID}', 5, '{"technique":5,"communication":5,"punctuality":5,"attitude":5}', 'Outstanding')
    ON CONFLICT DO NOTHING
  `);

  // Step 7: Notifications
  console.log("7: Notifications...");
  await runSQL(`
    INSERT INTO notification_logs (user_id, type, category, title, body, shift_request_id, created_at, read_at) VALUES
    ('${KUROKAWA_AUTH}', 'push', 'application_confirmed', 'Approved: Morning stretch', 'Your application was approved', '${SHIFT(1)}', '${ts(D.y20,"13:00")}', '${ts(D.y20,"14:00")}'),
    ('${KUROKAWA_AUTH}', 'push', 'application_confirmed', 'Approved: Afternoon full-body', 'Your application was approved', '${SHIFT(2)}', '${ts(D.y15,"13:00")}', '${ts(D.y15,"15:00")}'),
    ('${KUROKAWA_AUTH}', 'push', 'application_confirmed', 'Approved: Weekend event', 'Your application was approved', '${SHIFT(3)}', '${ts(D.y10,"13:00")}', '${ts(D.y10,"15:00")}'),
    ('${KUROKAWA_AUTH}', 'push', 'shift_published', 'URGENT shift available!', 'Evening cover +500 yen bonus', '${SHIFT(5)}', '${ts(D.y1,"10:00")}', NULL),
    ('${KUROKAWA_AUTH}', 'push', 'shift_published', 'New shifts posted', '3 new shifts this week', NULL, '${ts(D.today,"08:00")}', NULL),
    ('${KUROKAWA_AUTH}', 'push', 'rank_update', 'Rank Up: Silver!', 'Congratulations on reaching Silver', NULL, '${ts(D.y5,"03:00")}', '${ts(D.y5,"08:00")}'),
    ('${STORE_MGR_AUTH}', 'push', 'application_received', 'New: Yamamoto Hina', 'Applied for Tomorrow morning', '${SHIFT(6)}', '${ts(D.today,"09:00")}', NULL),
    ('${STORE_MGR_AUTH}', 'push', 'application_received', 'New: Suzuki Ren', 'Applied for Tomorrow morning', '${SHIFT(6)}', '${ts(D.today,"09:30")}', NULL),
    ('${STORE_MGR_AUTH}', 'push', 'shift_published', 'Shift published', 'Today AM shift is now live', '${SHIFT(4)}', '${ts(D.y2,"09:00")}', '${ts(D.y2,"10:00")}'),
    ('${STORE_MGR_AUTH}', 'push', 'emergency_auto_trigger', 'Emergency triggered', 'Evening cover auto-escalated', '${SHIFT(5)}', '${ts(D.y1,"10:00")}', NULL)
    ON CONFLICT DO NOTHING
  `);

  // Step 8: Templates
  console.log("8: Templates...");
  await runSQL(`
    INSERT INTO shift_templates (store_id, created_by, name, title, description, start_time, end_time, break_minutes, required_count, is_active) VALUES
    ('${STORE_ID}', '${STORE_MGR_RECORD_ID}', 'Morning Regular', 'Morning shift', 'Regular morning', '09:00', '13:00', 30, 2, true),
    ('${STORE_ID}', '${STORE_MGR_RECORD_ID}', 'Afternoon Regular', 'Afternoon shift', 'Regular afternoon', '13:00', '17:00', 30, 1, true),
    ('${STORE_ID}', '${STORE_MGR_RECORD_ID}', 'Full Day Event', 'Full day event', 'Full-day coverage', '10:00', '18:00', 60, 3, true)
    ON CONFLICT DO NOTHING
  `);

  // Step 9: Cost ceiling
  console.log("9: Cost ceiling...");
  await runSQL(`INSERT INTO cost_ceiling_config (max_hourly_rate, active_employee_ratio_threshold, per_store_emergency_budget_default, is_active, created_by) SELECT 3000, 0.85, 50000, true, '${ADMIN_AUTH}' WHERE NOT EXISTS (SELECT 1 FROM cost_ceiling_config WHERE is_active = true LIMIT 1)`);

  // Verify
  console.log("\n=== Verification ===");
  const counts = await runSQL(`SELECT
    (SELECT COUNT(*) FROM alumni_trainers) as trainers,
    (SELECT COUNT(*) FROM shift_requests) as shifts,
    (SELECT COUNT(*) FROM shift_applications) as applications,
    (SELECT COUNT(*) FROM attendance_records) as attendance,
    (SELECT COUNT(*) FROM evaluations) as evaluations,
    (SELECT COUNT(*) FROM notification_logs) as notifications,
    (SELECT COUNT(*) FROM shift_templates) as templates,
    (SELECT COUNT(*) FROM hourly_rate_config) as rate_configs
  `);
  console.log(JSON.stringify(counts, null, 2));
  console.log("\n=== DONE! ===");
}

main().catch(console.error);
