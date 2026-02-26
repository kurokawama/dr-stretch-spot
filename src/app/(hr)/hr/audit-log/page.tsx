import { createClient } from "@/lib/supabase/server";
import { AuditLogList } from "./AuditLogList";

export default async function HRAuditLogPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("rate_change_logs")
    .select("*, changed_by_manager:store_managers!changed_by(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">変更履歴</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          時給テーブル・ブランクルールの変更履歴（監査ログ）
        </p>
      </div>

      <AuditLogList initialData={logs ?? []} />
    </div>
  );
}
