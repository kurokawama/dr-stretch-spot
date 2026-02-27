"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, AttendanceRecord } from "@/types/database";

interface ClockInput {
  attendance_id: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function clockIn(input: ClockInput): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  // Get attendance record
  const { data: record } = await supabase
    .from("attendance_records")
    .select("*, store:stores(latitude, longitude, geofence_radius_meters)")
    .eq("id", input.attendance_id)
    .single();

  if (!record) return { success: false, error: "出勤記録が見つかりません" };
  if (record.status !== "scheduled") {
    return { success: false, error: "既に出勤済みか、無効な状態です" };
  }

  // Verify location if store has coordinates
  let isLocationVerified = false;
  if (
    record.store?.latitude &&
    record.store?.longitude &&
    input.latitude &&
    input.longitude
  ) {
    const distance = calculateDistance(
      input.latitude,
      input.longitude,
      record.store.latitude,
      record.store.longitude
    );
    isLocationVerified =
      distance <= (record.store.geofence_radius_meters ?? 200);
  }

  const { error } = await supabase
    .from("attendance_records")
    .update({
      clock_in_at: new Date().toISOString(),
      clock_in_latitude: input.latitude ?? null,
      clock_in_longitude: input.longitude ?? null,
      is_location_verified: isLocationVerified,
      status: "clocked_in",
    })
    .eq("id", input.attendance_id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function clockOut(input: ClockInput): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: record } = await supabase
    .from("attendance_records")
    .select("clock_in_at, break_minutes")
    .eq("id", input.attendance_id)
    .single();

  if (!record) return { success: false, error: "出勤記録が見つかりません" };
  if (!record.clock_in_at) {
    return { success: false, error: "まだ出勤していません" };
  }

  const clockOutTime = new Date();
  const clockInTime = new Date(record.clock_in_at);
  const totalMinutes = Math.round(
    (clockOutTime.getTime() - clockInTime.getTime()) / 60000
  );
  const actualWorkMinutes = Math.max(
    0,
    totalMinutes - (record.break_minutes ?? 0)
  );

  const { error } = await supabase
    .from("attendance_records")
    .update({
      clock_out_at: clockOutTime.toISOString(),
      clock_out_latitude: input.latitude ?? null,
      clock_out_longitude: input.longitude ?? null,
      actual_work_minutes: actualWorkMinutes,
      status: "clocked_out",
    })
    .eq("id", input.attendance_id);

  if (error) return { success: false, error: error.message };

  // Update trainer's last_shift_date
  const { data: attendanceRecord } = await supabase
    .from("attendance_records")
    .select("trainer_id, shift_date")
    .eq("id", input.attendance_id)
    .single();

  if (attendanceRecord) {
    await supabase
      .from("alumni_trainers")
      .update({
        last_shift_date: attendanceRecord.shift_date,
        blank_status: "ok",
      })
      .eq("id", attendanceRecord.trainer_id);
  }

  return { success: true };
}

export async function getTodayAttendance(): Promise<
  ActionResult<AttendanceRecord[]>
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "ログインが必要です" };

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) return { success: false, error: "トレーナー情報が見つかりません" };

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("attendance_records")
    .select("*, store:stores(name, address)")
    .eq("trainer_id", trainer.id)
    .eq("shift_date", today)
    .order("scheduled_start");

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function verifyAttendance(
  attendanceId: string,
  managerNote?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("attendance_records")
    .update({
      status: "verified",
      manager_note: managerNote ?? null,
    })
    .eq("id", attendanceId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
