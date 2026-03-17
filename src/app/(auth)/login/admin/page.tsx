import { StaffLoginForm } from "@/components/shared/StaffLoginForm";

export default function AdminLoginPage() {
  return (
    <StaffLoginForm
      role="admin"
      title="システム管理"
      subtitle="管理者専用のログインページです"
      redirectTo="/admin"
      accentColor="amber-500"
      demoEmail="admin@test.com"
      demoPassword="test1234"
    />
  );
}
