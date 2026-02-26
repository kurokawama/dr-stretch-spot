import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { EvaluationForms } from "./EvaluationForms";

interface EvaluationItem {
  applicationId: string;
  trainerName: string;
  confirmedRate: number;
  shiftTitle: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
}

export default async function StoreEvaluationsPage() {
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
        <h1 className="font-heading text-2xl font-bold">評価入力</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            店舗情報を取得できませんでした。
          </CardContent>
        </Card>
      </div>
    );
  }

  const attendanceResult = await supabase
    .from("attendance_records")
    .select("application_id")
    .eq("store_id", manager.store_id)
    .in("status", ["clocked_out", "verified"])
    .order("shift_date", { ascending: false })
    .limit(200);

  const applicationIds = Array.from(
    new Set((attendanceResult.data ?? []).map((row) => row.application_id))
  );

  const evaluatedResult =
    applicationIds.length > 0
      ? await supabase
          .from("evaluations")
          .select("application_id")
          .in("application_id", applicationIds)
      : { data: [] };

  const evaluatedApplicationIds = new Set(
    (evaluatedResult.data ?? []).map((row) => row.application_id)
  );

  const applicationsResult =
    applicationIds.length > 0
      ? await supabase
          .from("shift_applications")
          .select(
            "id, status, confirmed_rate, trainer:alumni_trainers(full_name), shift_request:shift_requests(title, shift_date, start_time, end_time)"
          )
          .in("id", applicationIds)
          .in("status", ["approved", "completed"])
      : { data: [] };

  const items = ((applicationsResult.data ?? []) as Array<{
    id: string;
    status: string;
    confirmed_rate: number;
    trainer: { full_name: string } | null;
    shift_request: {
      title: string;
      shift_date: string;
      start_time: string;
      end_time: string;
    } | null;
  }>)
    .filter((application) => !evaluatedApplicationIds.has(application.id))
    .map((application) => ({
      applicationId: application.id,
      trainerName: application.trainer?.full_name ?? "トレーナー未設定",
      confirmedRate: application.confirmed_rate,
      shiftTitle: application.shift_request?.title ?? "シフト未設定",
      shiftDate: application.shift_request?.shift_date ?? "",
      startTime: application.shift_request?.start_time ?? "",
      endTime: application.shift_request?.end_time ?? "",
    }))
    .sort((a, b) => (a.shiftDate > b.shiftDate ? -1 : 1));

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">評価入力</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          完了シフトの評価を入力してください。
        </p>
      </div>
      <EvaluationForms initialItems={items as EvaluationItem[]} />
    </div>
  );
}
