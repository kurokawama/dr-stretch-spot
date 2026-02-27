import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/Header";
import Link from "next/link";
import {
  DollarSign,
  Calculator,
  FileText,
  LayoutDashboard,
  Users,
  ClipboardCheck,
} from "lucide-react";

export default async function HRLayout({
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
    !["hr", "admin", "area_manager"].includes(profile.role)
  ) {
    redirect("/login");
  }

  const navItems = [
    { href: "/hr", icon: LayoutDashboard, label: "ダッシュボード" },
    { href: "/hr/matchings", icon: Users, label: "マッチング管理" },
    { href: "/hr/attendance", icon: ClipboardCheck, label: "出勤管理" },
    { href: "/hr/rates", icon: DollarSign, label: "時給テーブル" },
    { href: "/hr/simulation", icon: Calculator, label: "シミュレーション" },
    { href: "/hr/audit-log", icon: FileText, label: "変更履歴" },
  ];

  const displayRole =
    profile.role === "area_manager" ? "エリアマネージャー" : "人事部";

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        displayName={profile.display_name || displayRole}
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
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
