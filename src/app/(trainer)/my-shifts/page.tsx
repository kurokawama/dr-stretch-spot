import { getMyApplications } from "@/actions/applications";
import { Card, CardContent } from "@/components/ui/card";
import { MyShiftsTabs } from "./MyShiftsTabs";

export default async function MyShiftsPage() {
  const applicationsResult = await getMyApplications();

  if (!applicationsResult.success) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">マイシフト</h1>
        </div>
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {applicationsResult.error ?? "データ取得に失敗しました。"}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">マイシフト</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          応募履歴とシフト状態を確認できます。
        </p>
      </div>
      <MyShiftsTabs initialApplications={applicationsResult.data ?? []} />
    </div>
  );
}
