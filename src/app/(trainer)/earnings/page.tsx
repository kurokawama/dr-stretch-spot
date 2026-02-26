import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Clock } from "lucide-react";

export default async function EarningsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) redirect("/login");

  // Get completed applications with attendance data
  const { data: completed } = await supabase
    .from("shift_applications")
    .select(`
      id, confirmed_rate, rate_breakdown,
      shift_request:shift_requests(title, shift_date, start_time, end_time, store:stores(name)),
      attendance:attendance_records!application_id(actual_work_minutes)
    `)
    .eq("trainer_id", trainer.id)
    .eq("status", "completed")
    .order("applied_at", { ascending: false })
    .limit(30);

  const items = completed ?? [];

  // Calculate totals
  let totalEarnings = 0;
  let totalMinutes = 0;
  for (const item of items) {
    const attendance = item.attendance as unknown as { actual_work_minutes: number | null }[] | null;
    const minutes = attendance?.[0]?.actual_work_minutes ?? 0;
    totalMinutes += minutes;
    totalEarnings += Math.round((item.confirmed_rate * minutes) / 60);
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="font-heading text-2xl font-bold">収入明細</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">累計収入</p>
              <p className="text-2xl font-bold">¥{totalEarnings.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-accent/20 p-3">
              <Clock className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">累計勤務時間</p>
              <p className="text-2xl font-bold">{totalHours}h {remainingMinutes}m</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">完了シフト一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">完了したシフトはありません</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const sr = item.shift_request as unknown as { title: string; shift_date: string; start_time: string; end_time: string; store: { name: string } } | null;
                const attendance = item.attendance as unknown as { actual_work_minutes: number | null }[] | null;
                const minutes = attendance?.[0]?.actual_work_minutes ?? 0;
                const earned = Math.round((item.confirmed_rate * minutes) / 60);
                const rb = item.rate_breakdown as unknown as { base_rate?: number; attendance_bonus?: number; emergency_bonus?: number } | null;

                return (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{sr?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {sr?.store?.name} / {sr?.shift_date}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sr?.start_time}〜{sr?.end_time} ({Math.floor(minutes / 60)}h{minutes % 60}m)
                      </p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="font-bold">¥{earned.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">¥{item.confirmed_rate}/h</p>
                      <div className="flex gap-1 justify-end">
                        {rb?.attendance_bonus && rb.attendance_bonus > 0 && (
                          <Badge variant="outline" className="text-[10px]">出勤B</Badge>
                        )}
                        {rb?.emergency_bonus && rb.emergency_bonus > 0 && (
                          <Badge variant="outline" className="text-[10px]">緊急</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
