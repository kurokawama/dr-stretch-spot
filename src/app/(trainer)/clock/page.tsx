"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, QrCode, Loader2 } from "lucide-react";
import { getTodayAttendance } from "@/actions/attendance";
import { generateQrToken, getActiveQrToken } from "@/actions/qr";
import { getMyApplications } from "@/actions/applications";
import type { AttendanceRecord } from "@/types/database";
import { toast } from "sonner";

export default function ClockPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [qrData, setQrData] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const result = await getTodayAttendance();
    if (result.success && result.data) setRecords(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    // Poll for clock_out QR tokens every 5 seconds
    const pollInterval = setInterval(async () => {
      const result = await getTodayAttendance();
      if (result.success && result.data) {
        setRecords(result.data);
        // Check for clock_out QR tokens for clocked_in records
        for (const record of result.data) {
          if (record.status === "clocked_in") {
            const qr = await getActiveQrToken(record.application_id, "clock_out");
            if (qr.success && qr.data) {
              setQrData((prev) => ({
                ...prev,
                [`out_${record.id}`]: qr.data!.token,
              }));
            }
          }
        }
      }
    }, 5000);
    return () => {
      clearInterval(clockInterval);
      clearInterval(pollInterval);
    };
  }, [loadData]);

  const handleGenerateClockInQR = async (record: AttendanceRecord) => {
    setGenerating(record.id);

    // Find the application ID for this attendance record
    const appResult = await getMyApplications();
    const app = appResult.data?.find(
      (a) =>
        a.shift_request_id === record.application_id ||
        a.id === record.application_id
    );

    const applicationId = record.application_id;

    const result = await generateQrToken(applicationId, "clock_in");
    setGenerating(null);

    if (result.success && result.data) {
      setQrData((prev) => ({
        ...prev,
        [`in_${record.id}`]: result.data!.token,
      }));
      toast.success("QRコードを生成しました。店舗スタッフに見せてください。");
    } else {
      toast.error(result.error ?? "QRコード生成に失敗しました");
    }
  };

  const statusLabels: Record<string, string> = {
    scheduled: "予定",
    clocked_in: "出勤中",
    clocked_out: "退勤済",
    verified: "確認済",
  };

  // Generate QR code as SVG (simple text-based QR display)
  const QrDisplay = ({ token, label }: { token: string; label: string }) => {
    const qrUrl = `${window.location.origin}/api/attendance/verify?token=${token}`;
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-primary bg-white p-6">
        <p className="text-sm font-medium text-primary">{label}</p>
        {/* QR code rendered as a large scannable text block */}
        <div className="flex flex-col items-center gap-2">
          <QrCode className="h-16 w-16 text-primary" />
          <div className="rounded bg-gray-100 px-3 py-2 font-mono text-xs break-all max-w-64 text-center">
            {token.slice(0, 8)}...{token.slice(-8)}
          </div>
          <p className="text-xs text-muted-foreground">
            店舗のスキャナーで読み取ってください
          </p>
        </div>
        {/* Hidden URL for QR scanner apps */}
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
          alt="QR Code"
          className="h-48 w-48"
          style={{ imageRendering: "pixelated" }}
        />
        <p className="text-xs text-muted-foreground">
          有効期限: 15分
        </p>
      </div>
    );
  };

  if (loading)
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="font-heading text-2xl font-bold">打刻（QRコード）</h1>

      {/* Current time */}
      <Card>
        <CardContent className="flex flex-col items-center py-6">
          <Clock className="mb-2 h-8 w-8 text-primary" />
          <p className="font-heading text-4xl font-bold tabular-nums">
            {currentTime.toLocaleTimeString("ja-JP")}
          </p>
          <p className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "short",
            })}
          </p>
        </CardContent>
      </Card>

      {records.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          本日のシフトはありません
        </p>
      ) : (
        <div className="space-y-4">
          {records.map((record) => {
            const store = record.store as unknown as
              | { name: string; address: string }
              | undefined;
            const clockInToken = qrData[`in_${record.id}`];
            const clockOutToken = qrData[`out_${record.id}`];

            return (
              <Card key={record.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {store?.name ?? "店舗"}
                    </CardTitle>
                    <Badge
                      variant={
                        record.status === "clocked_in" ? "default" : "outline"
                      }
                    >
                      {statusLabels[record.status] ?? record.status}
                    </Badge>
                  </div>
                  {store?.address && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {store.address}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">
                    {record.scheduled_start?.slice(0, 5)} 〜{" "}
                    {record.scheduled_end?.slice(0, 5)}
                  </p>

                  {/* Clock In: Generate and show QR */}
                  {record.status === "scheduled" && !clockInToken && (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => handleGenerateClockInQR(record)}
                      disabled={generating === record.id}
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      {generating === record.id
                        ? "生成中..."
                        : "出勤QRコードを表示"}
                    </Button>
                  )}

                  {record.status === "scheduled" && clockInToken && (
                    <QrDisplay token={clockInToken} label="出勤用 QRコード" />
                  )}

                  {/* Clock Out: Show QR when store requests it */}
                  {record.status === "clocked_in" && !clockOutToken && (
                    <div className="rounded-lg bg-blue-50 p-4 text-center">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-blue-500" />
                      <p className="text-sm font-medium text-blue-700">
                        出勤中
                      </p>
                      <p className="text-xs text-blue-600">
                        退勤時は店舗スタッフが退勤リクエストを送信します。
                        <br />
                        QRコードが自動的に表示されます。
                      </p>
                    </div>
                  )}

                  {record.status === "clocked_in" && clockOutToken && (
                    <QrDisplay token={clockOutToken} label="退勤用 QRコード" />
                  )}

                  {/* Completed */}
                  {record.clock_in_at && (
                    <p className="text-xs text-muted-foreground">
                      出勤:{" "}
                      {new Date(record.clock_in_at).toLocaleTimeString("ja-JP")}
                    </p>
                  )}
                  {record.clock_out_at && (
                    <p className="text-xs text-muted-foreground">
                      退勤:{" "}
                      {new Date(record.clock_out_at).toLocaleTimeString(
                        "ja-JP"
                      )}
                      {record.actual_work_minutes != null &&
                        ` (${Math.floor(record.actual_work_minutes / 60)}h${record.actual_work_minutes % 60}m)`}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
