import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/types/database";

const statusLabelMap: Record<ApplicationStatus, string> = {
  pending: "申請中",
  approved: "承認",
  rejected: "却下",
  cancelled: "キャンセル",
  completed: "完了",
  no_show: "無断欠勤",
};

const statusVariantMap: Record<
  ApplicationStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
  completed: "secondary",
  no_show: "destructive",
};

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

export function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  return <Badge variant={statusVariantMap[status]}>{statusLabelMap[status]}</Badge>;
}
