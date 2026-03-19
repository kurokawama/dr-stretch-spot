import { redirect } from "next/navigation";
import { getStoreAvailabilities } from "@/actions/availability";
import { getStoreOffers } from "@/actions/offers";
import { createClient } from "@/lib/supabase/server";
import { StoreAvailabilityTable } from "./SendOfferDialog";

export default async function StoreAvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/store");
  }

  const { data: manager } = await supabase
    .from("store_managers")
    .select("id, store_id, store:stores(id, name)")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!manager?.store_id) {
    redirect("/login/store");
  }

  const [availabilitiesResult, offersResult] = await Promise.all([
    getStoreAvailabilities(manager.store_id),
    getStoreOffers(manager.store_id),
  ]);

  const availabilities =
    availabilitiesResult.success && availabilitiesResult.data
      ? availabilitiesResult.data
      : [];
  const offers =
    offersResult.success && offersResult.data ? offersResult.data : [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="font-heading text-2xl font-bold">シフト希望一覧</h1>
      <p className="text-sm text-muted-foreground">
        {availabilities.length}件の希望 / {offers.length}件オファー済
      </p>

      <StoreAvailabilityTable
        availabilities={availabilities}
        offers={offers}
        storeId={manager.store_id}
      />
    </div>
  );
}
