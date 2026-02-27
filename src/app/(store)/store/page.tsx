import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarPlus,
  Users,
  ClipboardCheck,
  Star,
  MapPin,
  Calendar,
  TrendingUp,
} from "lucide-react";

export default async function StoreDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id, store_id, store:stores(name, address, area)")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) redirect("/login");

  const store = manager.store as unknown as {
    name: string;
    address: string;
    area: string;
  } | null;
  const today = new Date().toISOString().split("T")[0];

  // Today's shifts
  const { data: todayShifts, count: todayCount } = await supabase
    .from("shift_requests")
    .select("*", { count: "exact" })
    .eq("store_id", manager.store_id)
    .eq("shift_date", today)
    .limit(5);

  // Pending applications
  const { count: pendingCount } = await supabase
    .from("shift_applications")
    .select("*, shift_request:shift_requests!inner(store_id)", {
      count: "exact",
      head: true,
    })
    .eq("status", "pending")
    .eq("shift_request.store_id", manager.store_id);

  // Today's attendance
  const { count: attendanceCount } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("store_id", manager.store_id)
    .eq("shift_date", today);

  // Monthly stats
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const monthStart = startOfMonth.toISOString().split("T")[0];

  const { count: monthlyShiftCount } = await supabase
    .from("shift_requests")
    .select("*", { count: "exact", head: true })
    .eq("store_id", manager.store_id)
    .gte("shift_date", monthStart);

  const { count: monthlyAttendance } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("store_id", manager.store_id)
    .gte("shift_date", monthStart);

  // Upcoming shifts (next 7 days)
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split("T")[0];

  const { data: upcomingShifts } = await supabase
    .from("shift_requests")
    .select("id, title, shift_date, start_time, end_time, required_count, filled_count, status")
    .eq("store_id", manager.store_id)
    .gte("shift_date", today)
    .lte("shift_date", weekEndStr)
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(10);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Store Info Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold">ダッシュボード</h1>
        {store && (
          <div className="mt-1 space-y-0.5">
            <p className="text-sm text-muted-foreground">{store.name}</p>
            {store.address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {store.address}
              </p>
            )}
            {store.area && (
              <Badge variant="outline" className="text-xs mt-1">
                {store.area}エリア
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Today's KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarPlus className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold">{todayCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">本日のシフト</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-amber-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{pendingCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">未審査の応募</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ClipboardCheck className="h-8 w-8 text-green-600 shrink-0" />
            <div>
              <p className="text-2xl font-bold">{attendanceCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">本日の出勤者</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Star className="h-8 w-8 text-yellow-500 shrink-0" />
            <div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/store/evaluations">評価入力</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Applications Alert */}
      {pendingCount && pendingCount > 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm font-medium">
              {pendingCount}件の応募が審査待ちです
            </p>
            <Button size="sm" asChild>
              <Link href="/store/applications">確認する</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Monthly Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            今月のサマリー
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">シフト数</p>
              <p className="text-xl font-bold">{monthlyShiftCount ?? 0}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">出勤回数</p>
              <p className="text-xl font-bold">{monthlyAttendance ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Shifts (Next 7 days) */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              今週のシフト予定
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/store/shifts">全て見る</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {!upcomingShifts || upcomingShifts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              今後7日間の予定はありません
            </p>
          ) : (
            upcomingShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{shift.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {shift.shift_date} {shift.start_time}〜{shift.end_time}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      shift.filled_count >= shift.required_count
                        ? "default"
                        : "secondary"
                    }
                  >
                    {shift.filled_count}/{shift.required_count}名
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Today's Shifts Detail */}
      {todayShifts && todayShifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">本日のシフト</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{shift.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {shift.start_time}〜{shift.end_time}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      shift.status === "open" ? "default" : "secondary"
                    }
                  >
                    {shift.filled_count}/{shift.required_count}名
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
