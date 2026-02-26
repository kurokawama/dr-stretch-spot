import { getTodayAttendance } from "@/actions/attendance";
import { Card, CardContent } from "@/components/ui/card";
import { ClockPanel } from "./ClockPanel";

export default async function ClockPage() {
  const attendanceResult = await getTodayAttendance();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">打刻</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          本日のシフトに対して出退勤を記録します。
        </p>
      </div>
      {attendanceResult.success ? (
        <ClockPanel initialRecords={attendanceResult.data ?? []} />
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {attendanceResult.error ?? "打刻情報の取得に失敗しました。"}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
