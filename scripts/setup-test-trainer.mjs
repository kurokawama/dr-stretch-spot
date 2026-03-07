#!/usr/bin/env node
/**
 * Dr.Stretch SPOT — Test Trainer Setup Script
 * Creates a test trainer with password auth (no OTP/Resend needed)
 *
 * Usage: node scripts/setup-test-trainer.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
  const content = readFileSync(envPath, "utf8");
  const vars = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) vars[match[1].trim()] = match[2].trim();
  }
  return vars;
}

const env = loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TEST_TRAINER = {
  email: "trainer@test.com",
  password: "test1234",
  profile: {
    role: "trainer",
    display_name: "テストトレーナー",
  },
  alumni: {
    full_name: "テストトレーナー",
    full_name_kana: "テストトレーナー",
    phone: "090-0000-0000",
    tenure_years: 3.0,
    employment_start_date: "2023-01-01",
    preferred_areas: ["関東"],
    preferred_time_slots: ["午前", "午後"],
    bio: "テスト用トレーナーアカウントです。",
    status: "active",
  },
};

async function main() {
  console.log("🚀 Dr.Stretch SPOT テストトレーナーセットアップ開始...\n");

  // 1. Create auth user
  console.log("1️⃣  テストトレーナー Auth ユーザー作成...");
  let authUserId;
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_TRAINER.email,
    password: TEST_TRAINER.password,
    email_confirm: true,
  });
  if (error) {
    if (error.message?.includes("already")) {
      console.log("  ⏭️  Auth user already exists");
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existing = users?.find(u => u.email === TEST_TRAINER.email);
      authUserId = existing?.id;
    } else {
      console.error("  ❌", error.message);
      process.exit(1);
    }
  } else {
    authUserId = data.user.id;
    console.log(`  ✅ Auth user created: ${authUserId}`);
  }

  if (!authUserId) {
    console.error("  ❌ Could not get auth user ID");
    process.exit(1);
  }

  // 2. Create profile
  console.log("\n2️⃣  プロフィール作成...");
  const { error: profileErr } = await supabase.from("profiles").upsert({
    id: authUserId,
    ...TEST_TRAINER.profile,
  }, { onConflict: "id" });
  if (profileErr) console.log("  ⚠️  profiles:", profileErr.message);
  else console.log("  ✅ Profile created (role: trainer)");

  // 3. Create alumni_trainers record
  console.log("\n3️⃣  トレーナーデータ作成...");
  const { error: alumniErr } = await supabase.from("alumni_trainers").upsert({
    auth_user_id: authUserId,
    email: TEST_TRAINER.email,
    ...TEST_TRAINER.alumni,
  }, { onConflict: "auth_user_id" });
  if (alumniErr) console.log("  ⚠️  alumni_trainers:", alumniErr.message);
  else console.log("  ✅ Alumni trainer record created");

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("✅ テストトレーナーセットアップ完了！");
  console.log("=".repeat(50));
  console.log("\n📋 テストアカウント:");
  console.log("─".repeat(50));
  console.log("全デモアカウント (パスワード: test1234):");
  console.log("  Store:   store@test.com    → /store");
  console.log("  HR:      hr@test.com       → /hr");
  console.log("  Admin:   admin@test.com    → /admin");
  console.log("  Trainer: trainer@test.com  → /home  ← NEW!");
  console.log("─".repeat(50));
  console.log("\n🔗 テストURL:");
  console.log("  ログイン: https://dr-stretch-spot.vercel.app/login");
  console.log("  デモボタン「Trainer」をクリックで即ログイン");
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
