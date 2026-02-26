"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MagicLinkPage() {
  const [status, setStatus] = useState("ログイン処理中...");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setStatus("ログイン成功！リダイレクト中...");
        window.location.href = "/";
      }
    });

    // If no auth event fires within 5 seconds, show error
    const timeout = setTimeout(() => {
      setStatus("ログインに失敗しました。もう一度お試しください。");
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">{status}</p>
    </div>
  );
}
