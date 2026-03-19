"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";

// Roles that can be assigned via admin panel
const ASSIGNABLE_ROLES: UserRole[] = ["hr", "area_manager", "store_manager", "admin"];

type ActionResult<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

interface StaffAccount {
  id: string;
  email: string;
  role: UserRole;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
}

// Auth check: only admin can manage accounts
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "認証が必要です" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "管理者権限が必要です" };
  }
  return { user };
}

// Get all staff accounts (non-trainer, non-employee roles)
export async function getStaffAccounts(): Promise<ActionResult<StaffAccount[]>> {
  const auth = await requireAdmin();
  if (auth.error) return { success: false, error: auth.error };

  const admin = createAdminClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, role, display_name, created_at, updated_at")
    .in("role", ["hr", "admin", "area_manager", "store_manager"])
    .order("created_at", { ascending: false });

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }

  // Get auth user data for emails and last sign-in
  const { data: authUsers } = await admin.auth.admin.listUsers();
  const authMap = new Map(
    authUsers?.users?.map((u) => [u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at }]) ?? []
  );

  const accounts: StaffAccount[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: authMap.get(p.id)?.email ?? "不明",
    role: p.role as UserRole,
    display_name: p.display_name,
    created_at: p.created_at,
    updated_at: p.updated_at,
    last_sign_in_at: authMap.get(p.id)?.last_sign_in_at ?? null,
  }));

  return { success: true, data: accounts };
}

// Create a new staff account
export async function createStaffAccount(input: {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  storeId?: string;
  managedAreas?: string[];
}): Promise<ActionResult<{ userId: string }>> {
  const auth = await requireAdmin();
  if (auth.error) return { success: false, error: auth.error };

  if (!ASSIGNABLE_ROLES.includes(input.role)) {
    return { success: false, error: `無効なロールです: ${input.role}` };
  }

  if (!input.email || !input.password || !input.displayName) {
    return { success: false, error: "必須項目が不足しています" };
  }

  if (input.password.length < 6) {
    return { success: false, error: "パスワードは6文字以上で入力してください" };
  }

  const admin = createAdminClient();

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message?.includes("already been registered")) {
      return { success: false, error: "このメールアドレスは既に登録されています" };
    }
    return { success: false, error: authError.message };
  }

  const userId = authData.user.id;

  // Create profile
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({
      id: userId,
      role: input.role,
      display_name: input.displayName,
    });

  if (profileError) {
    // Rollback: delete auth user
    await admin.auth.admin.deleteUser(userId);
    return { success: false, error: profileError.message };
  }

  // If store_manager or area_manager, create store_managers entry
  if (input.role === "store_manager" && input.storeId) {
    await admin.from("store_managers").upsert({
      auth_user_id: userId,
      email: input.email,
      full_name: input.displayName,
      store_id: input.storeId,
      role: "store_manager",
      status: "active",
    });
  }

  if (input.role === "area_manager" && input.managedAreas?.length) {
    await admin.from("store_managers").upsert({
      auth_user_id: userId,
      email: input.email,
      full_name: input.displayName,
      role: "area_manager",
      managed_areas: input.managedAreas,
      status: "active",
    });
  }

  return { success: true, data: { userId } };
}

// Update a staff account's role
export async function updateStaffRole(
  userId: string,
  newRole: UserRole
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error) return { success: false, error: auth.error };

  if (!ASSIGNABLE_ROLES.includes(newRole)) {
    return { success: false, error: `無効なロールです: ${newRole}` };
  }

  // Prevent self-demotion
  if (userId === auth.user!.id) {
    return { success: false, error: "自分自身のロールは変更できません" };
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }
  return { success: true };
}

// Delete (deactivate) a staff account
export async function deleteStaffAccount(userId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error) return { success: false, error: auth.error };

  if (userId === auth.user!.id) {
    return { success: false, error: "自分自身のアカウントは削除できません" };
  }

  const admin = createAdminClient();

  // Soft delete: set role to inactive
  const { error } = await admin
    .from("profiles")
    .update({ role: "trainer", updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) { console.error("[action] DB error:", error.message); return { success: false, error: "操作に失敗しました。もう一度お試しください" }; }

  return { success: true };
}

