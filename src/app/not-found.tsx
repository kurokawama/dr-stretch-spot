import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold">ページが見つかりません</h2>
      <p className="text-muted-foreground text-sm">
        お探しのページは存在しないか、移動した可能性があります。
      </p>
      <Button asChild variant="outline">
        <Link href="/">ホームに戻る</Link>
      </Button>
    </div>
  );
}
