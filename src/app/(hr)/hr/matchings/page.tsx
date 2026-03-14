"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getAllMatchings, hrCancelMatching } from "@/actions/matching";
import type { ShiftApplication } from "@/types/database";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "承認待ち",
  approved: "確定",
  rejected: "却下",
  cancelled: "キャンセル",
  completed: "完了",
  no_show: "欠勤",
};

const PAGE_SIZE = 10;

type SortKey = "trainer" | "store" | "date" | "rate" | "status";
type SortDirection = "asc" | "desc";

export default function MatchingsPage() {
  const [matchings, setMatchings] = useState<ShiftApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const [cancelDialog, setCancelDialog] = useState<{
    open: boolean;
    applicationId: string;
    trainerName: string;
  }>({ open: false, applicationId: "", trainerName: "" });
  const [cancelReason, setCancelReason] = useState("");

  const fetchMatchings = useCallback(async () => {
    setLoading(true);
    const filters: { status?: string } = {};
    if (statusFilter !== "all") filters.status = statusFilter;
    const result = await getAllMatchings(filters);
    if (result.success) {
      setMatchings(result.data ?? []);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMatchings();
  }, [fetchMatchings]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [statusFilter, areaFilter, searchText]);

  const areaOptions = useMemo(() => {
    return Array.from(
      new Set(
        matchings
          .map((m) => m.shift_request?.store?.area)
          .filter((area): area is string => Boolean(area))
      )
    );
  }, [matchings]);

  const filteredAndSortedMatchings = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    const filtered = matchings.filter((matching) => {
      const area = matching.shift_request?.store?.area ?? "";
      const trainer = matching.trainer?.full_name ?? "";
      const store = matching.shift_request?.store?.name ?? "";
      const title = matching.shift_request?.title ?? "";
      const isAreaMatched = areaFilter === "all" || area === areaFilter;
      const isKeywordMatched =
        keyword.length === 0 ||
        trainer.toLowerCase().includes(keyword) ||
        store.toLowerCase().includes(keyword) ||
        title.toLowerCase().includes(keyword);
      return isAreaMatched && isKeywordMatched;
    });

    const sorted = [...filtered].sort((a, b) => {
      const trainerA = a.trainer?.full_name ?? "";
      const trainerB = b.trainer?.full_name ?? "";
      const storeA = a.shift_request?.store?.name ?? "";
      const storeB = b.shift_request?.store?.name ?? "";
      const dateA = a.shift_request?.shift_date ?? "";
      const dateB = b.shift_request?.shift_date ?? "";
      const rateA = a.confirmed_rate ?? 0;
      const rateB = b.confirmed_rate ?? 0;
      const statusA = STATUS_LABELS[a.status] ?? a.status;
      const statusB = STATUS_LABELS[b.status] ?? b.status;

      const sortValue = (() => {
        if (sortKey === "trainer") return trainerA.localeCompare(trainerB, "ja");
        if (sortKey === "store") return storeA.localeCompare(storeB, "ja");
        if (sortKey === "date") return dateA.localeCompare(dateB, "ja");
        if (sortKey === "rate") return rateA - rateB;
        return statusA.localeCompare(statusB, "ja");
      })();

      return sortDirection === "asc" ? sortValue : -sortValue;
    });

    return sorted;
  }, [matchings, areaFilter, searchText, sortKey, sortDirection]);

  const totalCount = filteredAndSortedMatchings.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedMatchings = filteredAndSortedMatchings.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, totalCount);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const getStatusClass = (status: string) => {
    if (status === "approved") return "bg-green-100 text-green-800";
    if (status === "pending") return "bg-yellow-100 text-yellow-800";
    if (status === "cancelled" || status === "rejected" || status === "no_show") {
      return "bg-red-100 text-red-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("キャンセル理由を入力してください");
      return;
    }
    const result = await hrCancelMatching(
      cancelDialog.applicationId,
      cancelReason
    );
    if (result.success) {
      toast.success("マッチングをキャンセルしました");
      setCancelDialog({ open: false, applicationId: "", trainerName: "" });
      setCancelReason("");
      fetchMatchings();
    } else {
      toast.error(result.error ?? "エラーが発生しました");
    }
  };

  return (
    <div className="animate-fade-in-up space-y-6 bg-background p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">マッチング管理</h1>
        <p className="text-muted-foreground">
          全マッチングの確認・キャンセル・人員管理
        </p>
      </div>

      {/* Filters */}
      <Card className="rounded-lg border bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[180px_180px_1fr]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 rounded-xl border border-input">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="approved">確定</SelectItem>
                <SelectItem value="pending">承認待ち</SelectItem>
                <SelectItem value="completed">完了</SelectItem>
                <SelectItem value="cancelled">キャンセル</SelectItem>
                <SelectItem value="no_show">欠勤</SelectItem>
              </SelectContent>
            </Select>

            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="h-10 rounded-xl border border-input">
                <SelectValue placeholder="エリア" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                {areaOptions.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="検索"
                className="h-10 rounded-xl pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matchings table */}
      <Card className="rounded-lg border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-base font-semibold">
            マッチング一覧（{totalCount}件）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : totalCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              該当するマッチングはありません
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={() => toggleSort("trainer")}
                        >
                          トレーナー
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={() => toggleSort("store")}
                        >
                          店舗
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead>シフト</TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={() => toggleSort("date")}
                        >
                          日付
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead>時間</TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={() => toggleSort("rate")}
                        >
                          時給
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={() => toggleSort("status")}
                        >
                          ステータス
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead>前日確認</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedMatchings.map((m, index) => (
                      <TableRow
                        key={m.id}
                        className={`hover:bg-muted/50 ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                      >
                        <TableCell className="font-medium">
                          {m.trainer?.full_name ?? "—"}
                        </TableCell>
                        <TableCell>
                          {m.shift_request?.store?.name ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-40 truncate">
                          {m.shift_request?.title ?? "—"}
                        </TableCell>
                        <TableCell>
                          {m.shift_request?.shift_date ?? "—"}
                        </TableCell>
                        <TableCell>
                          {m.shift_request?.start_time?.slice(0, 5) ?? "—"}〜
                          {m.shift_request?.end_time?.slice(0, 5) ?? "—"}
                        </TableCell>
                        <TableCell>{m.confirmed_rate != null ? `¥${m.confirmed_rate.toLocaleString()}` : "—"}</TableCell>
                        <TableCell>
                          <Badge
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(m.status)}`}
                          >
                            {STATUS_LABELS[m.status] ?? m.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {m.status === "approved" ? (
                            m.pre_day_confirmed ? (
                              <Badge className="rounded-full bg-green-100 text-green-800">
                                確認済
                              </Badge>
                            ) : (
                              <Badge className="rounded-full bg-yellow-100 text-yellow-800">
                                未確認
                              </Badge>
                            )
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          {(m.status === "approved" || m.status === "pending") && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="rounded-xl"
                              onClick={() =>
                                setCancelDialog({
                                  open: true,
                                  applicationId: m.id,
                                  trainerName: m.trainer?.full_name ?? "",
                                })
                              }
                            >
                              キャンセル
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>
                  {pageStart}-{pageEnd} / {totalCount}件
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl px-2"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-2 text-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-xl px-2"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cancel dialog */}
      <Dialog
        open={cancelDialog.open}
        onOpenChange={(open) =>
          setCancelDialog({ ...cancelDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>マッチングをキャンセル</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {cancelDialog.trainerName} のマッチングをキャンセルします。
            </p>
            <div>
              <label className="text-sm font-medium">キャンセル理由</label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="キャンセル理由を入力..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCancelDialog({
                  open: false,
                  applicationId: "",
                  trainerName: "",
                })
              }
            >
              戻る
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              キャンセル実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
