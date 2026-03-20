import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | Dr.stretch SPOT",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-5 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">利用規約</h1>
        <p className="mt-2 text-sm text-muted-foreground">最終更新日: 2026年3月20日</p>

        <div className="mt-8 space-y-6 text-base leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold">第1条（サービスの概要）</h2>
            <p className="mt-2">
              Dr.stretch SPOT（以下「本サービス」）は、株式会社nobitelが運営する
              OBトレーナー向けシフトマッチングサービスです。
              退職済みトレーナーと店舗のシフトニーズを効率的にマッチングします。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">第2条（利用条件）</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>本サービスは、株式会社nobitelの元従業員（OBトレーナー）および現従業員が利用できます。</li>
              <li>利用には管理者による招待またはアカウント登録が必要です。</li>
              <li>利用者は正確な情報を提供し、登録情報を最新に保つ義務があります。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold">第3条（禁止事項）</h2>
            <ol className="mt-2 list-inside list-decimal space-y-1">
              <li>虚偽の勤務記録を登録する行為</li>
              <li>他のユーザーのアカウントを不正に使用する行為</li>
              <li>本サービスの不正アクセスやシステムに過度な負荷をかける行為</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold">第4条（免責事項）</h2>
            <p className="mt-2">
              本サービスは現状有姿で提供され、シフトマッチングの成立を保証するものではありません。
              サーバー障害等により一時的にサービスを停止する場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">第5条（準拠法・管轄）</h2>
            <p className="mt-2">
              本規約は日本法に準拠し、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
