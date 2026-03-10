import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";
import {
  Home,
  Search,
  CalendarDays,
  Clock,
  Wallet,
  User,
  Bell,
  Star,
  Calendar,
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

  if (
    !profile ||
    !["trainer", "admin", "employee"].includes(profile.role)
  ) {
    redirect("/login");
  }

  // Get spot_status for trainers
  let spotStatus: string | null = null;
  if (profile.role === "trainer") {
    const { data: trainer } = await supabase
      .from("alumni_trainers")
      .select("spot_status")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    spotStatus = trainer?.spot_status ?? null;
  }

  const isEmployee = profile.role === "employee";
  const isSpotActive = spotStatus === "active";

  // Determine nav mode
  const navMode = isEmployee
    ? ("employee" as const)
    : !isSpotActive
      ? ("registered" as const)
      : ("active" as const);

  const sidebarItems = isSpotActive
    ? [
        { href: "/home", icon: Home, label: "ホーム" },
        { href: "/shifts", icon: Search, label: "シフト検索" },
        { href: "/my-shifts", icon: CalendarDays, label: "マイシフト" },
        { href: "/clock", icon: Clock, label: "打刻" },
        { href: "/earnings", icon: Wallet, label: "収入" },
        { href: "/availability", icon: Calendar, label: "出勤可能日" },
        { href: "/evaluation-history", icon: Star, label: "評価履歴" },
        { href: "/notifications", icon: Bell, label: "通知" },
        { href: "/profile", icon: User, label: "設定" },
      ]
    : [
        { href: "/home", icon: Home, label: "ホーム" },
        { href: "/profile", icon: User, label: "設定" },
      ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        displayName={profile.display_name || (isEmployee ? "スタッフ" : "トレーナー")}
        role={profile.role}
      />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:block">
          <nav className="flex flex-col gap-1 p-3">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 pb-20 md:pb-0">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
      <BottomNav mode={navMode} />
    </div>
  );
}
