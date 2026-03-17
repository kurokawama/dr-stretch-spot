import { StaffLoginForm } from "@/components/shared/StaffLoginForm";

export default function HRLoginPage() {
  return (
    <StaffLoginForm
      role="hr"
      title="人事管理"
      subtitle="人事部・エリアマネージャー専用のログインページです"
      redirectTo="/hr"
      accentColor="violet-500"
    />
  );
}
