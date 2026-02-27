import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { redirect } from "next/navigation";

export default async function HRAttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();

  // Area manager filtering
  let managedAreas: string[] = [];
  if (profile?.role === "area_manager") {
    const { data: manager } = await admin
      .from("store_managers")
      .select("managed_areas")
      .eq("auth_user_id", user.id)
      .single();
    managedAreas = manager?.managed_areas ?? [];
  }

  // Today's records
  const today = new Date().toISOString().split("T")[0];
  const { data: todayRecords } = await admin
    .from("attendance_records")
    .select("*, trainer:alumni_trainers(full_name, email), store:stores(name, area)")
    .eq("shift_date", today)
    .order("scheduled_start");

  // Past 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  const { data: recentRecords } = await admin
    .from("attendance_records")
    .select("*, trainer:alumni_trainers(full_name), store:stores(name, area)")
    .gte("shift_date", weekAgoStr)
    .lt("shift_date", today)
    .order("shift_date", { ascending: false });

  const filterByArea = <T extends { store?: { area?: string } | null }>(
    records: T[]
  ): T[] => {
    if (managedAreas.length === 0) return records;
    return records.filter((r) =>
      managedAreas.includes(r.store?.area ?? "")
    );
  };

  const filteredToday = filterByArea(todayRecords ?? []);
  const filteredRecent = filterByArea(recentRecords ?? []);

  const statusLabel = (status: string) => {
    switch (status) {
      case "scheduled": return "待機中";
      case "clocked_in": return "出勤中";
      case "clocked_out": return "退勤済";
      case "verified": return "確認済";
      case "disputed": return "要確認";
      default: return status;
    }
  };

  const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "clocked_in": return "default";
      case "scheduled": return "secondary";
      case "clocked_out": return "outline";
      case "verified": return "outline";
      case "disputed": return "destructive";
      default: return "secondary";
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const AttendanceTable = ({
    records,
  }: {
    records: typeof filteredToday;
  }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>日付</TableHead>
          <TableHead>トレーナー</TableHead>
          <TableHead>店舗</TableHead>
          <TableHead>エリア</TableHead>
          <TableHead>予定</TableHead>
          <TableHead>出勤</TableHead>
          <TableHead>退勤</TableHead>
          <TableHead>実働</TableHead>
          <TableHead>ステータス</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-muted-foreground">
              記録がありません
            </TableCell>
          </TableRow>
        ) : (
          records.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.shift_date}</TableCell>
              <TableCell className="font-medium">
                {r.trainer?.full_name}
              </TableCell>
              <TableCell>{r.store?.name}</TableCell>
              <TableCell>{r.store?.area}</TableCell>
              <TableCell>
                {r.scheduled_start?.slice(0, 5)}〜
                {r.scheduled_end?.slice(0, 5)}
              </TableCell>
              <TableCell>{formatTime(r.clock_in_at)}</TableCell>
              <TableCell>{formatTime(r.clock_out_at)}</TableCell>
              <TableCell>
                {r.actual_work_minutes != null
                  ? `${Math.floor(r.actual_work_minutes / 60)}h${r.actual_work_minutes % 60}m`
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(r.status)}>
                  {statusLabel(r.status)}
                </Badge>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">出勤管理</h1>
        <p className="text-muted-foreground">
          全店舗の出退勤記録
          {managedAreas.length > 0 && `（${managedAreas.join(", ")}）`}
        </p>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">
            本日（{filteredToday.length}件）
          </TabsTrigger>
          <TabsTrigger value="recent">
            過去7日間（{filteredRecent.length}件）
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <Card>
            <CardHeader>
              <CardTitle>本日の出勤記録 — {today}</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceTable records={filteredToday} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>過去7日間の出勤記録</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceTable records={filteredRecent} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
