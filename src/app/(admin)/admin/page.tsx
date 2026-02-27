import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  TrendingUp,
  CalendarCheck,
  DollarSign,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { getAdminKPIs } from "@/actions/admin";

export default async function AdminDashboardPage() {
  const result = await getAdminKPIs();

  if (!result.success || !result.data) {
    return (
      <div className="p-6">
        <p className="text-destructive">
          Failed to load dashboard data
        </p>
      </div>
    );
  }

  const kpis = result.data;

  const blankStatusLabels: Record<string, { label: string; color: string }> = {
    ok: { label: "正常", color: "bg-green-100 text-green-800" },
    alert_60: { label: "60日アラート", color: "bg-amber-100 text-amber-800" },
    skill_check_required: {
      label: "スキルチェック要",
      color: "bg-orange-100 text-orange-800",
    },
    training_required: {
      label: "研修要",
      color: "bg-red-100 text-red-800",
    },
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">本部ダッシュボード</h1>
        <p className="text-sm text-muted-foreground mt-1">
          全店舗のKPI・コスト・トレーナー状況を一覧で確認
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              登録トレーナー
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.total_trainers}</div>
            <p className="text-xs text-muted-foreground">
              アクティブ: {kpis.active_trainers}名 ({kpis.active_rate}%)
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              月間シフト充足率
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.monthly_fill_rate}%</div>
            <p className="text-xs text-muted-foreground">
              シフト数: {kpis.monthly_shifts}件
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              月間コスト
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{kpis.monthly_cost.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">今月の人件費合計</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              予算アラート
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis.budget_alerts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              80%超過店舗
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Blank Status Distribution */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            ブランクステータス分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(kpis.blank_distribution).map(
              ([status, count]) => {
                const config =
                  blankStatusLabels[status] || blankStatusLabels.ok;
                return (
                  <div
                    key={status}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50"
                  >
                    <Badge className={config.color}>{config.label}</Badge>
                    <span className="text-3xl font-bold">{count}</span>
                    <span className="text-xs text-muted-foreground">名</span>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget Alerts */}
      {kpis.budget_alerts.length > 0 && (
        <Card className="border-0 shadow-md border-l-4 border-l-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              緊急予算アラート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kpis.budget_alerts.map((alert) => (
                <div
                  key={alert.store_id}
                  className="flex items-center justify-between p-3 rounded-lg bg-destructive/5"
                >
                  <div>
                    <p className="font-medium">{alert.store_name}</p>
                    <p className="text-sm text-muted-foreground">
                      ¥{alert.used.toLocaleString()} / ¥
                      {alert.budget.toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      alert.usage_rate >= 100 ? "destructive" : "secondary"
                    }
                  >
                    {alert.usage_rate}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm card-interactive">
          <CardContent className="p-4">
            <a href="/admin/trainers" className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">トレーナー管理</p>
                <p className="text-xs text-muted-foreground">
                  全トレーナーの状況を管理
                </p>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm card-interactive">
          <CardContent className="p-4">
            <a href="/admin/costs" className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">コスト管理</p>
                <p className="text-xs text-muted-foreground">
                  予算・コスト状況を確認
                </p>
              </div>
            </a>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm card-interactive">
          <CardContent className="p-4">
            <a href="/admin/skill-checks" className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50">
                <CalendarCheck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">技術チェック</p>
                <p className="text-xs text-muted-foreground">
                  スキルチェック・研修を管理
                </p>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
