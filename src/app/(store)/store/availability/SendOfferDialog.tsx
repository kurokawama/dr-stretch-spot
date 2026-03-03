"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendOffer } from "@/actions/offers";
import type {
  ShiftAvailability,
  ShiftOffer,
  TrainerRank,
} from "@/types/database";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SendOfferDialogProps {
  availability: ShiftAvailability;
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StoreAvailabilityTableProps {
  availabilities: ShiftAvailability[];
  offers: ShiftOffer[];
  storeId: string;
}

const availabilityStatusLabels: Record<ShiftAvailability["status"], string> = {
  open: "公開中",
  offered: "オファー済",
  matched: "確定",
  expired: "期限切れ",
  cancelled: "キャンセル",
};

const availabilityStatusStyles: Record<ShiftAvailability["status"], string> = {
  open: "bg-blue-100 text-blue-800",
  offered: "bg-amber-100 text-amber-800",
  matched: "bg-green-100 text-green-800",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-100 text-gray-600",
};

const offerStatusLabels: Record<ShiftOffer["status"], string> = {
  pending: "回答待ち",
  accepted: "承諾",
  declined: "辞退",
  expired: "期限切れ",
  cancelled: "キャンセル",
};

const offerStatusStyles: Record<ShiftOffer["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-100 text-gray-600",
};

const rankConfig: Record<TrainerRank, { label: string; color: string }> = {
  bronze: { label: "ブロンズ", color: "bg-orange-100 text-orange-800" },
  silver: { label: "シルバー", color: "bg-gray-100 text-gray-700" },
  gold: { label: "ゴールド", color: "bg-yellow-100 text-yellow-800" },
  platinum: { label: "プラチナ", color: "bg-purple-100 text-purple-800" },
};

function normalizeTime(time: string): string {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

export default function SendOfferDialog({
  availability,
  storeId,
  open,
  onOpenChange,
}: SendOfferDialogProps) {
  const router = useRouter();
  const [title, setTitle] = useState("通常シフト");
  const [shiftDate, setShiftDate] = useState(availability.available_date);
  const [startTime, setStartTime] = useState(normalizeTime(availability.start_time));
  const [endTime, setEndTime] = useState(normalizeTime(availability.end_time));
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [submitting, setSubmitting] = useState(false);

  const trainer = availability.trainer;
  const canSend =
    availability.status === "open" && availability.store_id === storeId;
  const invalidTime = startTime >= endTime;

  const handleSubmit = async () => {
    if (!canSend) {
      toast.error("この申告にはオファーできません");
      return;
    }
    if (!title.trim() || !shiftDate || !startTime || !endTime) {
      toast.error("入力内容を確認してください");
      return;
    }
    if (invalidTime) {
      toast.error("開始時刻と終了時刻を確認してください");
      return;
    }

    setSubmitting(true);
    const result = await sendOffer({
      availability_id: availability.id,
      title: title.trim(),
      shift_date: shiftDate,
      start_time: startTime,
      end_time: endTime,
      break_minutes: breakMinutes,
    });
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "オファー送信に失敗しました");
      return;
    }

    toast.success("オファーを送信しました");
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>オファー送信</DialogTitle>
          <DialogDescription>
            申告内容をもとに対象トレーナーへオファーを送信します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offer-title">シフトタイトル</Label>
            <Input
              id="offer-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="通常シフト"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-date">勤務日</Label>
            <Input
              id="offer-date"
              type="date"
              value={shiftDate}
              onChange={(event) => setShiftDate(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="offer-start-time">開始時刻</Label>
              <Input
                id="offer-start-time"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-end-time">終了時刻</Label>
              <Input
                id="offer-end-time"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-break-minutes">休憩時間（分）</Label>
            <Input
              id="offer-break-minutes"
              type="number"
              min={0}
              value={breakMinutes}
              onChange={(event) => setBreakMinutes(Number(event.target.value))}
            />
          </div>

          <div className="rounded-md border p-3 text-sm space-y-1">
            <p>トレーナー: {trainer?.full_name ?? "-"}</p>
            <p>在籍年数: {trainer?.tenure_years ?? "-"}</p>
            <p>時給: 送信時に自動計算されます</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || invalidTime || !canSend}
          >
            {submitting ? "送信中..." : "送信する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StoreAvailabilityTable({
  availabilities,
  offers,
  storeId,
}: StoreAvailabilityTableProps) {
  const [selectedAvailability, setSelectedAvailability] =
    useState<ShiftAvailability | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openDialog = (availability: ShiftAvailability) => {
    setSelectedAvailability(availability);
    setDialogOpen(true);
  };

  const closeDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedAvailability(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">希望一覧</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {availabilities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8 px-4">
              申告はありません
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>トレーナー</TableHead>
                    <TableHead>ランク</TableHead>
                    <TableHead>希望日</TableHead>
                    <TableHead>時間帯</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="text-right">アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availabilities.map((availability) => {
                    const rank = availability.trainer?.rank;
                    const rankMeta = rank ? rankConfig[rank] : null;

                    return (
                      <TableRow key={availability.id}>
                        <TableCell className="font-medium">
                          {availability.trainer?.full_name ?? "-"}
                        </TableCell>
                        <TableCell>
                          {rankMeta ? (
                            <Badge className={rankMeta.color}>
                              {rankMeta.label}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{availability.available_date}</TableCell>
                        <TableCell>
                          {normalizeTime(availability.start_time)}〜
                          {normalizeTime(availability.end_time)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={availabilityStatusStyles[availability.status]}
                          >
                            {availabilityStatusLabels[availability.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {availability.status === "open" ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openDialog(availability)}
                            >
                              オファー
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold">送信済みオファー</h2>

        <Card>
          <CardContent className="p-0">
            {offers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 px-4">
                送信済みオファーはありません
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>トレーナー</TableHead>
                      <TableHead>タイトル</TableHead>
                      <TableHead>勤務日</TableHead>
                      <TableHead>時間帯</TableHead>
                      <TableHead>時給</TableHead>
                      <TableHead>ステータス</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>{offer.trainer?.full_name ?? "-"}</TableCell>
                        <TableCell className="font-medium">{offer.title}</TableCell>
                        <TableCell>{offer.shift_date}</TableCell>
                        <TableCell>
                          {normalizeTime(offer.start_time)}〜
                          {normalizeTime(offer.end_time)}
                        </TableCell>
                        <TableCell>
                          ¥{offer.offered_rate.toLocaleString()}/h
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={offerStatusStyles[offer.status]}
                          >
                            {offerStatusLabels[offer.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {selectedAvailability ? (
        <SendOfferDialog
          availability={selectedAvailability}
          storeId={storeId}
          open={dialogOpen}
          onOpenChange={closeDialog}
        />
      ) : null}
    </div>
  );
}
