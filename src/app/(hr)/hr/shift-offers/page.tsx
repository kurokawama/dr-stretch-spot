"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { Send, Search, Users, Clock } from "lucide-react";
import {
  hrSearchTrainers,
  hrCreateOffer,
  getHrOffers,
  getActiveStores,
} from "@/actions/hr-offers";
import type {
  AlumniTrainer,
  ShiftOffer,
  Store,
  TrainerRank,
} from "@/types/database";

// =============================================
// Constants
// =============================================

const RANK_CONFIG: Record<TrainerRank, { label: string; style: string }> = {
  bronze: { label: "ブロンズ", style: "bg-orange-100 text-orange-800" },
  silver: { label: "シルバー", style: "bg-gray-100 text-gray-700" },
  gold: { label: "ゴールド", style: "bg-yellow-100 text-yellow-800" },
  platinum: { label: "プラチナ", style: "bg-purple-100 text-purple-800" },
};

const OFFER_STATUS_LABELS: Record<string, string> = {
  pending: "回答待ち",
  accepted: "承諾",
  declined: "辞退",
  expired: "期限切れ",
  cancelled: "キャンセル",
};

const OFFER_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-600",
  cancelled: "bg-gray-100 text-gray-600",
};

interface TrainerResult {
  trainer: AlumniTrainer;
  store_name: string;
  store_area: string;
  estimated_rate: number;
}

// =============================================
// Page Component
// =============================================

