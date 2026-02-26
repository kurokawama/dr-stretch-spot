"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star } from "lucide-react";
import { createEvaluation } from "@/actions/evaluations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateJP, formatTimeJP, formatYen } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const evaluationSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  communication: z.coerce.number().int().min(1).max(5),
  technique: z.coerce.number().int().min(1).max(5),
  punctuality: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(300, "コメントは300文字以内で入力してください。"),
});

type EvaluationFormValues = z.infer<typeof evaluationSchema>;

interface EvaluationItem {
  applicationId: string;
  trainerName: string;
  confirmedRate: number;
  shiftTitle: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
}

interface EvaluationFormsProps {
  initialItems: EvaluationItem[];
}

function RatingStars({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const score = index + 1;
        return (
          <button
            key={score}
            type="button"
            className="rounded p-1"
            onClick={() => onChange(score)}
            aria-label={`${score} stars`}
          >
            <Star
              className={cn(
                "h-5 w-5",
                value >= score ? "fill-primary text-primary" : "text-muted-foreground"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function EvaluationCard({
  item,
  onSubmitted,
}: {
  item: EvaluationItem;
  onSubmitted: (applicationId: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<EvaluationFormValues>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      rating: 5,
      communication: 5,
      technique: 5,
      punctuality: 5,
      comment: "",
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createEvaluation({
        application_id: item.applicationId,
        rating: values.rating,
        categories: {
          communication: values.communication,
          technique: values.technique,
          punctuality: values.punctuality,
        },
        comment: values.comment.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? "評価の登録に失敗しました。");
        return;
      }

      toast.success("評価を登録しました。");
      onSubmitted(item.applicationId);
      router.refresh();
    });
  });

  return (
    <Card>
      <CardContent className="space-y-3 pt-4 text-sm">
        <div>
          <p className="font-medium">{item.trainerName}</p>
          <p className="text-muted-foreground">
            {item.shiftTitle} / {formatDateJP(item.shiftDate)} {formatTimeJP(item.startTime)} -{" "}
            {formatTimeJP(item.endTime)}
          </p>
          <p className="text-muted-foreground">確定時給: {formatYen(item.confirmedRate)}</p>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>総合評価</FormLabel>
                  <FormControl>
                    <RatingStars value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="communication"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>接客</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="technique"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>技術</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="punctuality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>時間厳守</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>コメント</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isPending}>
              {isPending ? "送信中..." : "評価を登録"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function EvaluationForms({ initialItems }: EvaluationFormsProps) {
  const [items, setItems] = useState<EvaluationItem[]>(initialItems);

  const handleSubmitted = (applicationId: string) => {
    setItems((prev) =>
      prev.filter((item) => item.applicationId !== applicationId)
    );
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          評価対象のシフトはありません。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <EvaluationCard
          key={item.applicationId}
          item={item}
          onSubmitted={handleSubmitted}
        />
      ))}
    </div>
  );
}
