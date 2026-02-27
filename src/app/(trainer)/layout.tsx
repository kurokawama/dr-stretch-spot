import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/Header";
import { BottomNav } from "@/components/shared/BottomNav";

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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        displayName={profile.display_name || (isEmployee ? "スタッフ" : "トレーナー")}
        role={profile.role}
      />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="animate-fade-in-up">
          {children}
        </div>
      </main>
      <BottomNav mode={navMode} />
    </div>
  );
}
