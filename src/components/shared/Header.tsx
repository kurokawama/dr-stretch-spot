"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, UserCircle, ArrowLeftRight } from "lucide-react";

interface HeaderProps {
  displayName: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  trainer: "トレーナー",
  employee: "スタッフ",
  store_manager: "店舗管理者",
  hr: "人事部",
  admin: "管理者",
};

export function Header({ displayName, role }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/images/icon.svg"
            alt="Dr.stretch SPOT"
            width={28}
            height={28}
            className="transition-transform group-hover:scale-105"
          />
          <span className="font-heading text-lg font-bold text-primary">
            Dr.stretch
          </span>
          <span className="font-heading text-lg font-extrabold text-[oklch(0.87_0.18_110)]">
            SPOT
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground md:inline rounded-full bg-muted px-2.5 py-0.5">
            {roleLabels[role] || role}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2">
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {roleLabels[role] || role}
                </p>
              </div>
              <DropdownMenuSeparator />
              {role === "trainer" && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    プロフィール
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/login" className="flex items-center gap-2" onClick={async (e) => {
                  e.preventDefault();
                  await supabase.auth.signOut();
                  router.push("/login");
                  router.refresh();
                }}>
                  <ArrowLeftRight className="h-4 w-4" />
                  アカウント切替
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
