import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { StoreShiftForm } from "./StoreShiftForm";
import type { ShiftTemplate } from "@/types/database";

type TemplateItem = Pick<
  ShiftTemplate,
  "id" | "name" | "title" | "start_time" | "end_time" | "break_minutes" | "required_count"
>;

export default async function StoreShiftsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id, store_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!manager) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="font-heading text-2xl font-bold">シフト募集作成</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            店舗情報を取得できませんでした。
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: templates } = await supabase
    .from("shift_templates")
    .select("id, name, title, start_time, end_time, break_minutes, required_count")
    .eq("store_id", manager.store_id)
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">シフト募集作成</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          テンプレートを使って募集を素早く作成できます。
        </p>
      </div>
      <StoreShiftForm
        storeId={manager.store_id}
        managerId={manager.id}
        initialTemplates={(templates ?? []) as TemplateItem[]}
      />
    </div>
  );
}
