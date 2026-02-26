"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

type Step = "email" | "otp";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        // Rate limit (429) - still show OTP input so user can use a previously sent code
        if (error.message?.includes("rate") || error.message?.includes("limit") || error.status === 429) {
          toast.warning("メール送信の制限に達しました。前回送信されたコードをお試しください。");
          setStep("otp");
          return;
        }
        toast.error(error.message || "エラーが発生しました。もう一度お試しください。");
        return;
      }

      toast.success("認証コードを送信しました。メールをご確認ください。");
      setStep("otp");
    } catch {
      toast.error("予期しないエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    try {
      // Try email type first, then magiclink as fallback
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otp.trim(),
        type: "email",
      });

      if (error) {
        const { error: mlError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otp.trim(),
          type: "magiclink",
        });

        if (mlError) {
          toast.error("認証コードが正しくありません。もう一度お試しください。");
          return;
        }
      }

      // Successful login - redirect will be handled by middleware
      window.location.href = "/";
    } catch {
      toast.error("予期しないエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background px-4">
      <div className="mb-8 flex items-center gap-2">
        <Image
          src="/images/icon.svg"
          alt="Dr.stretch SPOT"
          width={48}
          height={48}
        />
        <div className="flex items-baseline gap-1">
          <span className="font-heading text-2xl font-bold text-primary">
            Dr.stretch
          </span>
          <span className="font-heading text-2xl font-extrabold text-[oklch(0.87_0.18_110)]">
            SPOT
          </span>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-xl">
            {step === "email" ? "ログイン" : "認証コード入力"}
          </CardTitle>
          <CardDescription>
            {step === "email"
              ? "登録済みのメールアドレスを入力してください"
              : `${email} に送信された認証コードを入力してください`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@drstretch.co.jp"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "送信中..." : "認証コードを送信"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">認証コード</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="12345678"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={8}
                  required
                  autoFocus
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "確認中..." : "ログイン"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                }}
              >
                メールアドレスを変更
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Dr.ストレッチ認定トレーナー副業マッチングプラットフォーム
      </p>
    </div>
  );
}
