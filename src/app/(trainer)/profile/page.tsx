import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select(
      "full_name, phone, preferred_areas, preferred_time_slots, bio, bank_name, bank_branch, bank_account_type, bank_account_number, bank_account_holder"
    )
    .eq("auth_user_id", user.id)
    .single();

  if (!trainer) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="font-heading text-2xl font-bold">プロフィール</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            プロフィール情報が見つかりません。
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">プロフィール</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          基本情報・希望条件を更新できます。
        </p>
      </div>

      <ProfileForm
        initialValues={{
          fullName: trainer.full_name,
          phone: trainer.phone ?? "",
          preferredAreas: trainer.preferred_areas ?? [],
          preferredTimeSlots: trainer.preferred_time_slots ?? [],
          bio: trainer.bio ?? "",
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">口座情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">銀行名</span>
            <span>{trainer.bank_name ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">支店名</span>
            <span>{trainer.bank_branch ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">口座種別</span>
            <span>{trainer.bank_account_type ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">口座番号</span>
            <span>{trainer.bank_account_number ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">口座名義</span>
            <span>{trainer.bank_account_holder ?? "-"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
