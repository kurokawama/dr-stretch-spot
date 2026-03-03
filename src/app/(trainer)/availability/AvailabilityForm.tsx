"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitAvailability, cancelAvailability } from "@/actions/availability";
import { respondToOffer } from "@/actions/offers";
import type { ShiftAvailability, ShiftOffer } from "@/types/database";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface StoreOption {
  id: string;
  name: string;
  area: string;
}

interface AvailabilityFormProps {
  stores: StoreOption[];
}

interface TrainerOffersSectionProps {
  offers: ShiftOffer[];
}

interface AvailabilityListSectionProps {
  availabilities: ShiftAvailability[];
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

function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0] ?? "";
}

function normalizeTime(time: string): string {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

export function AvailabilityForm({ stores }: AvailabilityFormProps) {
  const router = useRouter();
  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [availableDate, setAvailableDate] = useState(getTomorrowDate);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const minDate = useMemo(() => getTomorrowDate(), []);

  const storesByArea = useMemo(() => {
    return stores.reduce<Record<string, StoreOption[]>>((acc, store) => {
      if (!acc[store.area]) {
        acc[store.area] = [];
      }
      acc[store.area].push(store);
      return acc;
    }, {});
  }, [stores]);

  const orderedAreas = useMemo(() => {
    return Object.keys(storesByArea).sort((a, b) => a.localeCompare(b, "ja"));
  }, [storesByArea]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!storeId || !availableDate || !startTime || !endTime) {
      toast.error("入力内容を確認してください");
      return;
    }
    if (startTime >= endTime) {
      toast.error("開始時刻と終了時刻を確認してください");
      return;
    }

    setSubmitting(true);
    const result = await submitAvailability({
      store_id: storeId,
      available_date: availableDate,
      start_time: startTime,
      end_time: endTime,
      note: note.trim() ? note.trim() : undefined,
    });
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "申告に失敗しました");
      return;
    }

    toast.success("申告しました");
    setAvailableDate(getTomorrowDate());
    setStartTime("09:00");
    setEndTime("18:00");
    setNote("");
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">シフト希望申告</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-select">店舗</Label>
            <Select value={storeId} onValueChange={setStoreId}>
              <SelectTrigger id="store-select" className="w-full">
                <SelectValue placeholder="店舗を選択" />
              </SelectTrigger>
              <SelectContent>
                {orderedAreas.map((area) => (
                  <SelectGroup key={area}>
                    <SelectLabel>{area}</SelectLabel>
                    {storesByArea[area]?.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="available-date">希望日</Label>
            <Input
              id="available-date"
              type="date"
              min={minDate}
              value={availableDate}
              onChange={(event) => setAvailableDate(event.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-time">開始時刻</Label>
              <Input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">終了時刻</Label>
              <Input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">メモ（任意）</Label>
            <Textarea
              id="note"
              value={note}
              placeholder="希望事項など"
              onChange={(event) => setNote(event.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "申告中..." : "申告する"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function TrainerOffersSection({ offers }: TrainerOffersSectionProps) {
  const router = useRouter();
  const [processingOfferId, setProcessingOfferId] = useState<string | null>(null);
  const pendingOffers = useMemo(
    () => offers.filter((offer) => offer.status === "pending"),
    [offers]
  );

  const handleRespond = async (offerId: string, accept: boolean) => {
    setProcessingOfferId(offerId);
    const result = await respondToOffer(offerId, accept);
    setProcessingOfferId(null);

    if (!result.success) {
      toast.error(result.error ?? "オファーへの回答に失敗しました");
      return;
    }

    toast.success(accept ? "オファーを承諾しました" : "オファーを辞退しました");
    router.refresh();
  };

  if (pendingOffers.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground text-center">
          受信中のオファーはありません
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {pendingOffers.map((offer) => (
        <Card key={offer.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">{offer.title}</p>
                <p className="text-sm text-muted-foreground">
                  {offer.store?.name ?? "-"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {offer.shift_date} {normalizeTime(offer.start_time)}〜
                  {normalizeTime(offer.end_time)}
                </p>
                <p className="text-sm font-semibold">
                  ¥{offer.offered_rate.toLocaleString()}/h
                </p>
              </div>
              <Badge
                variant="outline"
                className={offerStatusStyles[offer.status]}
              >
                {offerStatusLabels[offer.status]}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                className="bg-accent text-black hover:bg-accent/90"
                onClick={() => handleRespond(offer.id, true)}
                disabled={processingOfferId === offer.id}
              >
                承諾
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleRespond(offer.id, false)}
                disabled={processingOfferId === offer.id}
              >
                辞退
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AvailabilityListSection({
  availabilities,
}: AvailabilityListSectionProps) {
  const router = useRouter();
  const [processingAvailabilityId, setProcessingAvailabilityId] = useState<
    string | null
  >(null);

  const handleCancel = async (availabilityId: string) => {
    setProcessingAvailabilityId(availabilityId);
    const result = await cancelAvailability(availabilityId);
    setProcessingAvailabilityId(null);

    if (!result.success) {
      toast.error(result.error ?? "キャンセルに失敗しました");
      return;
    }

    toast.success("キャンセルしました");
    router.refresh();
  };

  if (availabilities.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground text-center">
          申告はありません
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {availabilities.map((availability) => (
        <Card key={availability.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">{availability.store?.name ?? "-"}</p>
                <p className="text-sm text-muted-foreground">
                  {availability.available_date}{" "}
                  {normalizeTime(availability.start_time)}〜
                  {normalizeTime(availability.end_time)}
                </p>
                {availability.note ? (
                  <p className="text-sm text-muted-foreground">
                    {availability.note}
                  </p>
                ) : null}
              </div>
              <Badge
                variant="outline"
                className={availabilityStatusStyles[availability.status]}
              >
                {availabilityStatusLabels[availability.status]}
              </Badge>
            </div>

            {availability.status === "open" ? (
              <Button
                type="button"
                variant="outline"
                className="w-full border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleCancel(availability.id)}
                disabled={processingAvailabilityId === availability.id}
              >
                キャンセル
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
