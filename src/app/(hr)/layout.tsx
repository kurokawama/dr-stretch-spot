import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/Header";
import Link from "next/link";
import {
  DollarSign,
  Calculator,
  FileText,
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

  if (!profile || (profile.role !== "hr" && profile.role !== "admin")) {
    redirect("/login");
  }

  const navItems = [
    { href: "/hr/rates", icon: DollarSign, label: "時給テーブル" },
    { href: "/hr/simulation", icon: Calculator, label: "シミュレーション" },
    { href: "/hr/audit-log", icon: FileText, label: "変更履歴" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        displayName={profile.display_name || "人事部"}
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
