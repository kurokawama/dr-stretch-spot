"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  CalendarDays,
  Clock,
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
    { href: "/shifts", icon: Search, label: "シフト" },
    { href: "/my-shifts", icon: CalendarDays, label: "マイシフト" },
    { href: "/clock", icon: Clock, label: "打刻" },
    { href: "/profile", icon: User, label: "設定" },
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
    <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-sm md:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex min-h-[52px] min-w-[60px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 transition-all",
                active ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
                  active ? "bg-primary text-white shadow-sm" : "bg-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    active && "scale-105"
                  )}
                />
              </span>
              <span
                className={cn(
                  "text-xs leading-tight",
                  active ? "font-semibold text-primary" : "font-normal"
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
