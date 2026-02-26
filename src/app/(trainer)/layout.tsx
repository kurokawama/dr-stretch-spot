import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/Header";
import Link from "next/link";
import {
  Home,
  Search,
  CalendarDays,
  Clock,
  Wallet,
} from "lucide-react";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "trainer" && profile.role !== "admin")) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        displayName={profile.display_name || "トレーナー"}
        role={profile.role}
      />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white md:hidden">
        <div className="flex items-center justify-around py-2">
          <Link
            href="/"
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-primary"
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px]">ホーム</span>
          </Link>
          <Link
            href="/shifts"
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-primary"
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px]">シフト検索</span>
          </Link>
          <Link
            href="/my-shifts"
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-primary"
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-[10px]">マイシフト</span>
          </Link>
          <Link
            href="/clock"
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-primary"
          >
            <Clock className="h-5 w-5" />
            <span className="text-[10px]">打刻</span>
          </Link>
          <Link
            href="/earnings"
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-primary"
          >
            <Wallet className="h-5 w-5" />
            <span className="text-[10px]">収入</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
