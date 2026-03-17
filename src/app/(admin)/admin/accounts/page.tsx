import { getStaffAccounts } from "@/actions/accounts";
import { AccountsClient } from "./accounts-client";

export default async function AccountsPage() {
  const result = await getStaffAccounts();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">アカウント管理</h1>
        <p className="text-sm text-muted-foreground mt-1">
          スタッフアカウントの作成・権限管理
        </p>
      </div>
      <AccountsClient
        initialAccounts={result.success ? result.data ?? [] : []}
        error={result.error}
      />
    </div>
  );
}