export default function HrShiftOffersPage() {
  const [activeTab, setActiveTab] = useState("search");
  const [trainers, setTrainers] = useState<TrainerResult[]>([]);
  const [offers, setOffers] = useState<ShiftOffer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);

  // Search filters
  const [areaFilter, setAreaFilter] = useState("");
  const [rankFilter, setRankFilter] = useState("");

  // Offer dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerResult | null>(null);
  const [offerForm, setOfferForm] = useState({
    store_id: "",
    title: "通常シフト",
    shift_date: "",
    start_time: "10:00",
    end_time: "19:00",
    break_minutes: 60,
  });
  const [submitting, setSubmitting] = useState(false);

  // Load stores on mount
  useEffect(() => {
    let cancelled = false;
    getActiveStores().then((result) => {
      if (!cancelled && result.success && result.data) {
        setStores(result.data);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Load offers when tab changes
  const offersLoadedRef = useRef(false);

  useEffect(() => {
    if (activeTab !== "sent" || offersLoadedRef.current) return;
    offersLoadedRef.current = true;
    let cancelled = false;
    getHrOffers().then((result) => {
      if (cancelled) return;
      if (result.success && result.data) {
        setOffers(result.data);
      }
    });
    return () => { cancelled = true; };
  }, [activeTab]);

  // Search trainers
  const handleSearch = async () => {
    setLoading(true);
    const result = await hrSearchTrainers({
      area: areaFilter || undefined,
      rank: rankFilter || undefined,
    });
    if (result.success && result.data) {
      setTrainers(result.data);
    } else {
      toast.error(result.error ?? "検索に失敗しました");
    }
    setLoading(false);
  };

  // Open offer dialog
  const openOfferDialog = (trainer: TrainerResult) => {
    setSelectedTrainer(trainer);
    // Default date to 2 weeks from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 14);
    setOfferForm({
      store_id: "",
      title: "通常シフト",
      shift_date: defaultDate.toISOString().split("T")[0],
      start_time: "10:00",
      end_time: "19:00",
      break_minutes: 60,
    });
    setDialogOpen(true);
  };

  // Submit offer
  const handleSubmitOffer = async () => {
    if (!selectedTrainer) return;
    if (!offerForm.store_id) {
      toast.error("店舗を選択してください");
      return;
    }
    if (!offerForm.shift_date) {
      toast.error("勤務日を入力してください");
      return;
    }
    if (offerForm.start_time >= offerForm.end_time) {
      toast.error("開始時刻と終了時刻を確認してください");
      return;
    }

    setSubmitting(true);
    const result = await hrCreateOffer({
      trainer_id: selectedTrainer.trainer.id,
      store_id: offerForm.store_id,
      title: offerForm.title.trim() || "通常シフト",
      shift_date: offerForm.shift_date,
      start_time: offerForm.start_time,
      end_time: offerForm.end_time,
      break_minutes: offerForm.break_minutes,
    });
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error ?? "オファー送信に失敗しました");
      return;
    }

    toast.success("オファーを送信しました");
    setDialogOpen(false);
    setSelectedTrainer(null);
    // Reload offers list
    offersLoadedRef.current = false;
    getHrOffers().then((result) => {
      if (result.success && result.data) {
        setOffers(result.data);
      }
    });
  };

  // Get unique areas from stores
  const areas = [...new Set(stores.map((s) => s.area))].sort();

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">シフトオファー</h1>
        <p className="text-sm text-muted-foreground">
          トレーナーを検索し、シフトオファーを直接送信できます
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="search" className="gap-1.5">
            <Search className="h-3.5 w-3.5" />
            トレーナー検索
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            送信済み
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">検索条件</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">エリア</Label>
                  <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="全エリア" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全エリア</SelectItem>
                      {areas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">ランク</Label>
                  <Select value={rankFilter} onValueChange={setRankFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="全ランク" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全ランク</SelectItem>
                      {Object.entries(RANK_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSearch} disabled={loading} size="sm">
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  検索
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  トレーナー一覧
                </CardTitle>
                {trainers.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {trainers.length}名
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  検索中...
                </p>
              ) : trainers.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    条件を設定して検索してください
                  </p>
                </div>
              ) : (
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名前</TableHead>
                        <TableHead>ランク</TableHead>
                        <TableHead>在籍年数</TableHead>
                        <TableHead>希望エリア</TableHead>
                        <TableHead>ブランク</TableHead>
                        <TableHead>推定時給</TableHead>
                        <TableHead className="text-right">アクション</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainers.map((item) => {
                        const rank = item.trainer.rank;
                        const rankMeta = RANK_CONFIG[rank];

                        return (
                          <TableRow key={item.trainer.id}>
                            <TableCell className="font-medium">
                              {item.trainer.full_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={rankMeta?.style ?? ""}
                              >
                                {rankMeta?.label ?? rank}
                              </Badge>
                            </TableCell>
                            <TableCell>{item.trainer.tenure_years}年</TableCell>
                            <TableCell>
                              {item.trainer.preferred_areas.length > 0
                                ? item.trainer.preferred_areas.join(", ")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  item.trainer.blank_status === "ok"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-amber-50 text-amber-700"
                                }
                              >
                                {item.trainer.blank_status === "ok"
                                  ? "OK"
                                  : item.trainer.blank_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.estimated_rate > 0
                                ? `¥${item.estimated_rate.toLocaleString()}/h`
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openOfferDialog(item)}
                              >
                                <Send className="h-3.5 w-3.5 mr-1" />
                                オファー
                              </Button>
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
        </TabsContent>

        {/* Sent Offers Tab */}
        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  送信済みオファー
                </CardTitle>
                {offers.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {offers.length}件
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  読み込み中...
                </p>
              ) : offers.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Send className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    送信済みオファーはありません
                  </p>
                </div>
              ) : (
                <div className="border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>トレーナー</TableHead>
                        <TableHead>店舗</TableHead>
                        <TableHead>タイトル</TableHead>
                        <TableHead>勤務日</TableHead>
                        <TableHead>時間帯</TableHead>
                        <TableHead>時給</TableHead>
                        <TableHead>ステータス</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offers.map((offer) => {
                        const trainerData = offer.trainer as
                          | { full_name: string; tenure_years: number; rank: string }
                          | undefined;
                        const storeData = offer.store as
                          | { name: string; area: string }
                          | undefined;

                        return (
                          <TableRow key={offer.id}>
                            <TableCell className="font-medium">
                              {trainerData?.full_name ?? "-"}
                            </TableCell>
                            <TableCell>
                              {storeData
                                ? `${storeData.name}（${storeData.area}）`
                                : "-"}
                            </TableCell>
                            <TableCell>{offer.title}</TableCell>
                            <TableCell>{offer.shift_date}</TableCell>
                            <TableCell>
                              {offer.start_time?.slice(0, 5)}〜
                              {offer.end_time?.slice(0, 5)}
                            </TableCell>
                            <TableCell>
                              ¥{offer.offered_rate.toLocaleString()}/h
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  OFFER_STATUS_STYLES[offer.status] ?? ""
                                }
                              >
                                {OFFER_STATUS_LABELS[offer.status] ??
                                  offer.status}
                              </Badge>
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
        </TabsContent>
      </Tabs>

      {/* Offer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>シフトオファー送信</DialogTitle>
            <DialogDescription>
              {selectedTrainer?.trainer.full_name} へオファーを送信します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="hr-offer-store">配属店舗</Label>
              <Select
                value={offerForm.store_id}
                onValueChange={(value) =>
                  setOfferForm((prev) => ({ ...prev, store_id: value }))
                }
              >
                <SelectTrigger id="hr-offer-store">
                  <SelectValue placeholder="店舗を選択" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}（{store.area}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hr-offer-title">シフトタイトル</Label>
              <Input
                id="hr-offer-title"
                value={offerForm.title}
                onChange={(e) =>
                  setOfferForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="通常シフト"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hr-offer-date">勤務日</Label>
              <Input
                id="hr-offer-date"
                type="date"
                value={offerForm.shift_date}
                onChange={(e) =>
                  setOfferForm((prev) => ({
                    ...prev,
                    shift_date: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="hr-offer-start">開始時刻</Label>
                <Input
                  id="hr-offer-start"
                  type="time"
                  value={offerForm.start_time}
                  onChange={(e) =>
                    setOfferForm((prev) => ({
                      ...prev,
                      start_time: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hr-offer-end">終了時刻</Label>
                <Input
                  id="hr-offer-end"
                  type="time"
                  value={offerForm.end_time}
                  onChange={(e) =>
                    setOfferForm((prev) => ({
                      ...prev,
                      end_time: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hr-offer-break">休憩時間（分）</Label>
              <Input
                id="hr-offer-break"
                type="number"
                min={0}
                value={offerForm.break_minutes}
                onChange={(e) =>
                  setOfferForm((prev) => ({
                    ...prev,
                    break_minutes: Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="rounded-sm border p-3 text-sm space-y-1 bg-muted/30">
              <p>
                トレーナー: {selectedTrainer?.trainer.full_name ?? "-"}
              </p>
              <p>
                ランク:{" "}
                {selectedTrainer?.trainer.rank
                  ? RANK_CONFIG[selectedTrainer.trainer.rank]?.label
                  : "-"}
              </p>
              <p>在籍年数: {selectedTrainer?.trainer.tenure_years ?? "-"}年</p>
              <p className="text-muted-foreground">
                時給は送信時に自動計算されます
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmitOffer}
              disabled={submitting}
            >
              {submitting ? "送信中..." : "オファー送信"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
