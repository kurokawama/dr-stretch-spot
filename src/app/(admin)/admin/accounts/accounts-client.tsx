"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Shield,
  ShieldCheck,
  Building,
  Users,
  Pencil,
  Trash2,
  Info,
} from "lucide-react";
import {
  createStaffAccount,
  updateStaffRole,
  deleteStaffAccount,
  getStaffAccounts,
} from "@/actions/accounts";
import type { UserRole } from "@/types/database";

interface StaffAccount {
  id: string;
  email: string;
  role: UserRole;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
}

const ROLE_CONFIG: Record<
  string,
  { label: string; description: string; icon: typeof Shield; color: string }
> = {
  admin: {
    label: "システム管理者",
    description: "全ページ・全機能へのアクセス権限",
    icon: ShieldCheck,
    color: "bg-red-100 text-red-700",
  },
  hr: {
    label: "人事担当",
    description: "人事管理ページへのアクセス（シフト承認・時給設定・マッチング）",
    icon: Users,
    color: "bg-violet-100 text-violet-700",
  },
  area_manager: {
    label: "エリアマネージャー",
    description: "担当エリアの人事管理（エリア内の店舗・トレーナー管理）",
    icon: Shield,
    color: "bg-blue-100 text-blue-700",
  },
  store_manager: {
    label: "店舗マネージャー",
    description: "担当店舗のシフト・応募・勤怠管理",
    icon: Building,
    color: "bg-green-100 text-green-700",
  },
};

export function AccountsClient({
  initialAccounts,
  error,
}: {
  initialAccounts: StaffAccount[];
  error?: string;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffAccount | null>(null);
  const [loading, setLoading] = useState(false);

  // Create form state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("hr");

  // Edit form state
  const [editRole, setEditRole] = useState<UserRole>("hr");

  const refreshAccounts = async () => {
    const result = await getStaffAccounts();
    if (result.success && result.data) {
      setAccounts(result.data);
    }
  };

  const handleCreate = async () => {
    if (!newEmail || !newPassword || !newName || !newRole) {
      toast.error("全項目を入力してください");
      return;
    }
    setLoading(true);
    const result = await createStaffAccount({
      email: newEmail,
      password: newPassword,
      displayName: newName,
      role: newRole,
    });
    setLoading(false);

    if (result.success) {
      toast.success("アカウントを作成しました");
      setCreateOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("hr");
      await refreshAccounts();
    } else {
      toast.error(result.error || "作成に失敗しました");
    }
  };

  const handleUpdateRole = async () => {
    if (!editTarget) return;
    setLoading(true);
    const result = await updateStaffRole(editTarget.id, editRole);
    setLoading(false);

    if (result.success) {
      toast.success("権限を変更しました");
      setEditTarget(null);
      await refreshAccounts();
    } else {
      toast.error(result.error || "変更に失敗しました");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    const result = await deleteStaffAccount(deleteTarget.id);
    setLoading(false);

    if (result.success) {
      toast.success("アカウントを無効化しました");
      setDeleteTarget(null);
      await refreshAccounts();
    } else {
      toast.error(result.error || "削除に失敗しました");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Permission level overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(ROLE_CONFIG).map(([role, config]) => {
          const count = accounts.filter((a) => a.role === role).length;
          const Icon = config.icon;
          return (
            <Card key={role} className="border">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-md p-1.5 ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm font-medium">
                      {config.label}
                    </CardTitle>
                  </div>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <CardDescription className="text-xs">
                  {config.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Account list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">スタッフアカウント一覧</CardTitle>
            <CardDescription>
              {accounts.length}件のスタッフアカウント
            </CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                新規作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>スタッフアカウント作成</DialogTitle>
                <DialogDescription>
                  新しいスタッフアカウントを作成し、権限を割り当てます
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="create-name">表示名</Label>
                  <Input
                    id="create-name"
                    placeholder="山田太郎"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-email">メールアドレス</Label>
                  <Input
                    id="create-email"
                    type="email"
                    placeholder="yamada@drstretch.co.jp"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-password">パスワード</Label>
                  <Input
                    id="create-password"
                    type="password"
                    placeholder="6文字以上"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>権限レベル</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newRole && ROLE_CONFIG[newRole] && (
                    <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{ROLE_CONFIG[newRole].description}</span>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? "作成中..." : "作成"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>メール</TableHead>
                <TableHead>権限</TableHead>
                <TableHead>最終ログイン</TableHead>
                <TableHead>作成日</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    スタッフアカウントがありません
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => {
                  const roleConfig = ROLE_CONFIG[account.role];
                  return (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.display_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {account.email}
                      </TableCell>
                      <TableCell>
                        {roleConfig ? (
                          <Badge variant="secondary" className={roleConfig.color}>
                            {roleConfig.label}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{account.role}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(account.last_sign_in_at)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(account.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditTarget(account);
                              setEditRole(account.role);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(account)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>権限変更</DialogTitle>
            <DialogDescription>
              {editTarget?.display_name}（{editTarget?.email}）の権限を変更します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>新しい権限レベル</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editRole && ROLE_CONFIG[editRole] && (
                <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{ROLE_CONFIG[editRole].description}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              キャンセル
            </Button>
            <Button onClick={handleUpdateRole} disabled={loading}>
              {loading ? "変更中..." : "権限を変更"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アカウント無効化</DialogTitle>
            <DialogDescription>
              {deleteTarget?.display_name}（{deleteTarget?.email}）のアカウントを無効化しますか？
              この操作により、スタッフ権限が削除されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "処理中..." : "無効化"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
