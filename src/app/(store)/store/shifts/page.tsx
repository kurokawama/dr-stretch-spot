import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShiftCreateForm } from "./ShiftCreateForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function StoreShiftsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id, store_id, store:stores(name)")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) redirect("/login");

  // Get upcoming shifts for this store
  const today = new Date().toISOString().split("T")[0];
  const { data: shifts } = await supabase
    .from("shift_requests")
    .select("*")
    .eq("store_id", manager.store_id)
    .gte("shift_date", today)
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(20);

  const statusLabels: Record<string, string> = {
    pending_approval: "承認待ち",
    open: "募集中",
    closed: "締切",
    cancelled: "キャンセル",
    completed: "完了",
  };

  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending_approval: "secondary",
    open: "default",
    closed: "secondary",
    cancelled: "destructive",
    completed: "outline",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="font-heading text-2xl font-bold">シフト募集管理</h1>

      <ShiftCreateForm storeId={manager.store_id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">今後のシフト</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!shifts || shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              募集中のシフトはありません
            </p>
          ) : (
            shifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{shift.title}</p>
                    {shift.is_emergency && (
                      <Badge variant="destructive" className="text-xs">
                        緊急
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {shift.shift_date} {shift.start_time}〜{shift.end_time}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {shift.filled_count}/{shift.required_count}名
                  </span>
                  <Badge variant={statusVariants[shift.status] ?? "default"}>
                    {statusLabels[shift.status] ?? shift.status}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
