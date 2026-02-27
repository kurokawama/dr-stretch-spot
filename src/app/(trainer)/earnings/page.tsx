import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, Clock, ChevronLeft, ChevronRight } from "lucide-react";

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) redirect("/login");

  // Parse month from searchParams or default to current month
  const now = new Date();
  const currentMonthStr =
    params.month ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr, monthStr] = currentMonthStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  // Calculate month boundaries
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth =
    month === 12 ? new Date(year + 1, 0, 1) : new Date(year, month, 1);
  const monthEnd = nextMonth.toISOString().split("T")[0];

  // Previous/Next month strings
  const prevDate =
    month === 1 ? new Date(year - 1, 11, 1) : new Date(year, month - 2, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const nextDate =
    month === 12 ? new Date(year + 1, 0, 1) : new Date(year, month, 1);
  const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;
  const monthLabel = `${year}年${month}月`;

  // Get completed applications for this month
  const { data: completed } = await supabase
    .from("shift_applications")
    .select(
      `
      id, confirmed_rate, rate_breakdown,
      shift_request:shift_requests!inner(title, shift_date, start_time, end_time, store:stores(name)),
      attendance:attendance_records!application_id(actual_work_minutes)
    `
    )
    .eq("trainer_id", trainer.id)
    .eq("status", "completed")
    .gte("shift_request.shift_date", monthStart)
    .lt("shift_request.shift_date", monthEnd)
    .order("applied_at", { ascending: false });

  const items = completed ?? [];

  // Calculate totals for this month
  let totalEarnings = 0;
  let totalMinutes = 0;
  for (const item of items) {
    const attendance = item.attendance as unknown as {
      actual_work_minutes: number | null;
    }[] | null;
    const minutes = attendance?.[0]?.actual_work_minutes ?? 0;
    totalMinutes += minutes;
    totalEarnings += Math.round((item.confirmed_rate * minutes) / 60);
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">収入明細</h1>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/earnings?month=${prevMonthStr}`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm font-medium min-w-24 text-center">
            {monthLabel}
          </span>
          {!isCurrentMonth ? (
            <Button variant="outline" size="icon" asChild>
              <Link href={`/earnings?month=${nextMonthStr}`}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="icon" disabled>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {monthLabel}の収入
              </p>
              <p className="text-2xl font-bold">
                ¥{totalEarnings.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-accent/20 p-3">
              <Clock className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {monthLabel}の勤務時間
              </p>
              <p className="text-2xl font-bold">
                {totalHours}h {remainingMinutes}m
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {monthLabel}の完了シフト
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {monthLabel}の完了したシフトはありません
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const sr = item.shift_request as unknown as {
                  title: string;
                  shift_date: string;
                  start_time: string;
                  end_time: string;
                  store: { name: string };
                } | null;
                const attendance = item.attendance as unknown as {
                  actual_work_minutes: number | null;
                }[] | null;
                const minutes =
                  attendance?.[0]?.actual_work_minutes ?? 0;
                const earned = Math.round(
                  (item.confirmed_rate * minutes) / 60
                );
                const rb = item.rate_breakdown as unknown as {
                  base_rate?: number;
                  attendance_bonus?: number;
                  emergency_bonus?: number;
                } | null;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{sr?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {sr?.store?.name} / {sr?.shift_date}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sr?.start_time}〜{sr?.end_time} (
                        {Math.floor(minutes / 60)}h{minutes % 60}m)
                      </p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="font-bold">
                        ¥{earned.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ¥{item.confirmed_rate}/h
                      </p>
                      <div className="flex gap-1 justify-end">
                        {rb?.attendance_bonus &&
                          rb.attendance_bonus > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              出勤B
                            </Badge>
                          )}
                        {rb?.emergency_bonus &&
                          rb.emergency_bonus > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              緊急
                            </Badge>
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
