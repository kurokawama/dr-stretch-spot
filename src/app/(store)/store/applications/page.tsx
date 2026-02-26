import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { ApplicationsList } from "./ApplicationsList";

interface ApplicationListItem {
  id: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "completed" | "no_show";
  confirmed_rate: number;
  applied_at: string;
  trainer: {
    full_name: string;
    tenure_years: number;
  } | null;
  shift_request: {
    title: string;
    shift_date: string;
    start_time: string;
    end_time: string;
  } | null;
}

export default async function StoreApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: manager } = await supabase
    .from("store_managers")
    .select("store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="font-heading text-2xl font-bold">応募者一覧</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            店舗情報を取得できませんでした。
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: storeShifts } = await supabase
    .from("shift_requests")
    .select("id")
    .eq("store_id", manager.store_id);
  const shiftIds = (storeShifts ?? []).map((shift) => shift.id);

  const applicationsResult =
    shiftIds.length > 0
      ? await supabase
          .from("shift_applications")
          .select(
            "id, status, confirmed_rate, applied_at, trainer:alumni_trainers(full_name, tenure_years), shift_request:shift_requests(title, shift_date, start_time, end_time)"
          )
          .in("shift_request_id", shiftIds)
          .eq("status", "pending")
          .order("applied_at", { ascending: false })
      : { data: [] };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">応募者一覧</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          承認待ちの応募を確認して処理します。
        </p>
      </div>
      <ApplicationsList initialItems={(applicationsResult.data ?? []) as ApplicationListItem[]} />
    </div>
  );
}
