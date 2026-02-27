"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  CalendarDays,
  Clock,
  Wallet,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

interface BottomNavProps {
  mode: "employee" | "registered" | "active";
}

const navConfigs: Record<BottomNavProps["mode"], NavItem[]> = {
  employee: [
    { href: "/home", icon: Home, label: "ホーム" },
    { href: "/profile", icon: User, label: "設定" },
  ],
  registered: [
    { href: "/home", icon: Home, label: "ホーム" },
    { href: "/spot-setup", icon: Search, label: "SPOT登録" },
    { href: "/profile", icon: User, label: "設定" },
  ],
  active: [
    { href: "/home", icon: Home, label: "ホーム" },
    { href: "/shifts", icon: Search, label: "シフト検索" },
    { href: "/my-shifts", icon: CalendarDays, label: "マイシフト" },
    { href: "/clock", icon: Clock, label: "打刻" },
    { href: "/earnings", icon: Wallet, label: "収入" },
  ],
};

export function BottomNav({ mode }: BottomNavProps) {
  const pathname = usePathname();
  const items = navConfigs[mode];

  const isActive = (href: string) => {
    if (href === "/home") return pathname === "/home" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-around py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1 transition-colors",
                active
                  ? "nav-item-active text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  active && "scale-110"
                )}
              />
              <span
                className={cn(
                  "text-[10px]",
                  active && "font-semibold"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
