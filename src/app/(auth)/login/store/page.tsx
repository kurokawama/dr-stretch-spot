import { StaffLoginForm } from "@/components/shared/StaffLoginForm";

export default function StoreLoginPage() {
  return (
    <StaffLoginForm
      role="store"
      title="店舗管理"
      subtitle="店舗マネージャー専用のログインページです"
      redirectTo="/store"
      accentColor="blue-500"
    />
  );
}
