import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/register");
  }

  switch (profile.role) {
    case "employee":
      redirect("/home");
    case "trainer":
      redirect("/home");
    case "store_manager":
      redirect("/store");
    case "hr":
      redirect("/hr/rates");
    case "admin":
      redirect("/hr/rates");
    case "area_manager":
      redirect("/hr");
    default:
      redirect("/login");
  }
}
