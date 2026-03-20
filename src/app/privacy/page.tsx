import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Dr.stretch SPOT",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">プライバシーポリシー</h1>
        <p className="mt-2 text-sm text-muted-foreground">最終更新日: 2026年3月20日</p>

        <div className="mt-8 space-y-6 text-base leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">1. はじめに</h2>
            <p className="mt-2">
              Dr.stretch SPOT（以下「本サービス」）は、株式会社nobitel（以下「当社」）が運営する
              OBトレーナー向けシフトマッチングサービスです。
              本プライバシーポリシーは、本サービスにおける個人情報の取り扱いについて定めます。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. 収集する情報</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>氏名・メールアドレス（アカウント登録時）</li>
              <li>勤務履歴・資格情報（トレーナープロフィール）</li>
              <li>シフト応募・出退勤記録</li>
              <li>LINE連携情報（任意）</li>
              <li>銀行口座情報（報酬支払い用）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. 情報の利用目的</h2>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>シフトマッチングサービスの提供・運営</li>
              <li>出退勤管理・報酬計算</li>
              <li>LINE通知の送信（連携済みの場合）</li>
              <li>サービス改善のための統計分析（匿名化処理後）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. 情報の管理</h2>
            <p className="mt-2">
              データはSupabase上に暗号化された状態で保存され、
              Row Level Security（RLS）により適切なアクセス制御を行っています。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. お問い合わせ</h2>
            <p className="mt-2">
              個人情報の取り扱いに関するお問い合わせは、所属店舗の管理者または人事部までご連絡ください。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
