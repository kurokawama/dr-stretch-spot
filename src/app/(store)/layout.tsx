import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/Header";
import Link from "next/link";
import {
  LayoutDashboard,
  CalendarPlus,
  Users,
  ClipboardCheck,
  Star,
  Copy,
  BarChart3,
  Bell,
} from "lucide-react";

export default async function StoreLayout({
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
    (profile.role !== "store_manager" && profile.role !== "admin")
  ) {
    redirect("/login");
  }

  const navItems = [
    { href: "/store", icon: LayoutDashboard, label: "ダッシュボード" },
    { href: "/store/shifts", icon: CalendarPlus, label: "シフト募集" },
    { href: "/store/applications", icon: Users, label: "応募者" },
    { href: "/store/attendance", icon: ClipboardCheck, label: "出勤管理" },
    { href: "/store/evaluations", icon: Star, label: "評価" },
    { href: "/store/templates", icon: Copy, label: "テンプレート" },
    { href: "/store/usage", icon: BarChart3, label: "利用実績" },
    { href: "/store/notifications", icon: Bell, label: "通知" },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        displayName={profile.display_name || "店舗管理者"}
        role={profile.role}
      />
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:block">
          <nav className="flex flex-col gap-1 p-3">
            {navItems.map((item) => (
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
          <div className="animate-fade-in-up">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-sm md:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-2 py-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
