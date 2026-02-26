"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

const AREAS = [
  "北海道", "東北", "関東", "中部", "関西", "中国", "四国", "九州・沖縄",
];

export default function ProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", full_name_kana: "", phone: "", bio: "",
    preferred_area: "", preferred_time_slot: "",
    bank_name: "", bank_branch: "", bank_account_number: "", bank_account_holder: "",
    tenure_years: 0,
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("alumni_trainers")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();
      if (data) {
        setForm({
          full_name: data.full_name || "",
          full_name_kana: data.full_name_kana || "",
          phone: data.phone || "",
          bio: data.bio || "",
          preferred_area: data.preferred_areas?.[0] || "",
          preferred_time_slot: data.preferred_time_slots?.[0] || "",
          bank_name: data.bank_name || "",
          bank_branch: data.bank_branch || "",
          bank_account_number: data.bank_account_number || "",
          bank_account_holder: data.bank_account_holder || "",
          tenure_years: data.tenure_years,
        });
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from("alumni_trainers")
      .update({
        full_name: form.full_name,
        full_name_kana: form.full_name_kana || null,
        phone: form.phone || null,
        bio: form.bio || null,
        preferred_areas: form.preferred_area ? [form.preferred_area] : [],
        preferred_time_slots: form.preferred_time_slot ? [form.preferred_time_slot] : [],
        bank_name: form.bank_name || null,
        bank_branch: form.bank_branch || null,
        bank_account_number: form.bank_account_number || null,
        bank_account_holder: form.bank_account_holder || null,
      })
      .eq("auth_user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error("保存に失敗しました");
    } else {
      toast.success("プロフィールを更新しました");
    }
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-lg">
      <h1 className="font-heading text-2xl font-bold">プロフィール</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">基本情報</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>氏名</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>氏名（カナ）</Label>
            <Input value={form.full_name_kana} onChange={(e) => setForm({ ...form, full_name_kana: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>電話番号</Label>
            <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>在籍年数</Label>
            <Input type="number" value={form.tenure_years} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">※ 変更は人事部にお問い合わせください</p>
          </div>
          <div className="space-y-2">
            <Label>希望エリア</Label>
            <Select value={form.preferred_area} onValueChange={(v) => setForm({ ...form, preferred_area: v })}>
              <SelectTrigger><SelectValue placeholder="選択" /></SelectTrigger>
              <SelectContent>{AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>自己紹介</Label>
            <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">振込先情報</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>銀行名</Label>
              <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>支店名</Label>
              <Input value={form.bank_branch} onChange={(e) => setForm({ ...form, bank_branch: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>口座番号</Label>
              <Input value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>口座名義</Label>
              <Input value={form.bank_account_holder} onChange={(e) => setForm({ ...form, bank_account_holder: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? "保存中..." : "保存する"}
      </Button>
    </div>
  );
}
