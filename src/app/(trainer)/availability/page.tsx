import { redirect } from "next/navigation";
import { getMyAvailabilities } from "@/actions/availability";
import { getTrainerOffers } from "@/actions/offers";
import { createClient } from "@/lib/supabase/server";
import {
  AvailabilityForm,
  AvailabilityListSection,
  TrainerOffersSection,
} from "./AvailabilityForm";

interface StoreOption {
  id: string;
  name: string;
  area: string;
}

export default async function TrainerAvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: trainer } = await supabase
    .from("alumni_trainers")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!trainer) {
    redirect("/login");
  }

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, area")
    .eq("status", "active")
    .order("area", { ascending: true })
    .order("name", { ascending: true });

  const [availabilitiesResult, offersResult] = await Promise.all([
    getMyAvailabilities(),
    getTrainerOffers(),
  ]);

  const availabilities =
    availabilitiesResult.success && availabilitiesResult.data
      ? availabilitiesResult.data
      : [];
  const offers =
    offersResult.success && offersResult.data ? offersResult.data : [];
  const storeOptions: StoreOption[] = (stores ?? []).map((store) => ({
    id: store.id,
    name: store.name,
    area: store.area,
  }));

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-lg mx-auto">
      <h1 className="font-heading text-2xl font-bold">シフト希望</h1>

      <AvailabilityForm stores={storeOptions} />

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold">受信オファー</h2>
        <TrainerOffersSection offers={offers} />
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl font-bold">申告一覧</h2>
        <AvailabilityListSection availabilities={availabilities} />
      </section>
    </div>
  );
}
