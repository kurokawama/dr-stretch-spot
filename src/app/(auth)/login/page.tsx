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
import { Mail, Lock, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message?.includes("Invalid login credentials")) {
          toast.error("メールアドレスまたはパスワードが正しくありません。");
          return;
        }
        if (error.message?.includes("Email not confirmed")) {
          toast.error("メールアドレスが確認されていません。");
          return;
        }
        toast.error(error.message || "ログインに失敗しました。");
        return;
      }

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
            <LogIn className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="font-heading text-xl">
            ログイン
          </CardTitle>
          <CardDescription className="leading-relaxed">
            メールアドレスとパスワードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="example@drstretch.co.jp"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="h-11 pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="パスワードを入力"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 pl-10"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ログイン中...
                </span>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="relative mt-6 text-center text-xs text-muted-foreground leading-relaxed">
        Dr.ストレッチ認定トレーナー<br />副業マッチングプラットフォーム
      </p>
    </div>
  );
}
