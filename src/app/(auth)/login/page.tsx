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
import { ArrowLeft, Mail, KeyRound } from "lucide-react";

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
    <div className="flex min-h-screen flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-[oklch(0.87_0.18_110)]/5" />
      <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-[oklch(0.87_0.18_110)]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

      {/* Logo */}
      <div className="relative mb-10 flex flex-col items-center gap-3 animate-fade-in-up">
        <Image
          src="/images/icon.svg"
          alt="Dr.stretch SPOT"
          width={56}
          height={56}
          className="drop-shadow-md"
        />
        <div className="flex items-baseline gap-1">
          <span className="font-heading text-3xl font-bold text-primary">
            Dr.stretch
          </span>
          <span className="font-heading text-3xl font-extrabold text-[oklch(0.87_0.18_110)]">
            SPOT
          </span>
        </div>
      </div>

      {/* Login Card */}
      <Card className="relative w-full max-w-sm border-0 shadow-xl animate-scale-in">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-2 rounded-full bg-primary/10 p-3 w-fit">
            {step === "email" ? (
              <Mail className="h-5 w-5 text-primary" />
            ) : (
              <KeyRound className="h-5 w-5 text-primary" />
            )}
          </div>
          <CardTitle className="font-heading text-xl">
            {step === "email" ? "ログイン" : "認証コード入力"}
          </CardTitle>
          <CardDescription className="leading-relaxed">
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
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    送信中...
                  </span>
                ) : (
                  "認証コードを送信"
                )}
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
                  className="text-center text-xl tracking-[0.3em] h-12 font-mono"
                />
              </div>
              <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    確認中...
                  </span>
                ) : (
                  "ログイン"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                メールアドレスを変更
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Demo Quick Login */}
      <div className="relative mt-8 w-full max-w-sm space-y-3">
        <p className="text-center text-xs text-muted-foreground">
          Demo Quick Login
        </p>
        <div className="grid grid-cols-3 gap-2">
          <a
            href="/api/auth/demo-login?role=store"
            className="flex flex-col items-center gap-1 rounded-lg border bg-white/80 p-3 text-center transition-colors hover:bg-primary/5"
          >
            <span className="text-lg">🏪</span>
            <span className="text-xs font-medium">Store</span>
          </a>
          <a
            href="/api/auth/demo-login?role=hr"
            className="flex flex-col items-center gap-1 rounded-lg border bg-white/80 p-3 text-center transition-colors hover:bg-primary/5"
          >
            <span className="text-lg">👔</span>
            <span className="text-xs font-medium">HR</span>
          </a>
          <a
            href="/api/auth/demo-login?role=admin"
            className="flex flex-col items-center gap-1 rounded-lg border bg-white/80 p-3 text-center transition-colors hover:bg-primary/5"
          >
            <span className="text-lg">⚙️</span>
            <span className="text-xs font-medium">Admin</span>
          </a>
        </div>
      </div>

      <p className="relative mt-6 text-center text-xs text-muted-foreground leading-relaxed">
        Dr.ストレッチ認定トレーナー<br />副業マッチングプラットフォーム
      </p>
    </div>
  );
}
