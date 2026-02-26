import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EvaluationForm } from "./EvaluationForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export default async function StoreEvaluationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id, store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) redirect("/login");

  // Completed shifts awaiting evaluation (approved applications with completed attendance but no evaluation yet)
  const { data: pendingEvals } = await supabase
    .from("shift_applications")
    .select(`
      id,
      confirmed_rate,
      trainer:alumni_trainers(id, full_name, tenure_years),
      shift_request:shift_requests!inner(id, title, shift_date, start_time, end_time, store_id)
    `)
    .eq("status", "approved")
    .eq("shift_request.store_id", manager.store_id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Filter out already evaluated ones
  const applicationIds = (pendingEvals ?? []).map((a) => a.id);
  let evaluatedIds: string[] = [];
  if (applicationIds.length > 0) {
    const { data: existingEvals } = await supabase
      .from("evaluations")
      .select("application_id")
      .in("application_id", applicationIds);
    evaluatedIds = (existingEvals ?? []).map((e) => e.application_id);
  }

  const unevaluated = (pendingEvals ?? []).filter(
    (a) => !evaluatedIds.includes(a.id)
  );

  // Recent evaluations from this store
  const { data: recentEvals } = await supabase
    .from("evaluations")
    .select(`
      *,
      trainer:alumni_trainers(full_name)
    `)
    .eq("store_id", manager.store_id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="font-heading text-2xl font-bold">評価入力</h1>

      {unevaluated.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            未評価のシフト
            <Badge variant="destructive" className="ml-2">
              {unevaluated.length}
            </Badge>
          </h2>
          {unevaluated.map((app) => {
            const trainer = app.trainer as unknown as {
              id: string;
              full_name: string;
              tenure_years: number;
            } | null;
            const shift = app.shift_request as unknown as {
              title: string;
              shift_date: string;
              start_time: string;
              end_time: string;
            } | null;

            return (
              <EvaluationForm
                key={app.id}
                applicationId={app.id}
                trainerName={trainer?.full_name ?? "-"}
                tenureYears={trainer?.tenure_years ?? 0}
                shiftTitle={shift?.title ?? "-"}
                shiftDate={shift?.shift_date ?? "-"}
                shiftTime={`${shift?.start_time ?? ""}〜${shift?.end_time ?? ""}`}
              />
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            未評価のシフトはありません
          </CardContent>
        </Card>
      )}

      {recentEvals && recentEvals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近の評価</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentEvals.map((evaluation) => {
              const trainer = evaluation.trainer as unknown as {
                full_name: string;
              } | null;

              return (
                <div
                  key={evaluation.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {trainer?.full_name ?? "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(evaluation.created_at).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= evaluation.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
