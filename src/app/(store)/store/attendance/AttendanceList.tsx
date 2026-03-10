"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { verifyAttendance } from "@/actions/attendance";
import { requestClockOut } from "@/actions/matching";
import { toast } from "sonner";
import type { AttendanceRecord } from "@/types/database";
import { CheckCircle, Clock, QrCode, LogOut, Loader2, Camera, Keyboard } from "lucide-react";

const statusLabels: Record<string, string> = {
  scheduled: "予定",
  clocked_in: "出勤中",
  clocked_out: "退勤済",
  verified: "確認済",
  disputed: "異議あり",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "outline",
  clocked_in: "default",
  clocked_out: "secondary",
  verified: "secondary",
  disputed: "destructive",
};

interface AttendanceListProps {
  todayRecords: AttendanceRecord[];
  recentRecords: AttendanceRecord[];
}

export function AttendanceList({
  todayRecords,
  recentRecords,
}: AttendanceListProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState<string | null>(null);
  const [scanDialog, setScanDialog] = useState(false);
  const [scanToken, setScanToken] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraMode(false);
  }, []);

  const processQrResult = useCallback(async (rawValue: string) => {
    stopCamera();
    // Extract token from URL or use raw value
    let token = rawValue.trim();
    const urlMatch = token.match(/[?&]token=([^&]+)/);
    if (urlMatch) {
      token = urlMatch[1];
    }

    setScanning(true);
    try {
      const res = await fetch("/api/attendance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await res.json();

      if (result.success) {
        const action = result.data.type === "clock_in" ? "出勤" : "退勤";
        toast.success(`${action}打刻が完了しました`);
        setScanDialog(false);
        setScanToken("");
        router.refresh();
      } else {
        toast.error(result.error ?? "QRコードの検証に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    }
    setScanning(false);
  }, [stopCamera, router]);

  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setCameraMode(true);

      // Wait for video element to be available
      await new Promise<void>((resolve) => {
        const check = () => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });

      // Check if BarcodeDetector is available
      if ("BarcodeDetector" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detector = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        });

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState !== 4) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const value = barcodes[0].rawValue;
              if (value) {
                processQrResult(value);
              }
            }
          } catch {
            // Detection failed, keep trying
          }
        }, 300);
      } else {
        // BarcodeDetector not available - use canvas + manual approach
        setCameraError(
          "このブラウザはQR自動読み取りに対応していません。QRコードが画面に映ったら、下のテキスト入力欄にトークンを入力してください。"
        );
      }
    } catch {
      setCameraError(
        "カメラへのアクセスが拒否されました。ブラウザの設定でカメラの許可を確認してください。"
      );
    }
  }, [processQrResult]);

  // Cleanup camera on dialog close
  useEffect(() => {
    if (!scanDialog) {
      stopCamera();
    }
  }, [scanDialog, stopCamera]);

  const handleVerify = async (attendanceId: string) => {
    setProcessing(attendanceId);
    const result = await verifyAttendance(attendanceId);
    setProcessing(null);

    if (result.success) {
      toast.success("出勤を確認しました");
      router.refresh();
    } else {
      toast.error(result.error ?? "確認に失敗しました");
    }
  };

  const handleScanQR = async () => {
    if (!scanToken.trim()) {
      toast.error("QRコードのトークンを入力してください");
      return;
    }

    setScanning(true);

    // Extract token from URL if pasted
    let token = scanToken.trim();
    const urlMatch = token.match(/[?&]token=([^&]+)/);
    if (urlMatch) {
      token = urlMatch[1];
    }

    try {
      const res = await fetch("/api/attendance/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await res.json();

      if (result.success) {
        const action = result.data.type === "clock_in" ? "出勤" : "退勤";
        toast.success(`${action}打刻が完了しました`);
        setScanDialog(false);
        setScanToken("");
        router.refresh();
      } else {
        toast.error(result.error ?? "QRコードの検証に失敗しました");
      }
    } catch {
      toast.error("通信エラーが発生しました");
    }

    setScanning(false);
  };

  const handleClockOutRequest = async (applicationId: string) => {
    setProcessing(applicationId);
    const result = await requestClockOut(applicationId);
    setProcessing(null);

    if (result.success) {
      toast.success(
        "退勤リクエストを送信しました。トレーナーのアプリにQRコードが表示されます。"
      );
    } else {
      toast.error(result.error ?? "退勤リクエストに失敗しました");
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    return new Date(time).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderRecord = (record: AttendanceRecord) => {
    const trainer = record.trainer as unknown as {
      full_name: string;
    } | null;

    return (
      <div
        key={record.id}
        className="flex items-center justify-between rounded-md border p-3"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">
              {trainer?.full_name ?? "-"}
            </p>
            <Badge variant={statusVariants[record.status] ?? "outline"}>
              {statusLabels[record.status] ?? record.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {record.scheduled_start?.slice(0, 5)}〜
              {record.scheduled_end?.slice(0, 5)}
            </span>
          </div>
          {(record.clock_in_at || record.clock_out_at) && (
            <p className="text-xs text-muted-foreground">
              打刻: {formatTime(record.clock_in_at)} →{" "}
              {formatTime(record.clock_out_at)}
              {record.actual_work_minutes != null && (
                <span className="ml-2">
                  ({Math.floor(record.actual_work_minutes / 60)}時間
                  {record.actual_work_minutes % 60}分)
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* Clock in: waiting for QR scan */}
          {record.status === "scheduled" && (
            <Badge variant="outline" className="text-xs">
              QR待ち
            </Badge>
          )}

          {/* Clock out request */}
          {record.status === "clocked_in" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClockOutRequest(record.application_id)}
              disabled={processing === record.application_id}
            >
              <LogOut className="mr-1 h-4 w-4" />
              {processing === record.application_id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "退勤リクエスト"
              )}
            </Button>
          )}

          {/* Verify completed attendance */}
          {record.status === "clocked_out" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleVerify(record.id)}
              disabled={processing === record.id}
            >
              <CheckCircle className="mr-1 h-4 w-4" />
              確認
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* QR Scan button */}
      <Card>
        <CardContent className="py-4">
          <Button
            className="w-full"
            size="lg"
            onClick={() => setScanDialog(true)}
          >
            <QrCode className="mr-2 h-5 w-5" />
            QRコードをスキャン（出勤・退勤）
          </Button>
        </CardContent>
      </Card>

      {/* Today's records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            本日の出勤
            <Badge variant="outline" className="ml-2">
              {todayRecords.length}名
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {todayRecords.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              本日の出勤予定はありません
            </p>
          ) : (
            todayRecords.map(renderRecord)
          )}
        </CardContent>
      </Card>

      {/* Recent records */}
      {recentRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">直近7日間</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentRecords.map(renderRecord)}
          </CardContent>
        </Card>
      )}

      {/* QR Scan dialog */}
      <Dialog open={scanDialog} onOpenChange={setScanDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QRコードスキャン</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Camera / Manual toggle */}
            <div className="flex gap-2">
              <Button
                variant={cameraMode ? "default" : "outline"}
                size="sm"
                onClick={startCamera}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-1" />
                カメラ
              </Button>
              <Button
                variant={!cameraMode ? "default" : "outline"}
                size="sm"
                onClick={stopCamera}
                className="flex-1"
              >
                <Keyboard className="h-4 w-4 mr-1" />
                手動入力
              </Button>
            </div>

            {/* Camera view */}
            {cameraMode && (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  {/* Scan overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-white/70 rounded-lg" />
                  </div>
                </div>
                {cameraError && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    {cameraError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  QRコードをカメラに映してください。自動で読み取ります。
                </p>
              </div>
            )}

            {/* Manual input */}
            {!cameraMode && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  トレーナーのQRコードに表示されているURLまたはトークンを入力してください。
                </p>
                <Input
                  placeholder="トークンまたはURLを入力..."
                  value={scanToken}
                  onChange={(e) => setScanToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScanQR()}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanDialog(false)}>
              閉じる
            </Button>
            {!cameraMode && (
              <Button onClick={handleScanQR} disabled={scanning}>
                {scanning ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                {scanning ? "処理中..." : "打刻実行"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
