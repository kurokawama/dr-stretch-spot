import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/Header";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Building,
  DollarSign,
  ClipboardCheck,
} from "lucide-react";

export default async function AdminLayout({
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

  if (!profile || profile.role !== "admin") {
    redirect("/login");
  }

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "ダッシュボード" },
    { href: "/admin/trainers", icon: Users, label: "トレーナー管理" },
    { href: "/admin/stores", icon: Building, label: "店舗管理" },
    { href: "/admin/costs", icon: DollarSign, label: "コスト管理" },
    {
      href: "/admin/skill-checks",
      icon: ClipboardCheck,
      label: "技術チェック管理",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        displayName={profile.display_name || "本部管理"}
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

        <main className="flex-1">
          <div className="animate-fade-in-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
