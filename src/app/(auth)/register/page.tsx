"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const AREAS = [
  "北海道", "東北", "関東", "中部", "関西", "中国", "四国", "九州・沖縄",
];

const TIME_SLOTS = [
  { value: "morning", label: "午前 (9:00-12:00)" },
  { value: "afternoon", label: "午後 (12:00-17:00)" },
  { value: "evening", label: "夕方 (17:00-21:00)" },
  { value: "flexible", label: "フレキシブル" },
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    fullNameKana: "",
    phone: "",
    tenureYears: "",
    employmentStartDate: "",
    employmentEndDate: "",
    preferredArea: "",
    preferredTimeSlot: "",
    bio: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("ログインが必要です。");
        router.push("/login");
        return;
      }

      // Create profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        role: "trainer",
        display_name: formData.fullName,
      });

      if (profileError) {
        toast.error("プロフィールの作成に失敗しました。");
        return;
      }

      // Create alumni_trainer record
      const { error: trainerError } = await supabase
        .from("alumni_trainers")
        .insert({
          auth_user_id: user.id,
          email: user.email!,
          full_name: formData.fullName,
          full_name_kana: formData.fullNameKana || null,
          phone: formData.phone || null,
          tenure_years: parseFloat(formData.tenureYears) || 0,
          employment_start_date: formData.employmentStartDate || null,
          employment_end_date: formData.employmentEndDate || null,
          preferred_areas: formData.preferredArea
            ? [formData.preferredArea]
            : [],
          preferred_time_slots: formData.preferredTimeSlot
            ? [formData.preferredTimeSlot]
            : [],
          bio: formData.bio || null,
          status: "active",
        });

      if (trainerError) {
        toast.error("登録に失敗しました: " + trainerError.message);
        return;
      }

      toast.success("登録が完了しました！");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("予期しないエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Image
          src="/images/icon.svg"
          alt="Dr.stretch SPOT"
          width={40}
          height={40}
        />
        <div className="flex items-baseline gap-1">
          <span className="font-heading text-xl font-bold text-primary">
            Dr.stretch
          </span>
          <span className="font-heading text-xl font-extrabold text-[oklch(0.87_0.18_110)]">
            SPOT
          </span>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-xl">初回登録</CardTitle>
          <CardDescription>
            プロフィール情報を入力してください
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
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                placeholder="山田 太郎"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullNameKana">氏名（カナ）</Label>
              <Input
                id="fullNameKana"
                value={formData.fullNameKana}
                onChange={(e) =>
                  setFormData({ ...formData, fullNameKana: e.target.value })
                }
                placeholder="ヤマダ タロウ"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="090-1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenureYears">
                在籍年数 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tenureYears"
                type="number"
                step="0.5"
                min="0"
                value={formData.tenureYears}
                onChange={(e) =>
                  setFormData({ ...formData, tenureYears: e.target.value })
                }
                placeholder="3.5"
                required
              />
              <p className="text-xs text-muted-foreground">
                2年以上の在籍経験が応募条件です
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">入社日</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.employmentStartDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      employmentStartDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">退職日</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.employmentEndDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      employmentEndDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>希望エリア</Label>
              <Select
                value={formData.preferredArea}
                onValueChange={(value) =>
                  setFormData({ ...formData, preferredArea: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="エリアを選択" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>希望時間帯</Label>
              <Select
                value={formData.preferredTimeSlot}
                onValueChange={(value) =>
                  setFormData({ ...formData, preferredTimeSlot: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="時間帯を選択" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem key={slot.value} value={slot.value}>
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">自己紹介</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                placeholder="得意な施術や資格など"
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "登録中..." : "登録する"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
