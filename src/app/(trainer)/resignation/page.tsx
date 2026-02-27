"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { submitResignation, getMyResignation } from "@/actions/resignation";
import { FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ResignationReason } from "@/types/database";

const RESIGNATION_REASONS: { value: ResignationReason; label: string }[] = [
  { value: "career_change", label: "キャリアチェンジ" },
  { value: "family", label: "家庭の事情" },
  { value: "health", label: "体調・健康上の理由" },
  { value: "independence", label: "独立・開業" },
  { value: "relocation", label: "転居" },
  { value: "other", label: "その他" },
];

export default function ResignationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    fullNameKana: "",
    employeeNumber: "",
    phone: "",
    employmentStartDate: "",
    desiredResignationDate: "",
    lastWorkingDate: "",
    resignationReason: "" as ResignationReason | "",
    resignationReasonDetail: "",
  });

  useEffect(() => {
    getMyResignation().then((data) => {
      if (data && data.status !== "cancelled") {
        setAlreadySubmitted(true);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.desiredResignationDate) {
      toast.error("必須項目を入力してください。");
      return;
    }
    setLoading(true);
    try {
      const result = await submitResignation({
        fullName: formData.fullName,
        fullNameKana: formData.fullNameKana || undefined,
        employeeNumber: formData.employeeNumber || undefined,
        phone: formData.phone || undefined,
        employmentStartDate: formData.employmentStartDate
          ? `${formData.employmentStartDate}-01`
          : undefined,
        desiredResignationDate: formData.desiredResignationDate,
        lastWorkingDate: formData.lastWorkingDate || undefined,
        resignationReason: (formData.resignationReason as ResignationReason) || undefined,
        resignationReasonDetail: formData.resignationReasonDetail || undefined,
      });

      if (result.success) {
        toast.success("退職意向を提出しました。人事部で確認いたします。");
        router.push("/home");
        router.refresh();
      } else {
        toast.error(result.error ?? "提出に失敗しました。");
      }
    } catch {
      toast.error("予期しないエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  if (alreadySubmitted) {
    return (
      <div className="p-4 md:p-6">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/home"><ArrowLeft className="h-4 w-4 mr-1" />ホームに戻る</Link>
        </Button>
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="font-medium">退職意向は既に提出済みです</p>
            <p className="text-sm text-muted-foreground">
              ホーム画面で手続き状況をご確認ください。
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href="/home"><ArrowLeft className="h-4 w-4 mr-1" />ホームに戻る</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            退職のご連絡
          </CardTitle>
          <CardDescription>
            以下のフォームに必要事項を入力してください。
            これは正式な退職届ではなく、退職意向の事前登録です。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">
                氏名 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="山田 太郎"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullNameKana">氏名（カナ）</Label>
              <Input
                id="fullNameKana"
                value={formData.fullNameKana}
                onChange={(e) => setFormData({ ...formData, fullNameKana: e.target.value })}
                placeholder="ヤマダ タロウ"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="employeeNumber">社員番号</Label>
                <Input
                  id="employeeNumber"
                  value={formData.employeeNumber}
                  onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                  placeholder="EMP-0001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="090-1234-5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">入社年月</Label>
              <Input
                id="startDate"
                type="month"
                value={formData.employmentStartDate}
                onChange={(e) => setFormData({ ...formData, employmentStartDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="resignDate">
                  退職希望日 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="resignDate"
                  type="date"
                  value={formData.desiredResignationDate}
                  onChange={(e) => setFormData({ ...formData, desiredResignationDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastDay">最終出勤予定日</Label>
                <Input
                  id="lastDay"
                  type="date"
                  value={formData.lastWorkingDate}
                  onChange={(e) => setFormData({ ...formData, lastWorkingDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>退職理由</Label>
              <Select
                value={formData.resignationReason}
                onValueChange={(value) =>
                  setFormData({ ...formData, resignationReason: value as ResignationReason })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {RESIGNATION_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="detail">退職理由（詳細）</Label>
              <Textarea
                id="detail"
                value={formData.resignationReasonDetail}
                onChange={(e) => setFormData({ ...formData, resignationReasonDetail: e.target.value })}
                placeholder="任意で詳細をご記入ください"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                ※ この情報は人事部のみが確認します。SPOT登録には引き継がれません。
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "送信中..." : "退職意向を提出する"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
