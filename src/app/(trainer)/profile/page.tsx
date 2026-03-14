"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, Link2Off, ExternalLink, Pause, Play } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { updateSpotStatus } from "@/actions/resignation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getLineStatus, generateLinkToken, unlinkLineAccount } from "@/actions/line";

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
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const [lineLinked, setLineLinked] = useState(false);
  const [lineLinkedAt, setLineLinkedAt] = useState<string | null>(null);
  const [linkingLine, setLinkingLine] = useState(false);
  const [unlinkingLine, setUnlinkingLine] = useState(false);
  const [spotStatus, setSpotStatus] = useState<string>("active");
  const [togglingSpot, setTogglingSpot] = useState(false);

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
        setTrainerId(data.id);
        setSpotStatus(data.spot_status || "active");
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
      // Load LINE status
      const lineResult = await getLineStatus();
      if (lineResult.success && lineResult.data) {
        setLineLinked(lineResult.data.linked);
        setLineLinkedAt(lineResult.data.linked_at);
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLinkLine = async () => {
    if (!trainerId) return;
    setLinkingLine(true);
    const result = await generateLinkToken(trainerId);
    setLinkingLine(false);
    if (!result.success || !result.data) {
      toast.error(result.error ?? "トークン生成に失敗しました");
      return;
    }
    // Open LINE friend add with pre-filled message containing the token
    const lineUrl = `https://line.me/R/oaMessage/@269knmbd/?${encodeURIComponent(result.data.token)}`;
    window.open(lineUrl, "_blank");
    toast.success("LINEアプリが開きます。表示されたメッセージを送信してください。");
  };

  const handleUnlinkLine = async () => {
    setUnlinkingLine(true);
    const result = await unlinkLineAccount();
    setUnlinkingLine(false);
    if (result.success) {
      setLineLinked(false);
      setLineLinkedAt(null);
      toast.success("LINE連携を解除しました");
    } else {
      toast.error(result.error ?? "解除に失敗しました");
    }
  };

  if (loading) return <div className="animate-fade-in-up p-6 text-center text-muted-foreground">読み込み中...</div>;

  return (
    <div className="animate-fade-in-up p-4 md:p-6 space-y-6 max-w-lg">
      <h1 className="font-heading text-2xl font-bold">プロフィール</h1>

      <Card className="rounded-xl border bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading font-semibold text-base flex items-center gap-2">
              {spotStatus === "active" ? (
                <Play className="h-4 w-4 text-green-600" />
              ) : (
                <Pause className="h-4 w-4 text-amber-600" />
              )}
              SPOTワーク受付
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {spotStatus === "active" ? "受付中" : "休止中"}
              </span>
              <Switch
                checked={spotStatus === "active"}
                disabled={togglingSpot}
                onCheckedChange={async (checked) => {
                  setTogglingSpot(true);
                  const newStatus = checked ? "active" : "paused";
                  const result = await updateSpotStatus(newStatus as "active" | "paused");
                  if (result.success) {
                    setSpotStatus(newStatus);
                    toast.success(checked ? "SPOTワーク受付を再開しました" : "SPOTワーク受付を休止しました");
                  } else {
                    toast.error("変更に失敗しました");
                  }
                  setTogglingSpot(false);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {spotStatus === "active"
              ? "オファーを受け取り、シフトに応募できます。"
              : "休止中はオファーが届かず、シフト検索にも表示されません。いつでも再開できます。"}
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-xl border bg-card shadow-sm">
        <CardHeader><CardTitle className="font-heading font-semibold text-base">基本情報</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>氏名</Label>
            <Input className="rounded-xl" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>氏名（カナ）</Label>
            <Input className="rounded-xl" value={form.full_name_kana} onChange={(e) => setForm({ ...form, full_name_kana: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>電話番号</Label>
            <Input className="rounded-xl" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>在籍年数</Label>
            <Input type="number" value={form.tenure_years} disabled className="rounded-xl bg-muted" />
            <p className="text-xs text-muted-foreground">※ 変更は人事部にお問い合わせください</p>
          </div>
          <div className="space-y-2">
            <Label>希望エリア</Label>
            <Select value={form.preferred_area} onValueChange={(v) => setForm({ ...form, preferred_area: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="選択" /></SelectTrigger>
              <SelectContent>{AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>自己紹介</Label>
            <Textarea className="rounded-xl" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border bg-card shadow-sm">
        <CardHeader><CardTitle className="font-heading font-semibold text-base">振込先情報</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>銀行名</Label>
              <Input className="rounded-xl" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>支店名</Label>
              <Input className="rounded-xl" value={form.bank_branch} onChange={(e) => setForm({ ...form, bank_branch: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>口座番号</Label>
              <Input className="rounded-xl" value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>口座名義</Label>
              <Input className="rounded-xl" value={form.bank_account_holder} onChange={(e) => setForm({ ...form, bank_account_holder: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading font-semibold text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#06C755]" />
              LINE連携
            </CardTitle>
            {lineLinked ? (
              <Badge variant="outline" className="text-[#06C755] border-[#06C755]">連携済み</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">未連携</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lineLinked ? (
            <>
              <p className="text-sm text-muted-foreground">
                LINEアカウントが連携されています。シフト確定やオファーの通知をLINEで受け取れます。
              </p>
              {lineLinkedAt && (
                <p className="text-xs text-muted-foreground">
                  連携日: {new Date(lineLinkedAt).toLocaleDateString("ja-JP")}
                </p>
              )}
              <Button
                variant="outline"
                className="w-full rounded-xl text-destructive border-destructive hover:bg-destructive/10"
                onClick={handleUnlinkLine}
                disabled={unlinkingLine}
              >
                {unlinkingLine ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />解除中...</>
                ) : (
                  <><Link2Off className="mr-2 h-4 w-4" />連携を解除</>
                )}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                LINEを連携すると、シフト確定やオファーの通知をLINEで受け取れます。
              </p>
              <Button
                className="w-full rounded-xl bg-[#06C755] hover:bg-[#06C755]/90 text-white"
                onClick={handleLinkLine}
                disabled={linkingLine}
              >
                {linkingLine ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />準備中...</>
                ) : (
                  <><ExternalLink className="mr-2 h-4 w-4" />LINEで連携する</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Button className="w-full rounded-xl bg-primary text-primary-foreground" onClick={handleSave} disabled={saving}>
        {saving ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中...</>
        ) : "変更を保存"}
      </Button>
    </div>
  );
}
