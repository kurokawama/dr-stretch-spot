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

interface HeaderProps {
  displayName: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  trainer: "トレーナー",
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
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/icon.svg"
            alt="Dr.stretch SPOT"
            width={32}
            height={32}
          />
          <span className="font-heading text-lg font-bold text-primary">
            Dr.stretch
          </span>
          <span className="font-heading text-lg font-extrabold text-[oklch(0.87_0.18_110)]">
            SPOT
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground md:inline">
            {roleLabels[role] || role}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {roleLabels[role] || role}
                </p>
              </div>
              <DropdownMenuSeparator />
              {role === "trainer" && (
                <DropdownMenuItem asChild>
                  <Link href="/profile">プロフィール</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
