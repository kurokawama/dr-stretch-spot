import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, Users, Zap, ArrowLeft } from "lucide-react";

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: shift } = await supabase
    .from("shift_requests")
    .select("*, store:stores(name, area, address)")
    .eq("id", id)
    .single();

  if (!shift) redirect("/shifts");

  const store = shift.store as unknown as { name: string; area: string; address: string } | null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/shifts">
          <ArrowLeft className="mr-1 h-4 w-4" />
          シフト検索に戻る
        </Link>
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">{shift.title}</h1>
          {shift.is_emergency && (
            <Badge variant="destructive" className="mt-1">
              <Zap className="mr-0.5 h-3 w-3" />
              緊急シフト
            </Badge>
          )}
        </div>
        <Badge variant={shift.status === "open" ? "default" : "secondary"}>
          {shift.status === "open" ? "募集中" : "締切"}
        </Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">シフト情報</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium">{store?.name}</p>
              <p className="text-xs text-muted-foreground">{store?.area} / {store?.address}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium">{shift.shift_date}</p>
              <p className="text-xs text-muted-foreground">
                {shift.start_time} 〜 {shift.end_time}
                {shift.break_minutes > 0 && ` （休憩${shift.break_minutes}分）`}
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <p>
              募集: {shift.required_count}名 / 確定: {shift.filled_count}名
              <span className="text-xs text-muted-foreground ml-2">
                （残り{Math.max(0, shift.required_count - shift.filled_count)}枠）
              </span>
            </p>
          </div>
          {shift.is_emergency && shift.emergency_bonus_amount > 0 && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-amber-600 font-medium">
                  緊急手当: +¥{shift.emergency_bonus_amount.toLocaleString()}
                </p>
              </div>
            </>
          )}
          {shift.description && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground">{shift.description}</p>
            </>
          )}
        </CardContent>
      </Card>

      {shift.status === "open" &&
        shift.filled_count < shift.required_count && (
          <Button className="w-full" size="lg" asChild>
            <Link href={`/shifts/${id}/apply`}>このシフトに応募する</Link>
          </Button>
        )}
    </div>
  );
}
