import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, Users, Clock, TrendingUp } from "lucide-react";

export default async function UsagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: manager } = await supabase
    .from("store_managers")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) redirect("/store");

  const storeId = manager.store_id;

  // Get current month stats
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStart = startOfMonth.toISOString().split("T")[0];

  // Attendance records this month
  const { data: records } = await supabase
    .from("attendance_records")
    .select("id, trainer_id, actual_work_minutes, status, shift_date, application_id")
    .eq("store_id", storeId)
    .gte("shift_date", monthStart)
    .order("shift_date", { ascending: false });

  // Shift requests this month
  const { data: shifts } = await supabase
    .from("shift_requests")
    .select("id, title, shift_date, required_count, filled_count, status")
    .eq("store_id", storeId)
    .gte("shift_date", monthStart)
    .order("shift_date", { ascending: false });

  // Calculate stats
  const totalShifts = shifts?.length ?? 0;
  const completedRecords =
    records?.filter((r) => r.status === "clocked_out" || r.status === "verified") ?? [];
  const totalWorkMinutes = completedRecords.reduce(
    (sum, r) => sum + (r.actual_work_minutes ?? 0),
    0
  );
  const uniqueTrainers = new Set(records?.map((r) => r.trainer_id) ?? []).size;
  const totalRequired = shifts?.reduce((s, r) => s + r.required_count, 0) ?? 0;
  const totalFilled = shifts?.reduce((s, r) => s + r.filled_count, 0) ?? 0;
  const fillRate =
    totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">利用実績</h1>
        <p className="text-sm text-muted-foreground mt-1">
          今月のSPOT利用状況を確認
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">シフト数</span>
            </div>
            <p className="text-2xl font-bold">{totalShifts}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">利用トレーナー</span>
            </div>
            <p className="text-2xl font-bold">{uniqueTrainers}名</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">総労働時間</span>
            </div>
            <p className="text-2xl font-bold">
              {Math.round(totalWorkMinutes / 60)}h
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">充足率</span>
            </div>
            <p className="text-2xl font-bold">{fillRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Shift Detail Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">今月のシフト一覧</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日付</TableHead>
                <TableHead>タイトル</TableHead>
                <TableHead>充足</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!shifts || shifts.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    今月のシフトデータがありません
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-mono text-sm">
                      {shift.shift_date}
                    </TableCell>
                    <TableCell>{shift.title}</TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {shift.filled_count}/{shift.required_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          shift.status === "completed"
                            ? "default"
                            : shift.status === "open"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {shift.status === "open"
                          ? "募集中"
                          : shift.status === "completed"
                            ? "完了"
                            : shift.status === "closed"
                              ? "締切"
                              : shift.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
